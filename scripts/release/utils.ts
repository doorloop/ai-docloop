import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { SEMVER_REGEX, VERSION_PREFIX_REGEX, PACKAGE_JSON_PATH, TERMINAL_COLORS } from './constants';
import { ExecOptions, VersionType, Color } from './types';

/** Log a message with color */
export const log = (message: string, color: Color = 'reset'): void => {
	console.log(`${TERMINAL_COLORS[color]}${message}${TERMINAL_COLORS.reset}`);
};

/** Execute a shell command */
export const exec = (command: string, options: ExecOptions = {}): string | null => {
	try {
		return execSync(command, {
			stdio: options.silent ? 'pipe' : 'inherit',
			encoding: 'utf-8',
		}) as string;
	} catch (error) {
		if (!options.ignoreError) {
			throw error;
		}
		return null;
	}
};

/** Get current version from package.json */
export const getCurrentVersion = (): string => {
	const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8')) as { version: string };
	return packageJson.version;
};

/** Validate version string against semantic versioning */
export const validateVersion = (version: string): boolean => {
	return SEMVER_REGEX.test(version);
};

/** Remove 'v' prefix from version string if present */
export const normalizeVersion = (version: string): string => {
	return version.replace(VERSION_PREFIX_REGEX, '');
};

/** Increment version based on type */
export const incrementVersion = (currentVersion: string, type: VersionType): string => {
	const [major, minor, patch] = currentVersion.split('.').map(Number);

	switch (type) {
		case 'major':
			return `${major + 1}.0.0`;
		case 'minor':
			return `${major}.${minor + 1}.0`;
		case 'patch':
			return `${major}.${minor}.${patch + 1}`;
		default:
			return currentVersion;
	}
};

/** Check if git repository is clean */
const checkGitStatus = (): boolean => {
	const status = exec('git status --porcelain', { silent: true });
	return status?.trim() === '';
};

/** Get current git branch name */
export const getGitBranch = (): string => {
	const branch = exec('git rev-parse --abbrev-ref HEAD', { silent: true });
	return branch?.trim() || '';
};

/** Check if there are uncommitted changes */
export const hasUncommittedChanges = (): boolean => {
	return !checkGitStatus();
};

/** Check if a tag exists on remote */
export const checkRemoteTagExists = (tag: string): boolean => {
	try {
		const result = exec(`git ls-remote --tags origin ${tag}`, {
			silent: true,
			ignoreError: true,
		});
		return result ? result.trim().length > 0 : false;
	} catch {
		return false;
	}
};

/** Check if we're in a git repository */
export const isGitRepository = (): boolean => {
	try {
		exec('git rev-parse --git-dir', { silent: true });
		return true;
	} catch {
		return false;
	}
};

/** Update version in package.json */
export const updatePackageJsonVersion = (version: string): void => {
	const packageJsonPath = path.join(process.cwd(), PACKAGE_JSON_PATH);
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { version: string };
	packageJson.version = version;
	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
};

/** Stage files for commit */
export const stageFiles = (files: string[]): void => {
	files.forEach((file) => {
		if (file.startsWith('-f ')) {
			exec(`git add ${file}`);
		} else {
			exec(`git add ${file}`);
		}
	});
};

/** Create a git commit */
export const createCommit = (message: string): void => {
	exec(`git commit -m "${message}"`);
};

/** Create a git tag */
export const createTag = (tag: string, message: string): void => {
	exec(`git tag -a "${tag}" -m "${message}"`);
};

/** Run type checking */
export const runTypeCheck = (): void => {
	exec('bun run typecheck');
};

/** Run tests */
export const runTests = (): void => {
	exec('bun test');
};

/** Build the project */
export const buildProject = (): void => {
	exec('bun run build');
};
