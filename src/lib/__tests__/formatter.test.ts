import { beforeEach, describe, expect, it, mock, type Mock } from 'bun:test';

import * as actionsExec from '@actions/exec';

const execMock = mock();

mock.module('@actions/exec', () => ({
	exec: execMock,
}));

const warningMock = mock();
const infoMock = mock();

mock.module('../logger', () => ({
	logger: {
		debug: mock(),
		info: infoMock,
		warning: warningMock,
		error: mock(),
		setFailed: mock(),
	},
}));

const { runFormatter } = await import('../formatter');

beforeEach(() => {
	execMock.mockReset();
	warningMock.mockReset();
	infoMock.mockReset();
});

describe('runFormatter', () => {
	it('is a no-op when formatCommand is undefined', async () => {
		await runFormatter('docs/x.md', undefined);
		expect(execMock).not.toHaveBeenCalled();
	});

	it('is a no-op when formatCommand is whitespace-only', async () => {
		await runFormatter('docs/x.md', '   \n  ');
		expect(execMock).not.toHaveBeenCalled();
	});

	it('invokes bash -c with the command and a single-quoted file path', async () => {
		(actionsExec.exec as Mock<typeof actionsExec.exec>).mockResolvedValue(0);
		await runFormatter('docs/wiki/insights/inspections-feature.md', 'bunx --no-install prettier --write');
		expect(execMock).toHaveBeenCalledTimes(1);
		const [bin, args] = execMock.mock.calls[0] as [string, string[]];
		expect(bin).toBe('bash');
		expect(args[0]).toBe('-c');
		expect(args[1]).toBe(`bunx --no-install prettier --write 'docs/wiki/insights/inspections-feature.md'`);
	});

	it('escapes single quotes in the file path', async () => {
		(actionsExec.exec as Mock<typeof actionsExec.exec>).mockResolvedValue(0);
		await runFormatter("docs/it's tricky/feature.md", 'prettier --write');
		const args = execMock.mock.calls[0][1] as string[];
		// The path's single quote becomes  '\''  inside the outer single-quoted string.
		expect(args[1]).toBe(`prettier --write 'docs/it'\\''s tricky/feature.md'`);
	});

	it('logs a warning and does not throw when the formatter exits non-zero', async () => {
		(actionsExec.exec as Mock<typeof actionsExec.exec>).mockResolvedValue(2);
		await runFormatter('docs/x.md', 'prettier --write');
		expect(warningMock).toHaveBeenCalledTimes(1);
		const [msg] = warningMock.mock.calls[0] as [string];
		expect(msg).toContain('exited 2');
		expect(msg).toContain('docs/x.md');
	});

	it('logs a warning and does not throw when exec itself rejects', async () => {
		(actionsExec.exec as Mock<typeof actionsExec.exec>).mockRejectedValue(new Error('command not found'));
		await runFormatter('docs/x.md', 'nonexistent-formatter --write');
		expect(warningMock).toHaveBeenCalledTimes(1);
		const [msg] = warningMock.mock.calls[0] as [string];
		expect(msg).toContain('threw on docs/x.md');
		expect(msg).toContain('command not found');
	});

	it('logs success at info level on a clean exit', async () => {
		(actionsExec.exec as Mock<typeof actionsExec.exec>).mockResolvedValue(0);
		await runFormatter('docs/x.md', 'prettier --write');
		expect(infoMock).toHaveBeenCalledTimes(1);
		expect(warningMock).not.toHaveBeenCalled();
	});
});
