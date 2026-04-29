import { promises as fs } from 'node:fs';

import * as core from '@actions/core';
import * as github from '@actions/github';

import { generateMappingReadme } from './ai';
import { getMappingIntent } from './config';
import { detectEvent, resolveDelivery } from './event';
import {
	commitAndPush,
	commitToBranch,
	getChangedFilesForMergedPr,
	listAllRepoFiles,
	type MappingPreview,
	postOrUpdateMappingComment,
	renderPreviewBody,
} from './git';
import { logger, resolveCandidatesByFrontmatter, resolveMappingTargets, runFormatter } from './lib';
import { readReadmeIfExists, writeReadmeAt } from './readme';
import { AiRequestContext, DocloopEvent, MappingIntent } from './types';

interface MappingOutput {
	targetPath: string;
	captures: Record<string, string>;
	existing: string | undefined;
	proposed: string;
}

interface MappingSkip {
	targetPath: string;
	reason: string;
}

interface MappingResults {
	outputs: MappingOutput[];
	skips: MappingSkip[];
}

async function run(): Promise<void> {
	try {
		const token = core.getInput('github_token');
		if (!token) {
			throw new Error(
				'No GitHub token available. The github_token input defaults to ${{ github.token }}; make sure the calling job grants contents: write (and pull-requests: write when delivery is pr, pr_comment, or pr_branch_commit).',
			);
		}

		const intent = getMappingIntent();
		logger.info(`DocLoop running mapping "${intent.name}"`);

		const event = detectEvent(github.context);
		if (event === null) {
			logger.info(`Event "${github.context.eventName}" (action="${String(github.context.payload.action ?? '')}") is not handled by docloop. Skipping.`);
			return;
		}

		const delivery = resolveDelivery(intent.delivery, event, github.context);
		logger.info(`event=${event}, delivery=${delivery}`);

		const changedFiles = await listCandidateFiles(event, token);
		if (changedFiles.length === 0) {
			logger.info('No candidate files; nothing to do.');
			return;
		}

		const targets = await resolveTargets(intent, event, changedFiles);
		if (targets.length === 0) {
			logger.info(`No targets matched for mapping "${intent.name}"`);
			if (delivery === 'pr_comment') {
				await deliverPreviewComment(intent.name, [], [], token);
			}
			return;
		}
		logger.info(`mapping "${intent.name}": ${targets.length} target(s)`);

		const userPrompt = await loadPromptFile(intent.promptFile);
		const results = await runMapping(intent, targets, userPrompt, github.context.payload.pull_request);

		if (delivery === 'pr_comment') {
			await deliverPreviewComment(intent.name, results.outputs, results.skips, token);
			return;
		}

		if (results.outputs.length === 0) {
			logger.info('No README files were generated or updated');
			return;
		}

		const updatedFiles = await writeOutputs(results.outputs, intent.formatCommand);

		if (delivery === 'pr_branch_commit') {
			const pr = github.context.payload.pull_request;
			const headRef = pr?.head?.ref;
			if (!headRef) {
				throw new Error('Could not determine PR head ref for pr_branch_commit delivery');
			}
			await commitToBranch(updatedFiles, intent.commitMessage, headRef);
			return;
		}

		const createPr = delivery === 'pr';
		const baseBranchOverride = event === 'workflow_dispatch' ? resolveWorkflowDispatchBase() : undefined;
		const sourcePrAuthor = github.context.payload.pull_request?.user?.login;
		const requestReviewFromUser =
			createPr && intent.requestReviewFromPrAuthor && typeof sourcePrAuthor === 'string' && sourcePrAuthor.length > 0 ? sourcePrAuthor : undefined;
		await commitAndPush(updatedFiles, intent.commitMessage, createPr, github.context, token, {
			baseBranchOverride,
			prTitle: intent.prTitle,
			requestReviewFromUser,
		});
	} catch (error) {
		logger.setFailed(error instanceof Error ? error : String(error));
		throw error;
	}
}

async function resolveTargets(intent: MappingIntent, event: DocloopEvent, changedFiles: string[]): Promise<ReturnType<typeof resolveMappingTargets>> {
	if (intent.readmeCandidates === undefined) {
		return resolveMappingTargets(intent, changedFiles);
	}
	// `readmeCandidates` mode needs the full repo file list to expand the
	// candidates glob. On workflow_dispatch we already enumerated all files;
	// on PR events we only have the PR diff, so we list the repo separately.
	const allRepoFiles = event === 'workflow_dispatch' ? changedFiles : await listAllRepoFiles();
	return resolveCandidatesByFrontmatter({
		intent,
		candidatesGlob: intent.readmeCandidates,
		allRepoFiles,
		changedFiles,
	});
}

