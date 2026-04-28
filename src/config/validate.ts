import {
	DeliveryMode,
	DetailLevel,
	DocloopConfig,
	DocloopDefaults,
	DocloopTriggers,
	MappingConfig,
	OnMissingReadme,
	OutputFormat,
	PrMergedTrigger,
	PrOpenedTrigger,
	WorkflowDispatchTrigger,
} from '../types';

const PLACEHOLDER_PATTERN = /<([A-Z][A-Z0-9_]*)>/g;

const DETAIL_LEVELS = ['low', 'medium', 'high'] as const satisfies readonly DetailLevel[];
const OUTPUT_FORMATS = ['structured', 'freeform'] as const satisfies readonly OutputFormat[];
const ON_MISSING_README = ['create', 'skip'] as const satisfies readonly OnMissingReadme[];
const PR_MERGED_DELIVERIES = ['direct_commit', 'pr'] as const satisfies readonly DeliveryMode[];
const PR_OPENED_DELIVERIES = ['pr_comment', 'pr_branch_commit'] as const satisfies readonly DeliveryMode[];
const WORKFLOW_DISPATCH_DELIVERIES = ['direct_commit', 'pr'] as const satisfies readonly DeliveryMode[];

const DEFAULT_DEFAULTS: DocloopDefaults = {
	detailLevel: 'medium',
	model: 'gpt-4o-mini',
	format: 'structured',
	onMissingReadme: 'create',
	exclude: [],
};

const DEFAULT_PR_MERGED_COMMIT_MESSAGE = 'docs: update READMEs [skip ci]';
const DEFAULT_PR_OPENED_COMMIT_MESSAGE = 'docs: sync READMEs from PR [skip ci]';

export class DocloopConfigError extends Error {
	constructor(message: string) {
		super(`.docloop.yml: ${message}`);
		this.name = 'DocloopConfigError';
	}
}

function expectObject(value: unknown, path: string): Record<string, unknown> {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		throw new DocloopConfigError(`${path} must be a mapping`);
	}
	return value as Record<string, unknown>;
}

function expectArray(value: unknown, path: string): unknown[] {
	if (!Array.isArray(value)) {
		throw new DocloopConfigError(`${path} must be a sequence`);
	}
	return value;
}

function expectString(value: unknown, path: string): string {
	if (typeof value !== 'string') {
		throw new DocloopConfigError(`${path} must be a string`);
	}
	return value;
}

function expectNonEmptyString(value: unknown, path: string): string {
	const s = expectString(value, path);
	if (s.length === 0) {
		throw new DocloopConfigError(`${path} must not be empty`);
	}
	return s;
}

function expectBoolean(value: unknown, path: string): boolean {
	if (typeof value !== 'boolean') {
		throw new DocloopConfigError(`${path} must be a boolean`);
	}
	return value;
}

function expectStringArray(value: unknown, path: string): string[] {
	const arr = expectArray(value, path);
	return arr.map((entry, idx) => expectString(entry, `${path}[${idx}]`));
}

function expectNonEmptyStringArray(value: unknown, path: string): string[] {
	const arr = expectStringArray(value, path);
	if (arr.length === 0) {
		throw new DocloopConfigError(`${path} must contain at least one entry`);
	}
	return arr;
}

function expectEnum<T extends string>(value: unknown, path: string, allowed: readonly T[]): T {
	const s = expectString(value, path);
	if (!(allowed as readonly string[]).includes(s)) {
		throw new DocloopConfigError(`${path} must be one of ${allowed.join(' | ')} (got "${s}")`);
	}
	return s as T;
}

function extractPlaceholders(pattern: string): string[] {
	const set = new Set<string>();
	for (const match of pattern.matchAll(PLACEHOLDER_PATTERN)) {
		set.add(match[1]);
	}
	return Array.from(set).toSorted();
}

function assertPathSafe(value: string, path: string): void {
	const segments = value.split('/');
	if (segments.includes('..')) {
		throw new DocloopConfigError(`${path}="${value}" must not contain ".." segments`);
	}
	if (value.startsWith('/')) {
		throw new DocloopConfigError(`${path}="${value}" must be a repo-relative path, not absolute`);
	}
}

