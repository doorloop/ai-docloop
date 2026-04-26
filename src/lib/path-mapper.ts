import normalizePath from 'normalize-path';

import { PathScopeConfig } from '../types';
import { logger } from './logger';

const GLOB_PATTERN_SUFFIX = '/**';
const RELATIVE_PATH_PREFIX = './';

/**
 * Removes glob pattern suffix (/**) from a path if present.
 */
function removeGlobPattern(path: string): string {
	return path.endsWith(GLOB_PATTERN_SUFFIX) ? path.slice(0, -GLOB_PATTERN_SUFFIX.length) : path;
}

/**
 * Removes leading relative path indicator (./) if present.
 */
function removeRelativePrefix(path: string): string {
	return path.startsWith(RELATIVE_PATH_PREFIX) ? path.slice(RELATIVE_PATH_PREFIX.length) : path;
}

/**
 * Normalizes a path string for consistent processing:
 * - Normalizes path separators first (handles Windows/Unix differences)
 * - Removes glob patterns (/** suffix)
 * - Removes leading relative path indicators (./)
 */
function normalizePathString(path: string): string {
	const normalized = normalizePath(path);
	const withoutGlob = removeGlobPattern(normalized);
	const withoutRelative = removeRelativePrefix(withoutGlob);
	return withoutRelative;
}

export function buildPathScopeConfigs(pathScopes: string[]): PathScopeConfig[] {
	return pathScopes.map((pattern) => {
		const scopeRoot = normalizePathString(pattern);
		const scopeRootSegments = scopeRoot.split('/').filter((s) => s.length > 0);

		return {
			pattern,
			scopeRoot,
			scopeRootSegments,
		};
	});
}

function normalizeFilePath(filePath: string): string {
	return normalizePathString(filePath);
}

function isPathPrefix(prefixSegments: string[], pathSegments: string[]): boolean {
	if (prefixSegments.length > pathSegments.length) {
		return false;
	}

	for (let i = 0; i < prefixSegments.length; i++) {
		if (prefixSegments[i] !== pathSegments[i]) {
			return false;
		}
	}

	return true;
}

function findMatchingScope(fileSegments: string[], scopes: PathScopeConfig[]): PathScopeConfig | null {
	const matchingScopes = scopes.filter((scope) => isPathPrefix(scope.scopeRootSegments, fileSegments));

	if (matchingScopes.length === 0) {
		return null;
	}

	// Return the most specific scope (longest scopeRootSegments)
	return matchingScopes.reduce((prev, current) => (current.scopeRootSegments.length > prev.scopeRootSegments.length ? current : prev));
}

export function mapFilesToDocRoots(files: string[], pathScopes: PathScopeConfig[], depthFromScope: number): Map<string, string[]> {
	const docRootMap = new Map<string, string[]>();

	for (const file of files) {
		const normalizedFile = normalizeFilePath(file);
		const fileSegments = normalizedFile.split('/').filter((s) => s.length > 0);

		const matchingScope = findMatchingScope(fileSegments, pathScopes);

		if (!matchingScope) {
			logger.debug(`File "${file}" does not match any path scope, skipping`);
			continue;
		}

		const rootLen = matchingScope.scopeRootSegments.length;
		const docRootSegments = fileSegments.slice(0, rootLen + depthFromScope);

		// Check if file is deep enough
		if (docRootSegments.length <= rootLen) {
			logger.debug(`File "${file}" is not deep enough for depth ${depthFromScope} from scope root, skipping`);
			continue;
		}

		const docRootPath = docRootSegments.join('/');

		const existingFiles = docRootMap.get(docRootPath) || [];
		existingFiles.push(file);
		docRootMap.set(docRootPath, existingFiles);
	}

	return docRootMap;
}
