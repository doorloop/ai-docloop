import { describe, expect, it } from 'bun:test';

import { DocloopConfigError, validateAndNormalize } from '../validate';

const minimalValid = {
	version: 1,
	mappings: [
		{
			name: 'server-features',
			watch: ['apps/server/features/<FEATURE_NAME>/**'],
			readme: 'docs/wiki/insights/<FEATURE_NAME>-feature.md',
		},
	],
};

describe('validateAndNormalize', () => {
	describe('happy paths', () => {
		it('accepts a minimal valid config and applies all defaults', () => {
			const result = validateAndNormalize(minimalValid);
			expect(result.version).toBe(1);
			expect(result.prompt).toBeUndefined();
			expect(result.defaults).toEqual({
				detailLevel: 'medium',
				model: 'gpt-4o-mini',
				format: 'structured',
				onMissingReadme: 'create',
				exclude: [],
			});
			expect(result.triggers).toEqual({});
			expect(result.mappings).toHaveLength(1);
			expect(result.mappings[0]).toEqual({
				name: 'server-features',
				watch: ['apps/server/features/<FEATURE_NAME>/**'],
				readme: 'docs/wiki/insights/<FEATURE_NAME>-feature.md',
			});
		});

		it('parses a full config with all sections present', () => {
			const result = validateAndNormalize({
				version: 1,
				prompt: 'docs/docloop/prompt.md',
				defaults: {
					detail_level: 'high',
					model: 'gpt-4o',
					format: 'freeform',
					on_missing_readme: 'skip',
					exclude: ['**/*.test.ts'],
				},
				triggers: {
					pr_merged: {
						enabled: true,
						base_branches: ['main', 'release/*'],
						delivery: 'pr',
						commit_message: 'docs: bump readmes',
					},
					pr_opened: {
						enabled: true,
						base_branches: ['main'],
						delivery: 'pr_branch_commit',
						commit_message: 'docs: sync readmes',
					},
					workflow_dispatch: {
						enabled: true,
						delivery: 'direct_commit',
						base_branch: 'develop',
					},
				},
				mappings: [
					{
						name: 'server-features',
						watch: ['apps/server/features/<FEATURE_NAME>/**'],
						readme: 'docs/wiki/insights/<FEATURE_NAME>-feature.md',
						prompt: 'docs/docloop/prompts/server.md',
						detail_level: 'high',
						model: 'gpt-4o',
						format: 'structured',
						on_missing_readme: 'create',
						exclude: ['**/__snapshots__/**'],
					},
				],
			});
			expect(result.prompt).toBe('docs/docloop/prompt.md');
			expect(result.defaults.detailLevel).toBe('high');
			expect(result.defaults.exclude).toEqual(['**/*.test.ts']);
			expect(result.triggers.prMerged).toEqual({
				type: 'pr_merged',
				enabled: true,
				baseBranches: ['main', 'release/*'],
				delivery: 'pr',
				commitMessage: 'docs: bump readmes',
			});
			expect(result.triggers.prOpened).toEqual({
				type: 'pr_opened',
				enabled: true,
				baseBranches: ['main'],
				delivery: 'pr_branch_commit',
				commitMessage: 'docs: sync readmes',
			});
			expect(result.triggers.workflowDispatch).toEqual({
				type: 'workflow_dispatch',
				enabled: true,
				delivery: 'direct_commit',
				baseBranch: 'develop',
			});
			expect(result.mappings[0]).toEqual({
				name: 'server-features',
				watch: ['apps/server/features/<FEATURE_NAME>/**'],
				readme: 'docs/wiki/insights/<FEATURE_NAME>-feature.md',
				prompt: 'docs/docloop/prompts/server.md',
				detailLevel: 'high',
				model: 'gpt-4o',
				format: 'structured',
				onMissingReadme: 'create',
				exclude: ['**/__snapshots__/**'],
			});
		});

		it('accepts multi-capture watch entries', () => {
			const result = validateAndNormalize({
				version: 1,
				mappings: [
					{
						name: 'app-features',
						watch: ['apps/<APP>/features/<FEATURE_NAME>/**'],
						readme: 'docs/<APP>/<FEATURE_NAME>.md',
					},
				],
			});
			expect(result.mappings[0].watch).toEqual(['apps/<APP>/features/<FEATURE_NAME>/**']);
			expect(result.mappings[0].readme).toBe('docs/<APP>/<FEATURE_NAME>.md');
		});

		it('accepts watch entries that share an identical placeholder set', () => {
			const result = validateAndNormalize({
				version: 1,
				mappings: [
					{
						name: 'monorepo-features',
						watch: ['apps/server/features/<FEATURE_NAME>/**', 'apps/client/features/<FEATURE_NAME>/**'],
						readme: 'docs/wiki/<FEATURE_NAME>.md',
					},
				],
			});
			expect(result.mappings[0].watch).toHaveLength(2);
		});

		it('defaults pr_merged.enabled to true when only pr_merged section is present', () => {
			const result = validateAndNormalize({
				version: 1,
				triggers: { pr_merged: {} },
				mappings: minimalValid.mappings,
			});
			expect(result.triggers.prMerged?.enabled).toBe(true);
			expect(result.triggers.prMerged?.delivery).toBe('direct_commit');
			expect(result.triggers.prMerged?.commitMessage).toBe('docs: update READMEs [skip ci]');
		});

		it('defaults pr_opened.enabled to false', () => {
			const result = validateAndNormalize({
				version: 1,
				triggers: { pr_opened: {} },
				mappings: minimalValid.mappings,
			});
			expect(result.triggers.prOpened?.enabled).toBe(false);
			expect(result.triggers.prOpened?.delivery).toBe('pr_comment');
		});

		it('defaults workflow_dispatch.delivery to pr and base_branch to main', () => {
			const result = validateAndNormalize({
				version: 1,
				triggers: { workflow_dispatch: {} },
				mappings: minimalValid.mappings,
			});
			expect(result.triggers.workflowDispatch?.delivery).toBe('pr');
			expect(result.triggers.workflowDispatch?.baseBranch).toBe('main');
		});
	});

	describe('structural failures', () => {
		it('rejects non-object root', () => {
			expect(() => validateAndNormalize('hello')).toThrow(DocloopConfigError);
			expect(() => validateAndNormalize(['a', 'b'])).toThrow(DocloopConfigError);
			expect(() => validateAndNormalize(null)).toThrow(DocloopConfigError);
		});

		it('rejects version != 1', () => {
			expect(() => validateAndNormalize({ ...minimalValid, version: 2 })).toThrow(/version must be 1/);
			expect(() => validateAndNormalize({ ...minimalValid, version: undefined })).toThrow(/version must be 1/);
			expect(() => validateAndNormalize({ ...minimalValid, version: '1' })).toThrow(/version must be 1/);
		});

		it('rejects missing mappings', () => {
			expect(() => validateAndNormalize({ version: 1 })).toThrow(/mappings must be a sequence/);
		});

		it('rejects empty mappings array', () => {
			expect(() => validateAndNormalize({ version: 1, mappings: [] })).toThrow(/at least one mapping/);
		});

		it('rejects mapping with missing name', () => {
			expect(() =>
				validateAndNormalize({
					version: 1,
					mappings: [{ watch: ['apps/<F>/**'], readme: '<F>.md' }],
				}),
			).toThrow(/mappings\[0\]\.name must be a string/);
		});

		it('rejects mapping with empty watch', () => {
			expect(() =>
				validateAndNormalize({
					version: 1,
					mappings: [{ name: 'x', watch: [], readme: 'r.md' }],
				}),
			).toThrow(/at least one entry/);
		});

		it('rejects duplicate mapping names', () => {
			expect(() =>
				validateAndNormalize({
					version: 1,
					mappings: [
						{ name: 'dup', watch: ['a/**'], readme: 'a.md' },
						{ name: 'dup', watch: ['b/**'], readme: 'b.md' },
					],
				}),
			).toThrow(/duplicate mapping name "dup"/);
		});

		it('rejects mappings that target the same readme path', () => {
			expect(() =>
				validateAndNormalize({
					version: 1,
					mappings: [
						{ name: 'a', watch: ['a/**'], readme: 'docs/x.md' },
						{ name: 'b', watch: ['b/**'], readme: 'docs/x.md' },
					],
				}),
			).toThrow(/both target docs\/x\.md/);
		});
	});

	describe('placeholder grammar', () => {
		it('rejects placeholder mismatch across watch entries within the same mapping', () => {
			expect(() =>
				validateAndNormalize({
					version: 1,
					mappings: [
						{
							name: 'mismatch',
							watch: ['apps/<FOO>/**', 'apps/<BAR>/**'],
							readme: '<FOO>.md',
						},
					],
				}),
			).toThrow(/all watch entries in a mapping must declare the same placeholder names/);
		});

		it('rejects placeholders in readme that are not declared in any watch entry', () => {
			expect(() =>
				validateAndNormalize({
					version: 1,
					mappings: [
						{
							name: 'undeclared',
							watch: ['apps/server/features/<FEATURE_NAME>/**'],
							readme: 'docs/<UNKNOWN>/<FEATURE_NAME>.md',
						},
					],
				}),
			).toThrow(/<UNKNOWN> which is not declared/);
		});

		it('accepts a mapping with no placeholders at all', () => {
			const result = validateAndNormalize({
				version: 1,
				mappings: [{ name: 'plain', watch: ['apps/admin/**'], readme: 'docs/admin.md' }],
			});
			expect(result.mappings[0].watch).toEqual(['apps/admin/**']);
		});
	});

	describe('path safety', () => {
		it('rejects ".." in watch', () => {
			expect(() =>
				validateAndNormalize({
					version: 1,
					mappings: [{ name: 'evil', watch: ['../etc/passwd'], readme: 'r.md' }],
				}),
			).toThrow(/must not contain ".." segments/);
		});

		it('rejects absolute readme paths', () => {
			expect(() =>
				validateAndNormalize({
					version: 1,
					mappings: [{ name: 'evil', watch: ['apps/**'], readme: '/etc/passwd' }],
				}),
			).toThrow(/must be a repo-relative path/);
		});

		it('rejects ".." in mapping prompt', () => {
			expect(() =>
				validateAndNormalize({
					version: 1,
					mappings: [
						{
							name: 'x',
							watch: ['apps/**'],
							readme: 'r.md',
							prompt: '../leak.md',
						},
					],
				}),
			).toThrow(/must not contain ".." segments/);
		});
	});

	describe('enum validation', () => {
		it('rejects bad detail_level', () => {
			expect(() =>
				validateAndNormalize({
					version: 1,
					defaults: { detail_level: 'medium-rare' },
					mappings: minimalValid.mappings,
				}),
			).toThrow(/defaults\.detail_level must be one of low \| medium \| high/);
		});

		it('rejects pr_merged.delivery=pr_comment (allowed only on pr_opened)', () => {
			expect(() =>
				validateAndNormalize({
					version: 1,
					triggers: { pr_merged: { delivery: 'pr_comment' } },
					mappings: minimalValid.mappings,
				}),
			).toThrow(/triggers\.pr_merged\.delivery must be one of direct_commit \| pr/);
		});

		it('rejects pr_opened.delivery=direct_commit (allowed only on pr_merged or workflow_dispatch)', () => {
			expect(() =>
				validateAndNormalize({
					version: 1,
					triggers: { pr_opened: { delivery: 'direct_commit' } },
					mappings: minimalValid.mappings,
				}),
			).toThrow(/triggers\.pr_opened\.delivery must be one of pr_comment \| pr_branch_commit/);
		});

		it('rejects workflow_dispatch.delivery=pr_comment', () => {
			expect(() =>
				validateAndNormalize({
					version: 1,
					triggers: { workflow_dispatch: { delivery: 'pr_comment' } },
					mappings: minimalValid.mappings,
				}),
			).toThrow(/triggers\.workflow_dispatch\.delivery must be one of direct_commit \| pr/);
		});

		it('rejects bad mapping format', () => {
			expect(() =>
				validateAndNormalize({
					version: 1,
					mappings: [
						{
							name: 'x',
							watch: ['apps/**'],
							readme: 'r.md',
							format: 'plaintext',
						},
					],
				}),
			).toThrow(/mappings\[0\]\.format must be one of structured \| freeform/);
		});
	});
});
