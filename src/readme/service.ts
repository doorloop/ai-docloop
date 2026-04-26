import { promises as fs } from 'fs';
import { join } from 'path';

import { logger } from '../lib/logger';
import { DocRoot } from '../types';

export async function buildDocRoots(docRootMap: Map<string, string[]>, readmeFilename: string): Promise<DocRoot[]> {
	const docRoots: DocRoot[] = [];

	for (const [folderPath, changedFiles] of docRootMap.entries()) {
		const featureName = folderPath.split('/').pop() || folderPath;
		const readmePath = join(folderPath, readmeFilename);

		let existingReadme: string | undefined;

		try {
			existingReadme = await fs.readFile(readmePath, 'utf-8');
			logger.debug(`Found existing README at ${readmePath}`);
		} catch {
			logger.debug(`No existing README at ${readmePath}, will create new one`);
		}

		docRoots.push({
			folderPath,
			featureName,
			changedFiles,
			existingReadme,
		});
	}

	return docRoots;
}

export async function writeReadme(folderPath: string, readmeFilename: string, content: string): Promise<string> {
	// Ensure directory exists
	await fs.mkdir(folderPath, { recursive: true });

	const filePath = join(folderPath, readmeFilename);

	// Write file with UTF-8 encoding
	await fs.writeFile(filePath, content, 'utf-8');

	logger.info(`Wrote README to ${filePath}`);

	return filePath;
}
