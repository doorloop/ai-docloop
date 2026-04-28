import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { DocloopConfigError } from '../validate';

mock.module('../../lib/logger', () => ({
	logger: {
		debug: mock(),
		info: mock(),
		warning: mock(),
		error: mock(),
		setFailed: mock(),
	},
}));

const { loadDocloopConfig } = await import('../loader');

let tempDir = '';

beforeEach(async () => {
	tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docloop-loader-test-'));
});

afterEach(async () => {
	await fs.rm(tempDir, { recursive: true, force: true });
});

describe('loadDocloopConfig', () => {
	it('returns null when the file does not exist', async () => {
		const result = await loadDocloopConfig(path.join(tempDir, 'missing.yml'));
		expect(result).toBeNull();
	});

	it('parses a valid YAML config and returns a normalized DocloopConfig', async () => {
		const file = path.join(tempDir, '.docloop.yml');
		await fs.writeFile(
			file,
			`version: 1
prompt: docs/prompt.md
defaults:
  detail_level: high
  format: freeform
mappings:
  - name: server
    watch:
      - apps/server/features/<FEATURE_NAME>/**
    readme: docs/wiki/<FEATURE_NAME>-feature.md
`,
		);
		const result = await loadDocloopConfig(file);
		expect(result).not.toBeNull();
		expect(result?.version).toBe(1);
		expect(result?.prompt).toBe('docs/prompt.md');
		expect(result?.defaults.detailLevel).toBe('high');
		expect(result?.defaults.format).toBe('freeform');
		expect(result?.mappings).toHaveLength(1);
		expect(result?.mappings[0].name).toBe('server');
	});

	it('throws DocloopConfigError on malformed YAML', async () => {
		const file = path.join(tempDir, '.docloop.yml');
		await fs.writeFile(file, 'mappings: [\n  - name: x\n  watch: nope\n');
		await expect(loadDocloopConfig(file)).rejects.toThrow(DocloopConfigError);
		await expect(loadDocloopConfig(file)).rejects.toThrow(/failed to parse/);
	});

	it('throws DocloopConfigError on schema violations', async () => {
		const file = path.join(tempDir, '.docloop.yml');
		await fs.writeFile(file, 'version: 2\nmappings:\n  - name: x\n    watch: ["a/**"]\n    readme: r.md\n');
		await expect(loadDocloopConfig(file)).rejects.toThrow(/version must be 1/);
	});

	it('rethrows non-ENOENT filesystem errors', async () => {
		await expect(loadDocloopConfig(tempDir)).rejects.toThrow();
	});
});
