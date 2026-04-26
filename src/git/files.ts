import * as github from '@actions/github';
import { getOctokit } from '@actions/github';

import { logger } from '../lib/logger';

export async function getChangedFilesForMergedPr(context: typeof github.context, token: string): Promise<string[]> {
	if (!context.payload.pull_request) {
		throw new Error('This action must be run in the context of a pull_request event');
	}

	const pullNumber = context.payload.pull_request.number;
	const owner = context.repo.owner;
	const repo = context.repo.repo;

	const octokit = getOctokit(token);

	logger.info(`Fetching changed files for PR #${pullNumber}`);

	const files: string[] = [];
	let page = 1;
	const perPage = 100;

	while (true) {
		const response = await octokit.rest.pulls.listFiles({
			owner,
			repo,
			pull_number: pullNumber,
			per_page: perPage,
			page,
		});

		if (response.data.length === 0) {
			break;
		}

		for (const file of response.data) {
			files.push(file.filename);
		}

		if (response.data.length < perPage) {
			break;
		}

		page++;
	}

	logger.info(`Found ${files.length} changed files`);

	return files;
}
