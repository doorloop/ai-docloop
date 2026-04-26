import { beforeEach, describe, expect, it, mock, type Mock } from 'bun:test';

import * as core from '@actions/core';

import { getConfig } from '../parser';

const getInputMock = mock();

mock.module('@actions/core', () => ({
	getInput: getInputMock,
}));

mock.module('../../lib/logger', () => ({
	logger: {
		warning: mock(),
	},
}));

describe('config parser', () => {
	beforeEach(() => {
		getInputMock.mockReset();
	});

	it('should parse required inputs', () => {
		(core.getInput as Mock<typeof core.getInput>).mockImplementation((name: string) => {
			const inputs: Record<string, string> = {
				base_branches: 'main,develop',
				path_scopes: 'apps/**',
				openai_api_key: 'test-key',
			};
			return inputs[name] || '';
		});

		const config = getConfig();

		expect(config.baseBranches).toEqual(['main', 'develop']);
		expect(config.pathScopes).toEqual(['apps/**']);
		expect(config.openaiApiKey).toBe('test-key');
	});

	it('should use default values', () => {
		(core.getInput as Mock<typeof core.getInput>).mockImplementation((name: string) => {
			const inputs: Record<string, string> = {
				base_branches: 'main',
				path_scopes: 'apps/**',
				openai_api_key: 'test-key',
			};
			return inputs[name] || '';
		});

		const config = getConfig();

		expect(config.readmeFilename).toBe('README.md');
		expect(config.detailLevel).toBe('medium');
		expect(config.openaiModel).toBe('gpt-4o-mini');
		expect(config.updateMode).toBe('update');
		expect(config.commitMessage).toBe('docs: update READMEs [skip ci]');
		expect(config.createPr).toBe(false);
	});

	it('should parse newline-separated arrays', () => {
		(core.getInput as Mock<typeof core.getInput>).mockImplementation((name: string) => {
			const inputs: Record<string, string> = {
				base_branches: 'main\ndevelop\nrelease/*',
				path_scopes: 'apps/**\npackages/**',
				openai_api_key: 'test-key',
			};
			return inputs[name] || '';
		});

		const config = getConfig();

		expect(config.baseBranches).toEqual(['main', 'develop', 'release/*']);
		expect(config.pathScopes).toEqual(['apps/**', 'packages/**']);
	});

	it('should parse boolean values', () => {
		(core.getInput as Mock<typeof core.getInput>).mockImplementation((name: string) => {
			const inputs: Record<string, string> = {
				base_branches: 'main',
				path_scopes: 'apps/**',
				openai_api_key: 'test-key',
				create_pr: 'true',
			};
			return inputs[name] || '';
		});

		const config = getConfig();

		expect(config.createPr).toBe(true);
	});

	it('should throw error for missing required inputs', () => {
		(core.getInput as Mock<typeof core.getInput>).mockImplementation(() => '');

		expect(() => getConfig()).toThrow();
	});
});
