import * as github from '@actions/github';
import { getOctokit } from '@actions/github';

import { logger } from '../lib/logger';

const SIGNATURE_PREFIX = '<!-- docloop:summary';

export interface MappingPreview {
	targetPath: string;
	existing: string | undefined;
	proposed: string;
	skip: boolean;
	skipReason?: string;
}

function buildSignature(mappingName: string): string {
	const safe = mappingName.replace(/-->/g, '--&gt;');
	return `${SIGNATURE_PREFIX}:${safe} -->`;
}

export function renderPreviewBody(mappingName: string, previews: MappingPreview[]): string {
	const sections: string[] = [buildSignature(mappingName), `## 📚 DocLoop AI — proposed updates for \`${mappingName}\``, ''];

	const updates = previews.filter((p) => !p.skip);
	const skips = previews.filter((p) => p.skip);

	if (updates.length === 0 && skips.length === 0) {
		sections.push('No files in this PR matched this mapping.');
		return sections.join('\n');
	}

	sections.push(`This is a preview only — nothing has been written to the repository.`);
	sections.push('');

	if (updates.length > 0) {
		sections.push(`### ✏️ ${updates.length} update(s) suggested`);
		sections.push('');
		for (const preview of updates) {
			sections.push(`#### \`${preview.targetPath}\` (${preview.existing === undefined ? 'new file' : 'update'})`);
			sections.push('');
			sections.push('<details><summary>Proposed content</summary>');
			sections.push('');
			sections.push('```markdown');
			sections.push(preview.proposed);
			sections.push('```');
			sections.push('');
			sections.push('</details>');
			sections.push('');
		}
	}

	if (skips.length > 0) {
		sections.push(`### 🟰 ${skips.length} target(s) skipped`);
		sections.push('');
		for (const preview of skips) {
			sections.push(`- \`${preview.targetPath}\` — ${preview.skipReason ?? 'no update needed'}`);
		}
		sections.push('');
	}

	return sections.join('\n');
}

export async function postOrUpdateMappingComment(
	mappingName: string,
	prNumber: number,
	body: string,
	context: typeof github.context,
	token: string,
): Promise<void> {
	const octokit = getOctokit(token);
	const owner = context.repo.owner;
	const repo = context.repo.repo;
	const signature = buildSignature(mappingName);

	const existing = await findExistingComment(octokit, owner, repo, prNumber, signature);

	if (existing) {
		await octokit.rest.issues.updateComment({
			owner,
			repo,
			comment_id: existing.id,
			body,
		});
		logger.info(`Updated DocLoop preview comment #${existing.id} for mapping "${mappingName}" on PR #${prNumber}`);
		return;
	}

	const created = await octokit.rest.issues.createComment({
		owner,
		repo,
		issue_number: prNumber,
		body,
	});
	logger.info(`Created DocLoop preview comment #${created.data.id} for mapping "${mappingName}" on PR #${prNumber}`);
}

async function findExistingComment(
	octokit: ReturnType<typeof getOctokit>,
	owner: string,
	repo: string,
	prNumber: number,
	signature: string,
): Promise<{ id: number } | null> {
	let page = 1;
	const perPage = 100;
	while (true) {
		// Sequential pagination is unavoidable: we don't know whether this page
		// is the last until we've seen its length.
		// eslint-disable-next-line no-await-in-loop
		const response = await octokit.rest.issues.listComments({
			owner,
			repo,
			issue_number: prNumber,
			per_page: perPage,
			page,
		});
		for (const comment of response.data) {
			if (typeof comment.body === 'string' && comment.body.includes(signature)) {
				return { id: comment.id };
			}
		}
		if (response.data.length < perPage) {
			return null;
		}
		page++;
	}
}
