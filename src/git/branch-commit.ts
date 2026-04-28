import { exec } from '@actions/exec';

import { logger } from '../lib/logger';

export async function commitToBranch(updatedFiles: string[], commitMessage: string, branchRef: string): Promise<void> {
	if (updatedFiles.length === 0) {
		logger.info('No files to commit');
		return;
	}

	await exec('git', ['fetch', 'origin', branchRef]);
	await exec('git', ['checkout', branchRef]);

	await exec('git', ['config', 'user.name', 'github-actions[bot]']);
	await exec('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com']);

	for (const file of updatedFiles) {
		// Sequential add: git's index file is shared per repo, parallel adds
		// race on the lock file.
		// eslint-disable-next-line no-await-in-loop
		await exec('git', ['add', file]);
	}

	const exitCode = await exec('git', ['diff', '--cached', '--quiet'], { ignoreReturnCode: true });
	const hasChanges = exitCode !== 0;
	if (!hasChanges) {
		logger.info('No staged changes to commit on branch');
		return;
	}

	await exec('git', ['commit', '-m', commitMessage]);
	logger.info(`Committed ${updatedFiles.length} file(s) to ${branchRef}`);

	await exec('git', ['push', 'origin', `HEAD:${branchRef}`]);
	logger.info(`Pushed updates to ${branchRef}`);
}
