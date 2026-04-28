import * as core from '@actions/core';

import { logger } from '../lib/logger';
import { ActionConfig, DetailLevel, DocloopConfig, UpdateMode } from '../types';
import { loadDocloopConfig } from './loader';

function parseStringArray(input: string): string[] {
	return input
		.split(/[,\n]/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

function parseDetailLevel(input: string): DetailLevel {
	const normalized = input.toLowerCase().trim();
	if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
		return normalized;
	}
	logger.warning(`Invalid detail_level "${input}", defaulting to "medium"`);
	return 'medium';
}

function parseUpdateMode(input: string): UpdateMode {
	const normalized = input.toLowerCase().trim();
	if (normalized === 'update' || normalized === 'overwrite') {
		return normalized;
	}
	logger.warning(`Invalid update_mode "${input}", defaulting to "update"`);
	return 'update';
}

function parseBoolean(input: string): boolean {
	return input.toLowerCase().trim() === 'true';
}

function parseInteger(input: string, defaultValue: number): number {
	const parsed = parseInt(input.trim(), 10);
	if (isNaN(parsed)) {
		logger.warning(`Invalid integer "${input}", defaulting to ${defaultValue}`);
		return defaultValue;
	}
	return parsed;
}

export async function tryGetDocloopConfig(): Promise<DocloopConfig | null> {
	const configFile = core.getInput('config_file') || '.docloop.yml';
	return loadDocloopConfig(configFile);
}

export async function getConfig(): Promise<ActionConfig> {
	const baseBranches = parseStringArray(core.getInput('base_branches', { required: true }));
	const pathScopes = parseStringArray(core.getInput('path_scopes', { required: true }));
	const docRootDepthFromScope = parseInteger(core.getInput('doc_root_depth_from_scope') || '1', 1);
	const readmeFilename = core.getInput('readme_filename') || 'README.md';
	const detailLevel = parseDetailLevel(core.getInput('detail_level') || 'medium');
	const openaiModel = core.getInput('openai_model') || 'gpt-4o-mini';
	const openaiApiKey = core.getInput('openai_api_key', { required: true });
	const updateMode = parseUpdateMode(core.getInput('update_mode') || 'update');
	const commitMessage = core.getInput('commit_message') || 'docs: update READMEs [skip ci]';
	const createPr = parseBoolean(core.getInput('create_pr') || 'false');

	if (baseBranches.length === 0) {
		throw new Error('base_branches must contain at least one branch name');
	}

	if (pathScopes.length === 0) {
		throw new Error('path_scopes must contain at least one path scope');
	}

	return {
		baseBranches,
		pathScopes,
		docRootDepthFromScope,
		readmeFilename,
		detailLevel,
		openaiModel,
		openaiApiKey,
		updateMode,
		commitMessage,
		createPr,
	};
}
