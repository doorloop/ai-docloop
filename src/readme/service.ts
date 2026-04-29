import { promises as fs } from 'fs';
import { dirname } from 'path';

import { logger } from '../lib/logger';

export async function readReadmeIfExists(filePath: string): Promise<string | undefined> {
	try {
		const content = await fs.readFile(filePath, 'utf-8');
		logger.debug(`Found existing README at ${filePath}`);
		return content;
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
			logger.debug(`No existing README at ${filePath}`);
			return undefined;
		}
		throw err;
	}
}

export async function writeReadmeAt(filePath: string, content: string): Promise<string> {
	const dir = dirname(filePath);
	await fs.mkdir(dir, { recursive: true });
	// Ensure exactly one trailing newline. Every major Markdown formatter
	// (oxfmt, prettier, dprint, biome) flags "no newline at end of file" as
	// an error; the LLM frequently emits content without one. Appending here
	// makes generated files pass the formatter check on consumer repos out of
	// the box without any per-consumer config.
	const normalized = content.endsWith('\n') ? content : `${content}\n`;
	await fs.writeFile(filePath, normalized, 'utf-8');
	logger.info(`Wrote README to ${filePath}`);
	return filePath;
}
