import * as fs from 'node:fs/promises';

import { parse as parseYaml } from 'yaml';

import { logger } from '../lib/logger';
import { DocloopConfig } from '../types';
import { DocloopConfigError, validateAndNormalize } from './validate';

interface NodeError {
	code?: string;
}

function isFileNotFound(err: unknown): boolean {
	return err instanceof Error && (err as NodeError).code === 'ENOENT';
}

export async function loadDocloopConfig(filePath: string): Promise<DocloopConfig | null> {
	let raw: string;
	try {
		raw = await fs.readFile(filePath, 'utf-8');
	} catch (err) {
		if (isFileNotFound(err)) {
			logger.debug(`No .docloop.yml at "${filePath}"; falling back to legacy inputs.`);
			return null;
		}
		throw err;
	}

	let parsed: unknown;
	try {
		parsed = parseYaml(raw);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new DocloopConfigError(`failed to parse "${filePath}" as YAML: ${message}`);
	}

	return validateAndNormalize(parsed);
}
