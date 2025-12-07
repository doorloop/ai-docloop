import { exec } from '@actions/exec';
import * as github from '@actions/github';
import { getOctokit } from '@actions/github';
import { logger } from '../lib/logger';

function generateBranchName(): string {
  const randomId = Math.random().toString(36).substring(2, 8);
  return `ai-docs/${randomId}`;
}

export async function commitAndPush(
  updatedFiles: string[],
  commitMessage: string,
  createPr: boolean,
  context: typeof github.context,
  token: string,
): Promise<void> {
  if (updatedFiles.length === 0) {
    logger.info('No files to commit');
    return;
  }
  
  // Get base branch
  const baseBranch = context.payload.pull_request?.base?.ref;
  if (!baseBranch) {
    throw new Error('Could not determine base branch');
  }
  
  // Ensure we're on the base branch
  await exec('git', ['checkout', baseBranch]);
  
  // Configure git user
  await exec('git', ['config', 'user.name', 'github-actions[bot]']);
  await exec('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com']);
  
  // Stage all updated files
  for (const file of updatedFiles) {
    await exec('git', ['add', file]);
  }
  
  // Check if there are any staged changes
  const exitCode = await exec('git', ['diff', '--cached', '--quiet'], {
    ignoreReturnCode: true,
  });
  
  // git diff --cached --quiet returns 0 if no changes, non-zero if changes exist
  const hasChanges = exitCode !== 0;
  
  if (!hasChanges) {
    logger.info('No staged changes to commit');
    return;
  }
  
  // Commit changes
  await exec('git', ['commit', '-m', commitMessage]);
  logger.info(`Committed ${updatedFiles.length} file(s) with message: ${commitMessage}`);
  
  if (createPr) {
    // Create a new branch from current base branch
    const branchName = generateBranchName();
    await exec('git', ['checkout', '-b', branchName]);
    
    // Push to new branch
    await exec('git', ['push', '--set-upstream', 'origin', branchName]);
    logger.info(`Pushed changes to branch: ${branchName}`);
    
    // Create PR
    const octokit = getOctokit(token);
    
    const pr = await octokit.rest.pulls.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      title: 'docs: update READMEs via AI',
      head: branchName,
      base: baseBranch,
      body: 'This PR was automatically created to update README files based on recent changes.',
    });
    
    logger.info(`Created PR #${pr.data.number}: ${pr.data.html_url}`);
  } else {
    // Push directly to the base branch (we're already on it)
    await exec('git', ['push', 'origin', baseBranch]);
    logger.info(`Pushed changes directly to ${baseBranch}`);
  }
}

