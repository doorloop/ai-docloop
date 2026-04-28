import { promises as fs } from 'node:fs';

import * as core from '@actions/core';
import * as github from '@actions/github';

import { generateMappingReadme, generateReadme } from './ai';
import { getConfig, tryGetDocloopConfig } from './config';
import {
	commitAndPush,
	commitToBranch,
	getChangedFilesForMergedPr,
	listAllRepoFiles,
	type MappingPreview,
	postOrUpdateMappingComment,
	renderPreviewBody,
} from './git';
import { buildPathScopeConfigs, logger, mapFilesToDocRoots, matchesGlob, resolveMappingTargets } from './lib';
import { buildDocRoots, readReadmeIfExists, writeReadme, writeReadmeAt } from './readme';
import { AiRequestContext, DocloopConfig, MappingConfig } from './types';

interface MappingOutput {
	mappingName: string;
	targetPath: string;
	captures: Record<string, string>;
	existing: string | undefined;
	proposed: string;
}

interface MappingSkip {
	mappingName: string;
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
				'No GitHub token available. The github_token input defaults to ${{ github.token }}; make sure the calling job grants contents: write (and pull-requests: write when create_pr is true).',
			);
		}

		const docloopCfg = await tryGetDocloopConfig();
		if (docloopCfg !== null) {
			await runDocloop(docloopCfg, token);
		} else {
			await runLegacy(token);
		}

		logger.info('Action completed successfully');
	} catch (error) {
		logger.setFailed(error instanceof Error ? error : String(error));
		throw error;
	}
}

async function runLegacy(token: string): Promise<void> {
	if (github.context.payload.action !== 'closed') {
		logger.info('PR is not closed, skipping');
		return;
	}

	const pr = github.context.payload.pull_request;
	if (!pr) {
		logger.info('No pull request in context, skipping');
		return;
	}

	if (!pr.merged) {
		logger.info('PR was not merged, skipping');
		return;
	}

	logger.info(`Processing merged PR #${pr.number}: ${pr.title}`);

	const config = await getConfig();

	const baseBranch = pr.base?.ref;
	if (!baseBranch) {
		throw new Error('Could not determine base branch from PR');
	}

	const baseBranchMatches = config.baseBranches.some((pattern) => matchesGlob(baseBranch, pattern));

	if (!baseBranchMatches) {
		logger.info(`Base branch "${baseBranch}" does not match any configured base branches: ${config.baseBranches.join(', ')}`);
		return;
	}

	logger.info(`Base branch "${baseBranch}" matches configured branches`);

	const changedFiles = await getChangedFilesForMergedPr(github.context, token);

	if (changedFiles.length === 0) {
		logger.info('No changed files found in PR');
		return;
	}

	logger.info(`Found ${changedFiles.length} changed file(s)`);

	const pathScopeConfigs = buildPathScopeConfigs(config.pathScopes);
	logger.debug(`Built ${pathScopeConfigs.length} path scope config(s)`);

	const docRootMap = mapFilesToDocRoots(changedFiles, pathScopeConfigs, config.docRootDepthFromScope);

	if (docRootMap.size === 0) {
		logger.info('No changed files match the configured path scopes');
		return;
	}

	logger.info(`Mapped files to ${docRootMap.size} doc root(s)`);

	const docRoots = await buildDocRoots(docRootMap, config.readmeFilename);

	const updatedFiles: string[] = [];

	for (const docRoot of docRoots) {
		logger.info(`Processing doc root: ${docRoot.folderPath}`);

		try {
			const aiContext: AiRequestContext = {
				featureName: docRoot.featureName,
				detailLevel: config.detailLevel,
				prTitle: pr.title || undefined,
				prBody: pr.body || undefined,
				changedFiles: docRoot.changedFiles,
				existingReadme: config.updateMode === 'update' ? docRoot.existingReadme : undefined,
				updateMode: config.updateMode,
			};

			// Sequential awaits per doc root are intentional: each generateReadme
			// call hits the OpenAI API, and parallelizing across many doc roots
			// would risk tripping rate limits on smaller plans.
			// eslint-disable-next-line no-await-in-loop
			const readmeContent = await generateReadme(aiContext, config);

			// eslint-disable-next-line no-await-in-loop
			const filePath = await writeReadme(docRoot.folderPath, config.readmeFilename, readmeContent);

			updatedFiles.push(filePath);
		} catch (error) {
			logger.error(`Failed to generate README for ${docRoot.folderPath}: ${error}`);
		}
	}

	if (updatedFiles.length === 0) {
		logger.info('No README files were generated or updated');
		return;
	}

	logger.info(`Generated/updated ${updatedFiles.length} README file(s)`);

	await commitAndPush(updatedFiles, config.commitMessage, config.createPr, github.context, token);
}

