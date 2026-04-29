import normalizePath from 'normalize-path';

import { MappingIntent, MappingTarget } from '../types';
import { compileWatchPattern, matchWatchPattern, substitutePlaceholders } from './glob-with-captures';
import { logger } from './logger';

const GLOB_PATTERN_SUFFIX = '/**';
const RELATIVE_PATH_PREFIX = './';

function removeGlobPattern(path: string): string {
	return path.endsWith(GLOB_PATTERN_SUFFIX) ? path.slice(0, -GLOB_PATTERN_SUFFIX.length) : path;
}

function removeRelativePrefix(path: string): string {
	return path.startsWith(RELATIVE_PATH_PREFIX) ? path.slice(RELATIVE_PATH_PREFIX.length) : path;
}

function normalizeFilePath(filePath: string): string {
	const normalized = normalizePath(filePath);
	const withoutGlob = removeGlobPattern(normalized);
	const withoutRelative = removeRelativePrefix(withoutGlob);
	return withoutRelative;
}

function captureKey(captures: Record<string, string>): string {
	const entries = Object.entries(captures).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
	return JSON.stringify(entries);
}

export function resolveMappingTargets(intent: MappingIntent, files: string[]): MappingTarget[] {
	if (intent.readme === undefined) {
		throw new Error('resolveMappingTargets called without intent.readme — this code path requires the placeholder-substitution mode');
	}
	const readme = intent.readme;
	const compiledWatches = intent.watch.map(compileWatchPattern);
	const compiledExcludes = intent.exclude.map(compileWatchPattern);

	const groups = new Map<string, MappingTarget>();

	for (const file of files) {
		const normalizedFile = normalizeFilePath(file);
		if (compiledExcludes.some((c) => c.regex.test(normalizedFile))) {
			logger.debug(`File "${file}" excluded by mapping "${intent.name}" exclude rule`);
			continue;
		}

		for (const compiled of compiledWatches) {
			const captures = matchWatchPattern(normalizedFile, compiled);
			if (captures === null) continue;

			const key = captureKey(captures);
			let group = groups.get(key);
			if (group === undefined) {
				const targetPath = substitutePlaceholders(readme, captures);
				group = { targetPath, captures, changedFiles: [] };
				groups.set(key, group);
			}
			group.changedFiles.push(file);
			break;
		}
	}

	return Array.from(groups.values());
}
