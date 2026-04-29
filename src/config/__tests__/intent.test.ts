import { beforeEach, describe, expect, it, mock, type Mock } from 'bun:test';

import * as core from '@actions/core';

mock.module('@actions/core', () => ({
	getInput: mock(),
}));

mock.module('../../lib/logger', () => ({
	logger: {
		debug: mock(),
		info: mock(),
		warning: mock(),
		error: mock(),
		setFailed: mock(),
	},
}));

const { getMappingIntent, InputError } = await import('../intent');

function setInputs(inputs: Record<string, string>): void {
	(core.getInput as Mock<typeof core.getInput>).mockImplementation((name: string, opts?: { required?: boolean }) => {
		const value = inputs[name];
		if (value === undefined) {
			if (opts?.required) {
				throw new Error(`Input required and not supplied: ${name}`);
			}
			return '';
		}
		return value;
	});
}

beforeEach(() => {
	(core.getInput as Mock<typeof core.getInput>).mockReset();
});

describe('getMappingIntent — required inputs', () => {
	it('throws when openai_api_key is missing', () => {
		setInputs({ watch: 'apps/**', readme: 'docs/x.md' });
		expect(() => getMappingIntent()).toThrow(/openai_api_key/);
	});

	it('throws when watch is missing', () => {
		setInputs({ openai_api_key: 'k', readme: 'docs/x.md' });
		expect(() => getMappingIntent()).toThrow(/watch/);
	});

	it('throws when both readme and readme_candidates are missing', () => {
		setInputs({ openai_api_key: 'k', watch: 'apps/**' });
		expect(() => getMappingIntent()).toThrow(/exactly one/);
	});

	it('throws when both readme and readme_candidates are set', () => {
		setInputs({ openai_api_key: 'k', watch: 'apps/<F>/**', readme: 'docs/<F>.md', readme_candidates: 'docs/insights/*-feature.md' });
		expect(() => getMappingIntent()).toThrow(/mutually exclusive/);
	});
});

describe('getMappingIntent — readme_candidates mode', () => {
	it('accepts a static glob with no placeholders', () => {
		setInputs({ openai_api_key: 'k', watch: 'apps/**', readme_candidates: 'docs/insights/*-feature.md' });
		const intent = getMappingIntent();
		expect(intent.readmeCandidates).toBe('docs/insights/*-feature.md');
		expect(intent.readme).toBeUndefined();
	});

	it('rejects placeholders in readme_candidates', () => {
		setInputs({ openai_api_key: 'k', watch: 'apps/<F>/**', readme_candidates: 'docs/<F>-feature.md' });
		expect(() => getMappingIntent()).toThrow(/must not contain/);
	});

	it('does not require watch placeholders to match anything in readme_candidates', () => {
		setInputs({ openai_api_key: 'k', watch: 'apps/server/<MODULE>/**', readme_candidates: 'docs/insights/*.md' });
		expect(() => getMappingIntent()).not.toThrow();
	});
});

describe('getMappingIntent — list parsing', () => {
	it('splits watch on newlines and commas, trimming and dropping empties', () => {
		setInputs({
			openai_api_key: 'k',
			watch: 'apps/server/<F>/**\napps/client/<F>/**, libs/<F>/**\n',
			readme: 'docs/<F>.md',
		});
		const intent = getMappingIntent();
		expect(intent.watch).toEqual(['apps/server/<F>/**', 'apps/client/<F>/**', 'libs/<F>/**']);
	});

	it('splits exclude the same way', () => {
		setInputs({
			openai_api_key: 'k',
			watch: 'apps/<F>/**',
			readme: 'docs/<F>.md',
			exclude: '**/*.test.ts\n**/__tests__/**',
		});
		const intent = getMappingIntent();
		expect(intent.exclude).toEqual(['**/*.test.ts', '**/__tests__/**']);
	});

	it('returns empty exclude when the input is empty', () => {
		setInputs({ openai_api_key: 'k', watch: 'apps/<F>/**', readme: 'docs/<F>.md' });
		const intent = getMappingIntent();
		expect(intent.exclude).toEqual([]);
	});
});