async function runDocloop(cfg: DocloopConfig, token: string): Promise<void> {
	const eventName = github.context.eventName;
	const action = github.context.payload.action;

	if (eventName === 'pull_request') {
		if (action === 'closed') {
			await runPrMerged(cfg, token);
			return;
		}
		if (action === 'opened' || action === 'synchronize' || action === 'reopened') {
			await runPrOpened(cfg, token);
			return;
		}
		logger.info(`Pull request action "${action ?? 'none'}" is not handled by docloop. Skipping.`);
		return;
	}

	if (eventName === 'workflow_dispatch') {
		await runWorkflowDispatch(cfg, token);
		return;
	}

	logger.info(`Event "${eventName}" is not handled by docloop. Skipping.`);
}

async function runPrMerged(cfg: DocloopConfig, token: string): Promise<void> {
	const trigger = cfg.triggers.prMerged;
	if (!trigger || !trigger.enabled) {
		logger.info('pr_merged trigger is not enabled in .docloop.yml, skipping');
		return;
	}

	const pr = github.context.payload.pull_request;
	if (!pr) {
		logger.info('No pull request in context, skipping');
		return;
	}
	if (!pr.merged) {
		logger.info('PR was not merged, skipping');
		return;
	}

	const baseBranch = pr.base?.ref;
	if (!baseBranch) {
		throw new Error('Could not determine base branch from PR');
	}

	if (!triggerBaseBranchMatches(trigger.baseBranches, baseBranch)) {
		logger.info(`Base branch "${baseBranch}" does not match pr_merged base_branches: ${trigger.baseBranches.join(', ')}`);
		return;
	}

	logger.info(`Processing merged PR #${pr.number}: ${pr.title}`);

	const changedFiles = await getChangedFilesForMergedPr(github.context, token);
	if (changedFiles.length === 0) {
		logger.info('No changed files found in PR');
		return;
	}

	const results = await runMappings(cfg, changedFiles, pr);
	if (results.outputs.length === 0) {
		logger.info('No README files were generated or updated');
		return;
	}

	const updatedFiles = await writeMappingOutputs(results.outputs);
	const createPr = trigger.delivery === 'pr';
	await commitAndPush(updatedFiles, trigger.commitMessage, createPr, github.context, token);
}

async function runPrOpened(cfg: DocloopConfig, token: string): Promise<void> {
	const trigger = cfg.triggers.prOpened;
	if (!trigger || !trigger.enabled) {
		logger.info('pr_opened trigger is not enabled in .docloop.yml, skipping');
		return;
	}

	const pr = github.context.payload.pull_request;
	if (!pr) {
		logger.info('No pull request in context, skipping');
		return;
	}

	const baseBranch = pr.base?.ref;
	if (!baseBranch) {
		throw new Error('Could not determine base branch from PR');
	}

	if (!triggerBaseBranchMatches(trigger.baseBranches, baseBranch)) {
		logger.info(`Base branch "${baseBranch}" does not match pr_opened base_branches: ${trigger.baseBranches.join(', ')}`);
		return;
	}

	logger.info(`Processing PR #${pr.number} (${github.context.payload.action}): ${pr.title}`);

	const changedFiles = await getChangedFilesForMergedPr(github.context, token);
	if (changedFiles.length === 0) {
		logger.info('No changed files found in PR');
		return;
	}

	const results = await runMappings(cfg, changedFiles, pr);

	let delivery = trigger.delivery;
	const isFork = pr.head?.repo?.fork === true;
	if (delivery === 'pr_branch_commit' && isFork) {
		logger.warning(`PR #${pr.number} is from a fork; cannot push to head ref. Falling back to pr_comment delivery.`);
		delivery = 'pr_comment';
	}

	if (delivery === 'pr_comment') {
		await deliverPreviewComment(results, pr.number, token);
		return;
	}

	if (results.outputs.length === 0) {
		logger.info('No README files were generated or updated');
		return;
	}

	const updatedFiles = await writeMappingOutputs(results.outputs);
	const headRef = pr.head?.ref;
	if (!headRef) {
		throw new Error('Could not determine PR head ref for pr_branch_commit delivery');
	}
	await commitToBranch(updatedFiles, trigger.commitMessage, headRef);
}

async function runWorkflowDispatch(cfg: DocloopConfig, token: string): Promise<void> {
	const trigger = cfg.triggers.workflowDispatch;
	if (!trigger || !trigger.enabled) {
		logger.info('workflow_dispatch trigger is not enabled in .docloop.yml, skipping');
		return;
	}

	logger.info(`Processing workflow_dispatch against base branch "${trigger.baseBranch}"`);

	const allFiles = await listAllRepoFiles();
	logger.info(`Considering ${allFiles.length} repo file(s) for workflow_dispatch`);

	const results = await runMappings(cfg, allFiles, undefined);
	if (results.outputs.length === 0) {
		logger.info('No README files were generated or updated');
		return;
	}

	const updatedFiles = await writeMappingOutputs(results.outputs);
	const createPr = trigger.delivery === 'pr';
	await commitAndPush(updatedFiles, 'docs: update READMEs via workflow_dispatch [skip ci]', createPr, github.context, token, {
		baseBranchOverride: trigger.baseBranch,
	});
}