function validateDefaults(raw: unknown, path: string): DocloopDefaults {
	if (raw === undefined) {
		return { ...DEFAULT_DEFAULTS };
	}
	const obj = expectObject(raw, path);
	return {
		detailLevel: obj.detail_level === undefined ? DEFAULT_DEFAULTS.detailLevel : expectEnum(obj.detail_level, `${path}.detail_level`, DETAIL_LEVELS),
		model: obj.model === undefined ? DEFAULT_DEFAULTS.model : expectNonEmptyString(obj.model, `${path}.model`),
		format: obj.format === undefined ? DEFAULT_DEFAULTS.format : expectEnum(obj.format, `${path}.format`, OUTPUT_FORMATS),
		onMissingReadme:
			obj.on_missing_readme === undefined
				? DEFAULT_DEFAULTS.onMissingReadme
				: expectEnum(obj.on_missing_readme, `${path}.on_missing_readme`, ON_MISSING_README),
		exclude: obj.exclude === undefined ? [...DEFAULT_DEFAULTS.exclude] : expectStringArray(obj.exclude, `${path}.exclude`),
	};
}

function validateMapping(raw: unknown, path: string): MappingConfig {
	const obj = expectObject(raw, path);
	const name = expectNonEmptyString(obj.name, `${path}.name`);
	const watch = expectNonEmptyStringArray(obj.watch, `${path}.watch`);
	const readme = expectNonEmptyString(obj.readme, `${path}.readme`);

	for (let i = 0; i < watch.length; i++) {
		assertPathSafe(watch[i], `${path}.watch[${i}]`);
	}
	assertPathSafe(readme, `${path}.readme`);

	const watchPlaceholderSets = watch.map((w) => extractPlaceholders(w));
	const reference = watchPlaceholderSets[0];
	for (let i = 1; i < watchPlaceholderSets.length; i++) {
		const current = watchPlaceholderSets[i];
		if (current.length !== reference.length || current.some((p, idx) => p !== reference[idx])) {
			throw new DocloopConfigError(
				`${path}.watch[${i}] declares placeholders [${current.join(', ')}] which differ from ${path}.watch[0] [${reference.join(', ')}]; all watch entries in a mapping must declare the same placeholder names`,
			);
		}
	}
	const watchPlaceholders = new Set(reference);
	const readmePlaceholders = extractPlaceholders(readme);
	for (const placeholder of readmePlaceholders) {
		if (!watchPlaceholders.has(placeholder)) {
			throw new DocloopConfigError(
				`${path}.readme references <${placeholder}> which is not declared in any watch entry; declare it in watch (e.g. apps/.../<${placeholder}>/**) or remove it from readme`,
			);
		}
	}

	const result: MappingConfig = { name, watch, readme };
	if (obj.prompt !== undefined) {
		const prompt = expectNonEmptyString(obj.prompt, `${path}.prompt`);
		assertPathSafe(prompt, `${path}.prompt`);
		result.prompt = prompt;
	}
	if (obj.detail_level !== undefined) {
		result.detailLevel = expectEnum(obj.detail_level, `${path}.detail_level`, DETAIL_LEVELS);
	}
	if (obj.model !== undefined) {
		result.model = expectNonEmptyString(obj.model, `${path}.model`);
	}
	if (obj.format !== undefined) {
		result.format = expectEnum(obj.format, `${path}.format`, OUTPUT_FORMATS);
	}
	if (obj.on_missing_readme !== undefined) {
		result.onMissingReadme = expectEnum(obj.on_missing_readme, `${path}.on_missing_readme`, ON_MISSING_README);
	}
	if (obj.exclude !== undefined) {
		result.exclude = expectStringArray(obj.exclude, `${path}.exclude`);
	}
	return result;
}

function validateMappings(raw: unknown, path: string): MappingConfig[] {
	const arr = expectArray(raw, path);
	if (arr.length === 0) {
		throw new DocloopConfigError(`${path} must contain at least one mapping`);
	}
	const mappings = arr.map((entry, idx) => validateMapping(entry, `${path}[${idx}]`));
	const seen = new Set<string>();
	const targets = new Map<string, string>();
	for (const mapping of mappings) {
		if (seen.has(mapping.name)) {
			throw new DocloopConfigError(`${path}: duplicate mapping name "${mapping.name}"`);
		}
		seen.add(mapping.name);
		const existingOwner = targets.get(mapping.readme);
		if (existingOwner !== undefined) {
			throw new DocloopConfigError(
				`${path}: mappings "${existingOwner}" and "${mapping.name}" both target ${mapping.readme}; readme target paths must be unique across mappings`,
			);
		}
		targets.set(mapping.readme, mapping.name);
	}
	return mappings;
}

