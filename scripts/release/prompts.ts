import * as readline from 'readline';

import inquirer, { QuestionCollection } from 'inquirer';

import { ReleaseAnswers } from './types';
import { getCurrentVersion, validateVersion, normalizeVersion } from './utils';

/** Ask a question using readline */
export const askQuestion = (question: string): Promise<string> => {
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
};

/** Prompt user for release information using inquirer */
export const promptUserForRelease = async (): Promise<ReleaseAnswers | null> => {
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
				const normalized = normalizeVersion(input.trim());
				if (!validateVersion(normalized)) {
					return 'Invalid version format. Use semantic versioning (e.g., 1.2.3)';
				}
				return true;
			},
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
		return {
			...answers,
			runTests: true,
			runTypeCheck: true,
		};
	} catch (error) {
		return null;
	}
};

/** Parse version from command line arguments */
export const parseVersionFromArgs = (): string | null => {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		return null;
	}

	const version = normalizeVersion(args[0]);
	if (!validateVersion(version)) {
		throw new Error(`Invalid version format: ${version}. Use semantic versioning (e.g., 1.2.3)`);
	}

	return version;
};

/** Create release answers from command line arguments */
export const createReleaseAnswersFromArgs = (version: string): ReleaseAnswers => {
	return {
		versionType: 'custom',
		customVersion: version,
		runTests: true,
		runTypeCheck: true,
		dryRun: false,
	};
};
