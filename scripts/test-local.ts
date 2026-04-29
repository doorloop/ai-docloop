#!/usr/bin/env bun
/**
 * Local testing helper script
 *
 * This script helps set up environment variables for testing with act.
 * For actual local testing, use `act` (see TESTING.md).
 *
 * Usage:
 *   bun run test:local -- --repo owner/repo --pr-number 123 --base-branch main
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestOptions {
	repo: string;
	prNumber: number;
	baseBranch: string;
	openaiApiKey?: string;
}

function parseArgs(): TestOptions {
	const args = process.argv.slice(2);
	const options: Partial<TestOptions> = {};

	for (let i = 0; i < args.length; i += 2) {
		const key = args[i]?.replace(/^--/, '');
		const value = args[i + 1];
		if (key && value) {
			options[key] = value;
		}
	}

	// Validate required args
	if (!options.repo || !options.prNumber || !options.baseBranch) {
		console.error(`
Usage: bun run test:local -- --repo owner/repo --pr-number 123 --base-branch main [options]

Required:
  --repo              Repository in format owner/repo
  --pr-number         PR number to test
  --base-branch       Base branch name

Optional:
  --openai-api-key    OpenAI API key (or set OPENAI_API_KEY env var)
    `);
		process.exit(1);
	}

	return options as TestOptions;
}

function createEventFile(options: TestOptions): string {
	const [owner, repo] = options.repo.split('/');
	if (!owner || !repo) {
		throw new Error('Invalid repo format. Expected: owner/repo');
	}

	const eventDir = path.join(__dirname, '..', '.github', 'events');
	if (!fs.existsSync(eventDir)) {
		fs.mkdirSync(eventDir, { recursive: true });
	}

	const eventFile = path.join(eventDir, 'pull_request_closed.json');
	const eventData = {
		action: 'closed',
		pull_request: {
			number: Number(options.prNumber),
			merged: true,
			base: {
				ref: options.baseBranch,
			},
			head: {
				ref: 'test-branch',
			},
			title: 'Test PR Title',
			body: 'Test PR Body',
		},
		repository: {
			full_name: options.repo,
			owner: {
				login: owner,
			},
			name: repo,
		},
	};

	fs.writeFileSync(eventFile, JSON.stringify(eventData, null, 2));
	return eventFile;
}

function main() {
	try {
		const options = parseArgs();

		console.log('🧪 Setting up local test environment...');
		console.log(`   Repo: ${options.repo}`);
		console.log(`   PR: #${options.prNumber}`);
		console.log(`   Base Branch: ${options.baseBranch}`);

		// Create event file
		const eventFile = createEventFile(options);
		console.log(`\n✅ Created event file: ${eventFile}`);

		// Build the project
		console.log('\n📦 Building project...');
		execSync('bun run build', { stdio: 'inherit' });

		// Check if act is installed
		try {
			execSync('which act', { stdio: 'ignore' });
		} catch {
			console.log(`
⚠️  'act' is not installed. Install it to test locally:
   brew install act
   
   Or download from: https://github.com/nektos/act/releases
      `);
			return;
		}

		// Check for secrets file
		const secretsFile = path.join(__dirname, '..', '.secrets');
		if (!fs.existsSync(secretsFile)) {
			console.log(`
⚠️  Secrets file not found. Create it:
   cp .secrets.example .secrets
   # Edit .secrets with your tokens
      `);
		}

		console.log(`
✅ Setup complete! Now run:

   bun run act:test

Or manually:

   act pull_request -W .github/workflows/test-local.yml \\
     --eventpath ${eventFile} \\
     --secret-file .secrets

Note: Make sure you have:
  1. Docker running
  2. .secrets file with GITHUB_TOKEN and OPENAI_API_KEY
  3. A valid GitHub token with repo access
    `);
	} catch (error) {
		console.error('\n❌ Setup failed:', error);
		process.exit(1);
	}
}

main();
