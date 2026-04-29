import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { MappingIntent } from '../../types';

mock.module('../logger', () => ({
	logger: {
		debug: mock(),
		info: mock(),
		warning: mock(),
		error: mock(),
		setFailed: mock(),
	},
}));

const { resolveCandidatesByFrontmatter } = await import('../readme-candidates');

let workspace = '';

beforeEach(async () => {
	workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'docloop-candidates-'));
});

afterEach(async () => {
	await fs.rm(workspace, { recursive: true, force: true });
});

async function writeFile(rel: string, content: string): Promise<string> {
	const abs = path.join(workspace, rel);
	await fs.mkdir(path.dirname(abs), { recursive: true });
	await fs.writeFile(abs, content);
	return abs;
}

function makeIntent(overrides: Partial<MappingIntent> = {}): MappingIntent {
	return {
		name: 'test',
		watch: ['apps/server/src/features/<F>/**'],
		readmeCandidates: 'docs/insights/*-feature.md',
		detailLevel: 'medium',
		format: 'freeform',
		onMissingReadme: 'skip',
		exclude: [],
		commitMessage: 'docs: update [skip ci]',
		requestReviewFromPrAuthor: true,
		openaiApiKey: 'test-key',
		openaiModel: 'gpt-4o-mini',
		...overrides,
	};
}

