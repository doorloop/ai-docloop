import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

mock.module('../../lib/logger', () => ({
	logger: {
		debug: mock(),
		info: mock(),
		warning: mock(),
		error: mock(),
		setFailed: mock(),
	},
}));

const { readReadmeIfExists, writeReadmeAt } = await import('../service');

let tempDir = '';

beforeEach(async () => {
	tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'docloop-service-test-'));
});

afterEach(async () => {
	await fs.rm(tempDir, { recursive: true, force: true });
});

describe('readReadmeIfExists', () => {
	it('returns the file contents when it exists', async () => {
		const file = path.join(tempDir, 'README.md');
		await fs.writeFile(file, '# hello');
		expect(await readReadmeIfExists(file)).toBe('# hello');
	});

	it('returns undefined when the file does not exist', async () => {
		const file = path.join(tempDir, 'missing.md');
		expect(await readReadmeIfExists(file)).toBeUndefined();
	});

	it('rethrows non-ENOENT errors', async () => {
		await expect(readReadmeIfExists(tempDir)).rejects.toThrow();
	});
});

describe('writeReadmeAt', () => {
	it('creates parent directories and writes the file', async () => {
		const file = path.join(tempDir, 'docs', 'wiki', 'insights', 'feature.md');
		await writeReadmeAt(file, '# feature\n\nbody');
		const written = await fs.readFile(file, 'utf-8');
		expect(written).toBe('# feature\n\nbody');
	});

	it('overwrites an existing file', async () => {
		const file = path.join(tempDir, 'README.md');
		await fs.writeFile(file, 'old');
		await writeReadmeAt(file, 'new');
		expect(await fs.readFile(file, 'utf-8')).toBe('new');
	});

	it('returns the written file path', async () => {
		const file = path.join(tempDir, 'docs', 'feature.md');
		const result = await writeReadmeAt(file, 'x');
		expect(result).toBe(file);
	});
});