describe('getMappingIntent — defaults and overrides', () => {
	it('applies defaults when optional knobs are unset', () => {
		setInputs({ openai_api_key: 'k', watch: 'apps/<F>/**', readme: 'docs/<F>.md' });
		const intent = getMappingIntent();
		expect(intent.openaiModel).toBe('gpt-4o-mini');
		expect(intent.detailLevel).toBe('medium');
		expect(intent.format).toBe('structured');
		expect(intent.onMissingReadme).toBe('create');
		expect(intent.delivery).toBeUndefined();
		expect(intent.commitMessage).toBe('docs: update [skip ci]');
		expect(intent.promptFile).toBeUndefined();
		expect(intent.prTitle).toBeUndefined();
		expect(intent.requestReviewFromPrAuthor).toBe(true);
	});

	it('honors all overrides', () => {
		setInputs({
			openai_api_key: 'k',
			openai_model: 'gpt-4o',
			watch: 'apps/<F>/**',
			readme: 'docs/<F>.md',
			prompt_file: 'docs/prompts/server.md',
			detail_level: 'high',
			format: 'freeform',
			on_missing_readme: 'skip',
			delivery: 'pr',
			commit_message: 'docs: regenerated [skip ci]',
			pr_title: '📚 docs: update wiki insights',
			request_review_from_pr_author: 'false',
			name: 'server-features',
		});
		const intent = getMappingIntent();
		expect(intent.openaiModel).toBe('gpt-4o');
		expect(intent.promptFile).toBe('docs/prompts/server.md');
		expect(intent.detailLevel).toBe('high');
		expect(intent.format).toBe('freeform');
		expect(intent.onMissingReadme).toBe('skip');
		expect(intent.delivery).toBe('pr');
		expect(intent.commitMessage).toBe('docs: regenerated [skip ci]');
		expect(intent.prTitle).toBe('📚 docs: update wiki insights');
		expect(intent.requestReviewFromPrAuthor).toBe(false);
		expect(intent.name).toBe('server-features');
	});

	it('treats request_review_from_pr_author as a strict opt-out (only the literal "false" disables)', () => {
		setInputs({
			openai_api_key: 'k',
			watch: 'apps/<F>/**',
			readme: 'docs/<F>.md',
			request_review_from_pr_author: 'no',
		});
		expect(getMappingIntent().requestReviewFromPrAuthor).toBe(true);
	});

	it('derives a name from watch + readme when name is not provided', () => {
		setInputs({ openai_api_key: 'k', watch: 'apps/<F>/**', readme: 'docs/<F>.md' });
		const intent = getMappingIntent();
		expect(intent.name).toBe('apps/<F>/** → docs/<F>.md');
	});
});

describe('getMappingIntent — placeholder consistency', () => {
	it('rejects readme placeholders not declared in any watch entry', () => {
		setInputs({
			openai_api_key: 'k',
			watch: 'apps/<F>/**',
			readme: 'docs/<UNKNOWN>.md',
		});
		expect(() => getMappingIntent()).toThrow(InputError);
		expect(() => getMappingIntent()).toThrow(/<UNKNOWN>/);
	});

	it('rejects watch entries that disagree on placeholders', () => {
		setInputs({
			openai_api_key: 'k',
			watch: 'apps/<F>/**\nlibs/<X>/**',
			readme: 'docs/<F>.md',
		});
		expect(() => getMappingIntent()).toThrow(InputError);
	});

	it('accepts watch entries that share the same placeholders', () => {
		setInputs({
			openai_api_key: 'k',
			watch: 'apps/<F>/**\nlibs/<F>/**',
			readme: 'docs/<F>.md',
		});
		const intent = getMappingIntent();
		expect(intent.watch).toHaveLength(2);
	});
});

describe('getMappingIntent — enum + path safety', () => {
	it('rejects invalid detail_level', () => {
		setInputs({ openai_api_key: 'k', watch: 'apps/<F>/**', readme: 'docs/<F>.md', detail_level: 'extreme' });
		expect(() => getMappingIntent()).toThrow(InputError);
	});

	it('rejects invalid format', () => {
		setInputs({ openai_api_key: 'k', watch: 'apps/<F>/**', readme: 'docs/<F>.md', format: 'yaml' });
		expect(() => getMappingIntent()).toThrow(InputError);
	});

	it('rejects invalid delivery', () => {
		setInputs({ openai_api_key: 'k', watch: 'apps/<F>/**', readme: 'docs/<F>.md', delivery: 'fax' });
		expect(() => getMappingIntent()).toThrow(InputError);
	});

	it('rejects ".." segments in paths', () => {
		setInputs({ openai_api_key: 'k', watch: '../escape/**', readme: 'docs/x.md' });
		expect(() => getMappingIntent()).toThrow(/"\.\."/);
	});

	it('rejects absolute paths', () => {
		setInputs({ openai_api_key: 'k', watch: 'apps/**', readme: '/etc/passwd' });
		expect(() => getMappingIntent()).toThrow(/absolute/);
	});
});
