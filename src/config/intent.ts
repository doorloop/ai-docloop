import * as core from '@actions/core';

import { extractPlaceholderNames } from '../lib/glob-with-captures';
import { DeliveryMode, DetailLevel, MappingIntent, OnMissingReadme, OutputFormat } from '../types';

const DETAIL_LEVELS: readonly DetailLevel[] = ['low', 'medium', 'high'];
const FORMATS: readonly OutputFormat[] = ['structured', 'freeform'];
const ON_MISSING_README: readonly OnMissingReadme[] = ['create', 'skip'];
const DELIVERIES: readonly DeliveryMode[] = ['direct_commit', 'pr', 'pr_comment', 'pr_branch_commit'];

export class InputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InputError';
	}
}

function splitList(raw: string): string[] {
	return raw
		.split(/[,\n]/)
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

function parseEnum<T extends string>(name: string, raw: string, allowed: readonly T[]): T {
	const value = raw.trim();
	if (!(allowed as readonly string[]).includes(value)) {
		throw new InputError(`input "${name}" must be one of ${allowed.join(' | ')} (got "${raw}")`);
	}
	return value as T;
}

function assertPathSafe(name: string, value: string): void {
	const segments = value.split('/');
	if (segments.includes('..')) {
		throw new InputError(`input "${name}"="${value}" must not contain ".." segments`);
	}
	if (value.startsWith('/')) {
		throw new InputError(`input "${name}"="${value}" must be a repo-relative path, not absolute`);
	}
}

function deriveName(watch: string[], readme: string): string {
	return `${watch[0]} → ${readme}`;
}

function ensurePlaceholderConsistency(watch: string[], readme: string): void {
	const watchSets = watch.map(extractPlaceholderNames);
	const reference = watchSets[0];
	for (let i = 1; i < watchSets.length; i++) {
		const current = watchSets[i];
		if (current.length !== reference.length || current.some((p, idx) => p !== reference[idx])) {
			throw new InputError(
				`input "watch"[${i}] declares placeholders [${current.join(', ')}] which differ from watch[0] [${reference.join(', ')}]; all watch entries must declare the same placeholders.`,
			);
		}
	}
	const declared = new Set(reference);
	for (const placeholder of extractPlaceholderNames(readme)) {
		if (!declared.has(placeholder)) {
			throw new InputError(
				`input "readme" references <${placeholder}> which is not declared in any "watch" entry; declare it in watch (e.g. apps/<APP>/<${placeholder}>/**) or remove it from readme.`,
			);
		}
	}
}

export function getMappingIntent(): MappingIntent {
	const openaiApiKey = core.getInput('openai_api_key', { required: true });
	const openaiModel = core.getInput('openai_model').trim() || 'gpt-4o-mini';

	const watchRaw = core.getInput('watch', { required: true });
	const watch = splitList(watchRaw);
	if (watch.length === 0) {
		throw new InputError('input "watch" must contain at least one glob pattern');
	}
	for (const pattern of watch) {
		assertPathSafe('watch', pattern);
	}

	const readme = core.getInput('readme', { required: true }).trim();
	if (readme.length === 0) {
		throw new InputError('input "readme" must not be empty');
	}
	assertPathSafe('readme', readme);

	ensurePlaceholderConsistency(watch, readme);

	const promptFileRaw = core.getInput('prompt_file').trim();
	const promptFile = promptFileRaw.length > 0 ? promptFileRaw : undefined;
	if (promptFile !== undefined) {
		assertPathSafe('prompt_file', promptFile);
	}

	const detailLevel = parseEnum('detail_level', core.getInput('detail_level') || 'medium', DETAIL_LEVELS);
	const format = parseEnum('format', core.getInput('format') || 'structured', FORMATS);
	const onMissingReadme = parseEnum('on_missing_readme', core.getInput('on_missing_readme') || 'create', ON_MISSING_README);

	const exclude = splitList(core.getInput('exclude'));

	const deliveryRaw = core.getInput('delivery').trim();
	const delivery = deliveryRaw.length > 0 ? parseEnum('delivery', deliveryRaw, DELIVERIES) : undefined;

	const commitMessage = core.getInput('commit_message').trim() || 'docs: update [skip ci]';

	const prTitleRaw = core.getInput('pr_title').trim();
	const prTitle = prTitleRaw.length > 0 ? prTitleRaw : undefined;

	const requestReviewRaw = core.getInput('request_review_from_pr_author').trim().toLowerCase();
	const requestReviewFromPrAuthor = requestReviewRaw !== 'false';

	const nameRaw = core.getInput('name').trim();
	const name = nameRaw.length > 0 ? nameRaw : deriveName(watch, readme);

	return {
		name,
		watch,
		readme,
		promptFile,
		detailLevel,
		format,
		onMissingReadme,
		exclude,
		delivery,
		commitMessage,
		prTitle,
		requestReviewFromPrAuthor,
		openaiApiKey,
		openaiModel,
	};
}
