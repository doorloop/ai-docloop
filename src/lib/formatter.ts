import { exec } from '@actions/exec';

import { logger } from './logger';

// Single-quote `path` for inclusion in a `bash -c` command line. Escapes any
// single quotes in the path itself per the standard sh "close-and-reopen"
// trick: a' b'c → a'\''b'c.
function shellQuote(value: string): string {
	const escaped = value.replace(/'/g, `'\\''`);
	return `'${escaped}'`;
}

/**
 * Run the consumer-supplied `format_command` on a single generated file.
 *
 * The command is executed via `bash -c "<command> '<file>'"` so the consumer
 * can write multi-token commands like `bunx --no-install prettier --write`
 * and we safely append the file path as the final argument. Single-quoting
 * handles paths with spaces or special characters.
 *
 * Failures are logged as warnings and do not abort the action — the
 * unformatted file is still committed. This matches the broader docloop
 * principle that "format drift in a single doc is a much smaller problem
 * than a failed CI run."
 */
export async function runFormatter(filePath: string, formatCommand: string | undefined): Promise<void> {
	if (formatCommand === undefined) return;
	const command = formatCommand.trim();
	if (command.length === 0) return;

	const fullCommand = `${command} ${shellQuote(filePath)}`;
	try {
		const exitCode = await exec('bash', ['-c', fullCommand], { ignoreReturnCode: true });
		if (exitCode === 0) {
			logger.info(`Formatted ${filePath} via "${command}"`);
			return;
		}
		logger.warning(`format_command "${command}" exited ${exitCode} on ${filePath}; committing unformatted output.`);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		logger.warning(`format_command "${command}" threw on ${filePath}: ${message}; committing unformatted output.`);
	}
}
