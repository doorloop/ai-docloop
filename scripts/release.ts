#!/usr/bin/env tsx
/**
 * Interactive release script for DocLoop AI GitHub Action
 * Follows industry best practices for versioning and publishing
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

import inquirer, { QuestionCollection } from 'inquirer';

// Colors for terminal output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	red: '\x1b[31m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m',
};

type Color = keyof typeof colors;

function log(message: string, color: Color = 'reset'): void {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

interface ExecOptions {
	silent?: boolean;
	ignoreError?: boolean;
}

function exec(command: string, options: ExecOptions = {}): string | null {
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
}

function getCurrentVersion(): string {
	const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string };
	return packageJson.version;
}

function validateVersion(version: string): boolean {
	const semverRegex =
		/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
	return semverRegex.test(version);
}

function incrementVersion(currentVersion: string, type: 'major' | 'minor' | 'patch'): string {
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
}

function checkGitStatus(): boolean {
	const status = exec('git status --porcelain', { silent: true });
	return status?.trim() === '';
}

function checkGitBranch(): string {
	const branch = exec('git rev-parse --abbrev-ref HEAD', { silent: true });
	return branch?.trim() || '';
}

function checkUncommittedChanges(): boolean {
	return !checkGitStatus();
}

function checkRemoteTagExists(tag: string): boolean {
	try {
		const result = exec(`git ls-remote --tags origin ${tag}`, {
			silent: true,
			ignoreError: true,
		});
		return result ? result.trim().length > 0 : false;
	} catch {
		return false;
	}
}

function updatePackageJson(version: string): void {
	const packageJsonPath = path.join(process.cwd(), 'package.json');
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { version: string };
	packageJson.version = version;
	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
}

interface ReleaseAnswers {
	versionType: 'major' | 'minor' | 'patch' | 'custom';
	customVersion?: string;
	runTests: boolean;
	runTypeCheck: boolean;
	dryRun: boolean;
}

async function promptUser(): Promise<ReleaseAnswers | null> {
	const currentVersion = getCurrentVersion();
	const [major, minor, patch] = currentVersion.split('.').map(Number);

	const questions: QuestionCollection<ReleaseAnswers> = [
		{
			type: 'list',
			name: 'versionType',
			message: 'What type of release is this?',
			choices: [
				{
					name: `Patch (${major}.${minor}.${patch + 1}) - Bug fixes`,
					value: 'patch',
				},
				{
					name: `Minor (${major}.${minor + 1}.0) - New features (backward compatible)`,
					value: 'minor',
				},
				{
					name: `Major (${major + 1}.0.0) - Breaking changes`,
					value: 'major',
				},
				{
					name: 'Custom version',
					value: 'custom',
				},
			],
		},
		{
			type: 'input',
			name: 'customVersion',
			message: 'Enter version number (e.g., 1.2.3):',
			when: (answers: ReleaseAnswers) => answers.versionType === 'custom',
			validate: (input: string) => {
				if (!input.trim()) {
					return 'Version cannot be empty';
				}
				if (!validateVersion(input.trim())) {
					return 'Invalid version format. Use semantic versioning (e.g., 1.2.3)';
				}
				return true;
			},
		},
		{
			type: 'confirm',
			name: 'runTests',
			message: 'Run tests before releasing?',
			default: true,
		},
		{
			type: 'confirm',
			name: 'runTypeCheck',
			message: 'Run type checking before releasing?',
			default: true,
		},
		{
			type: 'confirm',
			name: 'dryRun',
			message: 'Perform a dry run? (no commits or tags will be created)',
			default: false,
		},
	];

	try {
		const answers = await inquirer.prompt<ReleaseAnswers>(questions);
		return answers;
	} catch {
		// If inquirer fails (e.g., not installed), return null to use fallback
		return null;
	}
}

function askQuestion(question: string): Promise<string> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer);
		});
	});
}

async function main(): Promise<void> {
	log('\n🚀 DocLoop AI Release Script\n', 'bright');

	// Pre-flight checks
	log('📋 Running pre-flight checks...', 'cyan');

	// Check if we're in a git repository
	try {
		exec('git rev-parse --git-dir', { silent: true });
	} catch {
		log('❌ Error: Not in a git repository', 'red');
		process.exit(1);
	}

	// Check git status
	const hasUncommittedChanges = checkUncommittedChanges();
	if (hasUncommittedChanges) {
		log('⚠️  Warning: You have uncommitted changes', 'yellow');
		const status = exec('git status --short', { silent: true });
		if (status) {
			console.log(status);
		}

		const answer = await askQuestion('\nContinue anyway? (y/N): ');
		if (answer.toLowerCase() !== 'y') {
			log('❌ Release cancelled', 'red');
			process.exit(1);
		}
	}

	await proceedWithRelease();

	async function proceedWithRelease(): Promise<void> {
		try {
			// Get user input
			let answers: ReleaseAnswers | null = await promptUser();

			if (!answers) {
				// Fallback to command-line arguments
				const args = process.argv.slice(2);
				if (args.length === 0) {
					log('❌ Error: Version required. Usage: npm run release [version]', 'red');
					log('   Example: npm run release 1.0.1', 'yellow');
					log('   Or install inquirer for interactive mode: npm install --save-dev inquirer', 'yellow');
					process.exit(1);
				}

				const version = args[0].replace(/^v/, '');
				if (!validateVersion(version)) {
					log(`❌ Error: Invalid version format: ${version}`, 'red');
					log('   Use semantic versioning (e.g., 1.2.3)', 'yellow');
					process.exit(1);
				}

				answers = {
					versionType: 'custom',
					customVersion: version,
					runTests: true,
					runTypeCheck: true,
					dryRun: false,
				};
			}

			// Determine version
			let newVersion: string;
			if (answers.versionType === 'custom') {
				newVersion = answers.customVersion!.trim();
			} else {
				newVersion = incrementVersion(getCurrentVersion(), answers.versionType);
			}

			const currentVersion = getCurrentVersion();
			const tag = `v${newVersion}`;

			// Check if tag already exists
			if (checkRemoteTagExists(tag)) {
				log(`❌ Error: Tag ${tag} already exists on remote`, 'red');
				process.exit(1);
			}

			// Show release plan
			log('\n📦 Release Plan:', 'bright');
			log(`   Current version: ${currentVersion}`, 'cyan');
			log(`   New version:     ${newVersion}`, 'green');
			log(`   Tag:             ${tag}`, 'cyan');
			log(`   Branch:          ${checkGitBranch()}`, 'cyan');
			log(`   Dry run:         ${answers.dryRun ? 'Yes' : 'No'}`, answers.dryRun ? 'yellow' : 'cyan');

			if (answers.dryRun) {
				log('\n⚠️  DRY RUN MODE - No changes will be committed', 'yellow');
			}

			// Confirm before proceeding
			const confirm = await askQuestion('\nProceed with release? (y/N): ');

			if (confirm.toLowerCase() !== 'y') {
				log('❌ Release cancelled', 'red');
				process.exit(0);
			}

			try {
				// Run type checking
				if (answers.runTypeCheck) {
					log('\n🔍 Running type check...', 'cyan');
					exec('npm run typecheck');
				}

				// Run tests
				if (answers.runTests) {
					log('\n🧪 Running tests...', 'cyan');
					exec('npm test');
				}

				// Build
				log('\n📦 Building action...', 'cyan');
				exec('npm run build');

				if (!answers.dryRun) {
					// Update package.json
					log('\n📝 Updating package.json...', 'cyan');
					updatePackageJson(newVersion);

					// Stage dist/ directory
					log('\n📁 Staging dist/ directory...', 'cyan');
					exec('git add -f dist/');
					exec('git add package.json');

					// Commit changes
					log('\n💾 Committing changes...', 'cyan');
					const commitMessage = `chore: release ${tag}`;
					exec(`git commit -m "${commitMessage}"`);

					// Create tag
					log(`\n🏷️  Creating tag ${tag}...`, 'cyan');
					exec(`git tag -a "${tag}" -m "Release ${tag}"`);

					log('\n✅ Release prepared successfully!', 'green');
					log('\n📋 Next steps:', 'bright');
					log('   1. Review changes: git log --oneline -5', 'cyan');
					log('   2. Push commits:    git push', 'cyan');
					log(`   3. Push tag:        git push origin ${tag}`, 'cyan');
					log('\n   The release workflow will automatically create a GitHub release.', 'cyan');
				} else {
					log('\n✅ Dry run completed successfully!', 'green');
					log('   No changes were made. Run without dry-run to create the release.', 'cyan');
				}
			} catch (error) {
				log('\n❌ Release failed!', 'red');
				const errorMessage = error instanceof Error ? error.message : String(error);
				log(`   Error: ${errorMessage}`, 'red');
				process.exit(1);
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			log(`\n❌ Error: ${errorMessage}`, 'red');
			process.exit(1);
		}
	}
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
	const errorMessage = error instanceof Error ? error.message : String(error);
	log(`\n❌ Unhandled error: ${errorMessage}`, 'red');
	process.exit(1);
});

main();
