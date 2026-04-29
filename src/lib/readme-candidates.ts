import { promises as fs } from 'node:fs';

import normalizePath from 'normalize-path';

import { MappingIntent, MappingTarget } from '../types';
import { parseFrontmatter } from './frontmatter';
import { compileWatchPattern } from './glob-with-captures';
import { logger } from './logger';

const GLOB_SUFFIX = '/**';
const RELATIVE_PREFIX = './';

function normalize(path: string): string {
	const n = normalizePath(path);
	const stripped = n.endsWith(GLOB_SUFFIX) ? n.slice(0, -GLOB_SUFFIX.length) : n;
	return stripped.startsWith(RELATIVE_PREFIX) ? stripped.slice(RELATIVE_PREFIX.length) : stripped;
}

interface ResolvedCandidate {
	readonly filePath: string;
	readonly title?: string;
	readonly ownedGlobs: readonly string[];
	readonly existingReadme: string;
}

async function loadCandidate(filePath: string): Promise<ResolvedCandidate | null> {
	let raw: string;
	try {
		raw = await fs.readFile(filePath, 'utf-8');
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		logger.warning(`Could not read candidate "${filePath}": ${message}`);
		return null;
	}

	const fm = parseFrontmatter(raw);
	if (fm === null) {
		logger.warning(`Skipping candidate "${filePath}": no YAML frontmatter`);
		return null;
	}
	if (fm.paths.length === 0) {
		logger.warning(`Skipping candidate "${filePath}": frontmatter has no \`paths:\` declaration`);
		return null;
	}
	return { filePath, title: fm.title, ownedGlobs: fm.paths, existingReadme: raw };
}

function deriveFeatureName(filePath: string, title: string | undefined): string {
	if (title !== undefined && title.length > 0) return title;
	const slash = filePath.lastIndexOf('/');
	const base = slash === -1 ? filePath : filePath.slice(slash + 1);
	return base.replace(/\.md$/, '');
}

interface CandidateResolutionInput {
	readonly intent: MappingIntent;
	readonly candidatesGlob: string;
	readonly allRepoFiles: readonly string[];
	readonly changedFiles: readonly string[];
}

export async function resolveCandidatesByFrontmatter(input: CandidateResolutionInput): Promise<MappingTarget[]> {
	const { candidatesGlob, allRepoFiles, changedFiles, intent } = input;

	// Step 1: expand the candidates glob against the repo file list.
	const candidatesCompiled = compileWatchPattern(candidatesGlob);
	const candidatePaths = allRepoFiles.filter((f) => candidatesCompiled.regex.test(normalize(f)));
	if (candidatePaths.length === 0) {
		logger.warning(`readme_candidates="${candidatesGlob}" matched no files in the repo`);
		return [];
	}
	logger.info(`readme_candidates resolved ${candidatePaths.length} candidate file(s)`);

	// Step 2: parse frontmatter from each candidate.
	// Sequential reads — list is small and we want predictable log ordering.
	const resolved: ResolvedCandidate[] = [];
	for (const filePath of candidatePaths) {
		// eslint-disable-next-line no-await-in-loop
		const candidate = await loadCandidate(filePath);
		if (candidate !== null) {
			resolved.push(candidate);
		}
	}
	if (resolved.length === 0) {
		logger.warning('No usable candidates after frontmatter parsing');
		return [];
	}

	// Step 3: respect the intent's exclude list when matching changed files.
	const compiledExcludes = intent.exclude.map(compileWatchPattern);
	const eligibleChanged = changedFiles.filter((f) => {
		const n = normalize(f);
		if (compiledExcludes.some((c) => c.regex.test(n))) {
			logger.debug(`File "${f}" excluded by mapping "${intent.name}" exclude rule`);
			return false;
		}
		return true;
	});

	// Step 4: for each candidate, find which eligible-changed files its
	// owned globs cover. One changed file may light up multiple candidates
	// (intentional — that's the M:N routing model).
	const targets: MappingTarget[] = [];
	for (const candidate of resolved) {
		const ownedCompiled = candidate.ownedGlobs.map(compileWatchPattern);
		const matched = eligibleChanged.filter((f) => {
			const n = normalize(f);
			return ownedCompiled.some((c) => c.regex.test(n));
		});
		if (matched.length === 0) continue;
		targets.push({
			targetPath: candidate.filePath,
			captures: { FEATURE_NAME: deriveFeatureName(candidate.filePath, candidate.title) },
			changedFiles: matched,
		});
	}

	if (targets.length === 0) {
		logger.info(`No candidate's \`paths:\` matched any changed file (out of ${eligibleChanged.length} eligible)`);
	} else {
		logger.info(`Routed to ${targets.length} candidate(s) via frontmatter`);
	}

	return targets;
}
