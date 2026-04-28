import { promises as fs } from 'fs';
import { dirname, join } from 'path';

import { logger } from '../lib/logger';
import { DocRoot } from '../types';

export async function buildDocRoots(docRootMap: Map<string, string[]>, readmeFilename: string): Promise<DocRoot[]> {
	const entries = Array.from(docRootMap.entries());

	return Promise.all(
		entries.map(async ([folderPath, changedFiles]): Promise<DocRoot> => {
			const featureName = folderPath.split('/').pop() || folderPath;
			const readmePath = join(folderPath, readmeFilename);

			let existingReadme: string | undefined;
			try {
				existingReadme = await fs.readFile(readmePath, 'utf-8');
				logger.debug(`Found existing README at ${readmePath}`);
			} catch {
				logger.debug(`No existing README at ${readmePath}, will create new one`);
			}

			return {
				folderPath,
				featureName,
				changedFiles,
				existingReadme,
			};
		}),
	);
}

export async function writeReadme(folderPath: string, readmeFilename: string, content: string): Promise<string> {
	await fs.mkdir(folderPath, { recursive: true });

	const filePath = join(folderPath, readmeFilename);
	await fs.writeFile(filePath, content, 'utf-8');

	logger.info(`Wrote README to ${filePath}`);

	return filePath;
}

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
