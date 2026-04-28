import * as core from '@actions/core';
import * as github from '@actions/github';

import { generateReadme } from './ai';
import { getConfig, tryGetDocloopConfig } from './config';
import { commitAndPush, getChangedFilesForMergedPr } from './git';
import { buildPathScopeConfigs, logger, mapFilesToDocRoots, matchesGlob, resolveMappingTargets } from './lib';
import { buildDocRoots, readReadmeIfExists, writeReadme, writeReadmeAt } from './readme';
import { AiRequestContext, DocloopConfig, MappingConfig } from './types';

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

	if (eventName !== 'pull_request' || action !== 'closed') {
		logger.info(`Event "${eventName}" with action "${action ?? 'none'}" is not handled by this stage of docloop. Skipping.`);
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

	const trigger = cfg.triggers.prMerged;
	if (!trigger || !trigger.enabled) {
		logger.info('pr_merged trigger is not enabled in .docloop.yml, skipping');
		return;
	}

	const baseBranch = pr.base?.ref;
	if (!baseBranch) {
		throw new Error('Could not determine base branch from PR');
	}

	if (trigger.baseBranches.length > 0) {
		const matches = trigger.baseBranches.some((pattern) => matchesGlob(baseBranch, pattern));
		if (!matches) {
			logger.info(`Base branch "${baseBranch}" does not match trigger base_branches: ${trigger.baseBranches.join(', ')}`);
			return;
		}
	}

	logger.info(`Processing merged PR #${pr.number}: ${pr.title}`);

	const changedFiles = await getChangedFilesForMergedPr(github.context, token);
	if (changedFiles.length === 0) {
		logger.info('No changed files found in PR');
		return;
	}

	logger.info(`Found ${changedFiles.length} changed file(s)`);

	const openaiApiKey = core.getInput('openai_api_key', { required: true });
	const updatedFiles: string[] = [];

	for (const mapping of cfg.mappings) {
		// eslint-disable-next-line no-await-in-loop
		const filesForMapping = await processMapping(mapping, cfg, changedFiles, openaiApiKey, pr);
		updatedFiles.push(...filesForMapping);
	}

	if (updatedFiles.length === 0) {
		logger.info('No README files were generated or updated');
		return;
	}

	logger.info(`Generated/updated ${updatedFiles.length} README file(s)`);

	const createPr = trigger.delivery === 'pr';
	await commitAndPush(updatedFiles, trigger.commitMessage, createPr, github.context, token);
}

async function processMapping(
	mapping: MappingConfig,
	cfg: DocloopConfig,
	changedFiles: string[],
	openaiApiKey: string,
	pr: NonNullable<typeof github.context.payload.pull_request>,
): Promise<string[]> {
	const targets = resolveMappingTargets(mapping, changedFiles, cfg.defaults.exclude);
	if (targets.length === 0) {
		logger.debug(`mapping "${mapping.name}": no matching files`);
		return [];
	}
	logger.info(`mapping "${mapping.name}": ${targets.length} target(s)`);

	const onMissing = mapping.onMissingReadme ?? cfg.defaults.onMissingReadme;
	const detailLevel = mapping.detailLevel ?? cfg.defaults.detailLevel;
	const model = mapping.model ?? cfg.defaults.model;

	const updatedFiles: string[] = [];

	for (const target of targets) {
		// eslint-disable-next-line no-await-in-loop
		const existing = await readReadmeIfExists(target.targetPath);

		if (existing === undefined && onMissing === 'skip') {
			logger.info(`Skipping ${target.targetPath}: target missing and on_missing_readme=skip`);
			continue;
		}

		const featureName = target.captures.FEATURE_NAME ?? Object.values(target.captures)[0] ?? mapping.name;

		const aiContext: AiRequestContext = {
			featureName,
			detailLevel,
			prTitle: pr.title || undefined,
			prBody: pr.body || undefined,
			changedFiles: target.changedFiles,
			existingReadme: existing,
			updateMode: 'update',
		};

		try {
			// Sequential awaits across targets keep us under OpenAI's per-minute
			// request budget on smaller plans (same reason as the legacy path).
			// eslint-disable-next-line no-await-in-loop
			const content = await generateReadme(aiContext, { openaiApiKey, openaiModel: model });
			// eslint-disable-next-line no-await-in-loop
			const filePath = await writeReadmeAt(target.targetPath, content);
			updatedFiles.push(filePath);
		} catch (error) {
			logger.error(`Failed to generate README for ${target.targetPath}: ${error}`);
		}
	}

	return updatedFiles;
}

run();