describe('resolveCandidatesByFrontmatter', () => {
	it('routes a changed file to every candidate whose paths cover it', async () => {
		const cwd = process.cwd();
		try {
			process.chdir(workspace);

			await writeFile(
				'docs/insights/inspections-feature.md',
				`---
title: Inspections (Server)
paths:
  - apps/server/src/features/inspections/**
---

body
`,
			);
			await writeFile(
				'docs/insights/inspections-client-feature.md',
				`---
title: Inspections (Client)
paths:
  - apps/client/src/features/inspections/**
---

body
`,
			);
			await writeFile(
				'docs/insights/cash-payments-feature.md',
				`---
title: Cash Payments
paths:
  - apps/server/src/features/cashPayments/**
  - apps/server/src/constants/cashPayments.ts
---

body
`,
			);
			// Distractor files that should be filtered out by the candidates glob.
			await writeFile('docs/insights/PROMPT.md', '# prompt');
			await writeFile('docs/insights/flagged-issues.md', '# flagged');

			const allRepoFiles = [
				'docs/insights/inspections-feature.md',
				'docs/insights/inspections-client-feature.md',
				'docs/insights/cash-payments-feature.md',
				'docs/insights/PROMPT.md',
				'docs/insights/flagged-issues.md',
			];
			const changedFiles = ['apps/server/src/features/inspections/inspections.controller.ts', 'apps/server/src/constants/cashPayments.ts'];

			const targets = await resolveCandidatesByFrontmatter({
				intent: makeIntent(),
				candidatesGlob: 'docs/insights/*-feature.md',
				allRepoFiles,
				changedFiles,
			});

			const paths = targets.map((t) => t.targetPath).toSorted();
			expect(paths).toEqual(['docs/insights/cash-payments-feature.md', 'docs/insights/inspections-feature.md']);

			const inspections = targets.find((t) => t.targetPath === 'docs/insights/inspections-feature.md');
			expect(inspections?.changedFiles).toEqual(['apps/server/src/features/inspections/inspections.controller.ts']);
			expect(inspections?.captures.FEATURE_NAME).toBe('Inspections (Server)');

			const cashPayments = targets.find((t) => t.targetPath === 'docs/insights/cash-payments-feature.md');
			expect(cashPayments?.changedFiles).toEqual(['apps/server/src/constants/cashPayments.ts']);
		} finally {
			process.chdir(cwd);
		}
	});

	it('routes a single changed file to multiple candidates when their paths overlap', async () => {
		const cwd = process.cwd();
		try {
			process.chdir(workspace);
			await writeFile(
				'docs/insights/server-feature.md',
				`---
title: Server
paths:
  - apps/server/**
---
`,
			);
			await writeFile(
				'docs/insights/inspections-feature.md',
				`---
title: Inspections
paths:
  - apps/server/src/features/inspections/**
---
`,
			);

			const targets = await resolveCandidatesByFrontmatter({
				intent: makeIntent(),
				candidatesGlob: 'docs/insights/*-feature.md',
				allRepoFiles: ['docs/insights/server-feature.md', 'docs/insights/inspections-feature.md'],
				changedFiles: ['apps/server/src/features/inspections/inspection.service.ts'],
			});

			const paths = targets.map((t) => t.targetPath).toSorted();
			expect(paths).toEqual(['docs/insights/inspections-feature.md', 'docs/insights/server-feature.md']);
		} finally {
			process.chdir(cwd);
		}
	});

	it('skips candidates that lack frontmatter or have no paths declaration', async () => {
		const cwd = process.cwd();
		try {
			process.chdir(workspace);
			await writeFile('docs/insights/no-frontmatter-feature.md', '# just a body, no frontmatter\n');
			await writeFile(
				'docs/insights/empty-paths-feature.md',
				`---
title: Empty
paths: []
---
`,
			);
			await writeFile(
				'docs/insights/good-feature.md',
				`---
title: Good
paths:
  - apps/server/foo/**
---
`,
			);

			const targets = await resolveCandidatesByFrontmatter({
				intent: makeIntent(),
				candidatesGlob: 'docs/insights/*-feature.md',
				allRepoFiles: ['docs/insights/no-frontmatter-feature.md', 'docs/insights/empty-paths-feature.md', 'docs/insights/good-feature.md'],
				changedFiles: ['apps/server/foo/index.ts'],
			});

			expect(targets).toHaveLength(1);
			expect(targets[0].targetPath).toBe('docs/insights/good-feature.md');
		} finally {
			process.chdir(cwd);
		}
	});

	it('respects intent.exclude when matching changed files', async () => {
		const cwd = process.cwd();
		try {
			process.chdir(workspace);
			await writeFile(
				'docs/insights/foo-feature.md',
				`---
title: F
paths:
  - apps/server/src/features/foo/**
---
`,
			);

			const targets = await resolveCandidatesByFrontmatter({
				intent: makeIntent({ exclude: ['**/*.test.ts'] }),
				candidatesGlob: 'docs/insights/*-feature.md',
				allRepoFiles: ['docs/insights/foo-feature.md'],
				changedFiles: ['apps/server/src/features/foo/foo.service.ts', 'apps/server/src/features/foo/foo.test.ts'],
			});

			expect(targets).toHaveLength(1);
			expect(targets[0].changedFiles).toEqual(['apps/server/src/features/foo/foo.service.ts']);
		} finally {
			process.chdir(cwd);
		}
	});

	it('returns empty when the candidates glob matches nothing', async () => {
		const targets = await resolveCandidatesByFrontmatter({
			intent: makeIntent(),
			candidatesGlob: 'docs/missing/*-feature.md',
			allRepoFiles: ['docs/insights/some.md'],
			changedFiles: ['apps/server/anywhere.ts'],
		});
		expect(targets).toEqual([]);
	});

	it('returns empty when no candidate covers any changed file', async () => {
		const cwd = process.cwd();
		try {
			process.chdir(workspace);
			await writeFile(
				'docs/insights/foo-feature.md',
				`---
title: F
paths:
  - apps/server/src/features/foo/**
---
`,
			);

			const targets = await resolveCandidatesByFrontmatter({
				intent: makeIntent(),
				candidatesGlob: 'docs/insights/*-feature.md',
				allRepoFiles: ['docs/insights/foo-feature.md'],
				changedFiles: ['apps/client/anywhere.ts'],
			});
			expect(targets).toEqual([]);
		} finally {
			process.chdir(cwd);
		}
	});
});