function triggerBaseBranchMatches(patterns: string[], baseBranch: string): boolean {
	if (patterns.length === 0) return true;
	return patterns.some((pattern) => matchesGlob(baseBranch, pattern));
}

async function runMappings(cfg: DocloopConfig, candidateFiles: string[], pr: typeof github.context.payload.pull_request | undefined): Promise<MappingResults> {
	const openaiApiKey = core.getInput('openai_api_key', { required: true });
	const promptCache = new Map<string, string>();

	const outputs: MappingOutput[] = [];
	const skips: MappingSkip[] = [];

	for (const mapping of cfg.mappings) {
		// eslint-disable-next-line no-await-in-loop
		const mappingResult = await runOneMapping(mapping, cfg, candidateFiles, openaiApiKey, pr, promptCache);
		outputs.push(...mappingResult.outputs);
		skips.push(...mappingResult.skips);
	}

	return { outputs, skips };
}

async function loadPromptFile(filePath: string, cache: Map<string, string>): Promise<string> {
	const cached = cache.get(filePath);
	if (cached !== undefined) return cached;
	const content = await fs.readFile(filePath, 'utf-8');
	cache.set(filePath, content);
	return content;
}

async function runOneMapping(
	mapping: MappingConfig,
	cfg: DocloopConfig,
	candidateFiles: string[],
	openaiApiKey: string,
	pr: typeof github.context.payload.pull_request | undefined,
	promptCache: Map<string, string>,
): Promise<MappingResults> {
	const targets = resolveMappingTargets(mapping, candidateFiles, cfg.defaults.exclude);
	if (targets.length === 0) {
		logger.debug(`mapping "${mapping.name}": no matching files`);
		return { outputs: [], skips: [] };
	}
	logger.info(`mapping "${mapping.name}": ${targets.length} target(s)`);

	const onMissing = mapping.onMissingReadme ?? cfg.defaults.onMissingReadme;
	const detailLevel = mapping.detailLevel ?? cfg.defaults.detailLevel;
	const model = mapping.model ?? cfg.defaults.model;
	const format = mapping.format ?? cfg.defaults.format;
	const promptPath = mapping.prompt ?? cfg.prompt;

	let userPrompt: string | undefined;
	if (promptPath !== undefined) {
		try {
			userPrompt = await loadPromptFile(promptPath, promptCache);
		} catch (error) {
			throw new Error(`Failed to read prompt file "${promptPath}" for mapping "${mapping.name}"`, { cause: error });
		}
	}

	const outputs: MappingOutput[] = [];
	const skips: MappingSkip[] = [];

	for (const target of targets) {
		// eslint-disable-next-line no-await-in-loop
		const existing = await readReadmeIfExists(target.targetPath);

		if (existing === undefined && onMissing === 'skip') {
			logger.info(`Skipping ${target.targetPath}: target missing and on_missing_readme=skip`);
			skips.push({ mappingName: mapping.name, targetPath: target.targetPath, reason: 'target missing and on_missing_readme=skip' });
			continue;
		}

		const featureName = target.captures.FEATURE_NAME ?? Object.values(target.captures)[0] ?? mapping.name;

		const aiContext: AiRequestContext = {
			featureName,
			detailLevel,
			prTitle: typeof pr?.title === 'string' ? pr.title : undefined,
			prBody: typeof pr?.body === 'string' ? pr.body : undefined,
			changedFiles: target.changedFiles,
			existingReadme: existing,
			updateMode: 'update',
		};

		try {
			// Sequential awaits across targets keep us under OpenAI's per-minute
			// request budget on smaller plans (same reason as the legacy path).
			// eslint-disable-next-line no-await-in-loop
			const result = await generateMappingReadme(aiContext, { openaiApiKey, openaiModel: model }, { format, userPrompt });
			if (result.kind === 'skip') {
				logger.info(`Skipping ${target.targetPath}: ${result.reason}`);
				skips.push({ mappingName: mapping.name, targetPath: target.targetPath, reason: result.reason });
				continue;
			}
			outputs.push({
				mappingName: mapping.name,
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

async function writeMappingOutputs(outputs: MappingOutput[]): Promise<string[]> {
	const updatedFiles: string[] = [];
	for (const output of outputs) {
		// eslint-disable-next-line no-await-in-loop
		const filePath = await writeReadmeAt(output.targetPath, output.proposed);
		updatedFiles.push(filePath);
	}
	return updatedFiles;
}

async function deliverPreviewComment(results: MappingResults, prNumber: number, token: string): Promise<void> {
	const previews: MappingPreview[] = [
		...results.outputs.map(
			(o): MappingPreview => ({
				mappingName: o.mappingName,
				targetPath: o.targetPath,
				existing: o.existing,
				proposed: o.proposed,
				skip: false,
			}),
		),
		...results.skips.map(
			(s): MappingPreview => ({
				mappingName: s.mappingName,
				targetPath: s.targetPath,
				existing: undefined,
				proposed: '',
				skip: true,
				skipReason: s.reason,
			}),
		),
	];
	const body = renderPreviewBody(previews);
	await postOrUpdateMappingComment(prNumber, body, github.context, token);
}

run();