function validatePrMergedTrigger(raw: unknown, path: string): PrMergedTrigger {
	const obj = expectObject(raw, path);
	return {
		type: 'pr_merged',
		enabled: obj.enabled === undefined ? true : expectBoolean(obj.enabled, `${path}.enabled`),
		baseBranches: obj.base_branches === undefined ? [] : expectNonEmptyStringArray(obj.base_branches, `${path}.base_branches`),
		delivery: obj.delivery === undefined ? 'direct_commit' : expectEnum(obj.delivery, `${path}.delivery`, PR_MERGED_DELIVERIES),
		commitMessage: obj.commit_message === undefined ? DEFAULT_PR_MERGED_COMMIT_MESSAGE : expectNonEmptyString(obj.commit_message, `${path}.commit_message`),
	};
}

function validatePrOpenedTrigger(raw: unknown, path: string): PrOpenedTrigger {
	const obj = expectObject(raw, path);
	return {
		type: 'pr_opened',
		enabled: obj.enabled === undefined ? false : expectBoolean(obj.enabled, `${path}.enabled`),
		baseBranches: obj.base_branches === undefined ? [] : expectNonEmptyStringArray(obj.base_branches, `${path}.base_branches`),
		delivery: obj.delivery === undefined ? 'pr_comment' : expectEnum(obj.delivery, `${path}.delivery`, PR_OPENED_DELIVERIES),
		commitMessage: obj.commit_message === undefined ? DEFAULT_PR_OPENED_COMMIT_MESSAGE : expectNonEmptyString(obj.commit_message, `${path}.commit_message`),
	};
}

function validateWorkflowDispatchTrigger(raw: unknown, path: string): WorkflowDispatchTrigger {
	const obj = expectObject(raw, path);
	const delivery = obj.delivery === undefined ? 'pr' : expectEnum(obj.delivery, `${path}.delivery`, WORKFLOW_DISPATCH_DELIVERIES);
	return {
		type: 'workflow_dispatch',
		enabled: obj.enabled === undefined ? false : expectBoolean(obj.enabled, `${path}.enabled`),
		delivery,
		baseBranch: obj.base_branch === undefined ? 'main' : expectNonEmptyString(obj.base_branch, `${path}.base_branch`),
	};
}

function validateTriggers(raw: unknown, path: string): DocloopTriggers {
	if (raw === undefined) {
		return {};
	}
	const obj = expectObject(raw, path);
	const triggers: DocloopTriggers = {};
	if (obj.pr_merged !== undefined) {
		triggers.prMerged = validatePrMergedTrigger(obj.pr_merged, `${path}.pr_merged`);
	}
	if (obj.pr_opened !== undefined) {
		triggers.prOpened = validatePrOpenedTrigger(obj.pr_opened, `${path}.pr_opened`);
	}
	if (obj.workflow_dispatch !== undefined) {
		triggers.workflowDispatch = validateWorkflowDispatchTrigger(obj.workflow_dispatch, `${path}.workflow_dispatch`);
	}
	return triggers;
}

export function validateAndNormalize(raw: unknown): DocloopConfig {
	const root = expectObject(raw, '<root>');
	const version = root.version;
	if (version !== 1) {
		throw new DocloopConfigError(`version must be 1 (got ${version === undefined ? 'undefined' : JSON.stringify(version)})`);
	}

	let prompt: string | undefined;
	if (root.prompt !== undefined) {
		prompt = expectNonEmptyString(root.prompt, 'prompt');
		assertPathSafe(prompt, 'prompt');
	}

	const defaults = validateDefaults(root.defaults, 'defaults');
	const triggers = validateTriggers(root.triggers, 'triggers');
	const mappings = validateMappings(root.mappings, 'mappings');

	return {
		version: 1,
		prompt,
		defaults,
		triggers,
		mappings,
	};
}
