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
	await fs.writeFile(filePath, content, 'utf-8');
	logger.info(`Wrote README to ${filePath}`);
	return filePath;
}