async function listCandidateFiles(event: DocloopEvent, token: string): Promise<string[]> {
	if (event === 'workflow_dispatch') {
		const files = await listAllRepoFiles();
		logger.info(`Considering ${files.length} repo file(s) for workflow_dispatch`);
		return files;
	}
	const files = await getChangedFilesForMergedPr(github.context, token);
	logger.info(`Found ${files.length} changed file(s) in PR`);
	return files;
}

function resolveWorkflowDispatchBase(): string | undefined {
	return github.context.ref?.replace(/^refs\/heads\//, '') || undefined;
}

async function loadPromptFile(filePath: string | undefined): Promise<string | undefined> {
	if (filePath === undefined) return undefined;
	try {
		return await fs.readFile(filePath, 'utf-8');
	} catch (error) {
		throw new Error(`Failed to read prompt_file "${filePath}"`, { cause: error });
	}
}

async function runMapping(
	intent: MappingIntent,
	targets: ReturnType<typeof resolveMappingTargets>,
	userPrompt: string | undefined,
	pr: typeof github.context.payload.pull_request | undefined,
): Promise<MappingResults> {
	const outputs: MappingOutput[] = [];
	const skips: MappingSkip[] = [];

	for (const target of targets) {
		// Sequential: each iteration touches the filesystem and OpenAI; small
		// plans throttle on parallel calls.
		// eslint-disable-next-line no-await-in-loop
		const existing = await readReadmeIfExists(target.targetPath);

		if (existing === undefined && intent.onMissingReadme === 'skip') {
			logger.info(`Skipping ${target.targetPath}: target missing and on_missing_readme=skip`);
			skips.push({ targetPath: target.targetPath, reason: 'target missing and on_missing_readme=skip' });
			continue;
		}

		const featureName = target.captures.FEATURE_NAME ?? Object.values(target.captures)[0] ?? intent.name;

		const ctx: AiRequestContext = {
			featureName,
			detailLevel: intent.detailLevel,
			prTitle: typeof pr?.title === 'string' ? pr.title : undefined,
			prBody: typeof pr?.body === 'string' ? pr.body : undefined,
			changedFiles: target.changedFiles,
			existingReadme: existing,
		};

		try {
			// eslint-disable-next-line no-await-in-loop
			const result = await generateMappingReadme(
				ctx,
				{ openaiApiKey: intent.openaiApiKey, openaiModel: intent.openaiModel },
				{ format: intent.format, userPrompt },
			);
			if (result.kind === 'skip') {
				logger.info(`Skipping ${target.targetPath}: ${result.reason}`);
				skips.push({ targetPath: target.targetPath, reason: result.reason });
				continue;
			}
			outputs.push({
				targetPath: target.targetPath,
				captures: target.captures,
				existing,
				proposed: result.content,
			});
		} catch (error) {
			logger.error(`Failed to generate README for ${target.targetPath}: ${error}`);
		}
	}

	return { outputs, skips };
}

async function writeOutputs(outputs: MappingOutput[], formatCommand: string | undefined): Promise<string[]> {
	const updatedFiles: string[] = [];
	for (const output of outputs) {
		// Filesystem writes serialize to avoid mkdir races on shared parent dirs;
		// the per-file format invocation that follows is also sequential to keep
		// the formatter's own lockfile / cache happy.
		// eslint-disable-next-line no-await-in-loop
		const filePath = await writeReadmeAt(output.targetPath, output.proposed);
		// eslint-disable-next-line no-await-in-loop
		await runFormatter(filePath, formatCommand);
		updatedFiles.push(filePath);
	}
	return updatedFiles;
}

async function deliverPreviewComment(mappingName: string, outputs: MappingOutput[], skips: MappingSkip[], token: string): Promise<void> {
	const pr = github.context.payload.pull_request;
	if (!pr) {
		throw new Error('pr_comment delivery requested but no pull_request in context');
	}
	const previews: MappingPreview[] = [
		...outputs.map(
			(o): MappingPreview => ({
				targetPath: o.targetPath,
				existing: o.existing,
				proposed: o.proposed,
				skip: false,
			}),
		),
		...skips.map(
			(s): MappingPreview => ({
				targetPath: s.targetPath,
				existing: undefined,
				proposed: '',
				skip: true,
				skipReason: s.reason,
			}),
		),
	];
	const body = renderPreviewBody(mappingName, previews);
	await postOrUpdateMappingComment(mappingName, pr.number, body, github.context, token);
}

run();
