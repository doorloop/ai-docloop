import { describe, expect, it, mock } from 'bun:test';

import * as github from '@actions/github';

import { DeliveryMode, DocloopEvent } from '../types';

mock.module('../lib/logger', () => ({
	logger: {
		debug: mock(),
		info: mock(),
		warning: mock(),
		error: mock(),
		setFailed: mock(),
	},
}));

const { resolveDelivery, detectEvent } = await import('../event');

type Ctx = typeof github.context;

function makeContext(opts: { eventName?: string; action?: string; merged?: boolean; isFork?: boolean } = {}): Ctx {
	return {
		eventName: opts.eventName ?? 'pull_request',
		payload: {
			action: opts.action,
			pull_request: {
				number: 1,
				merged: opts.merged ?? false,
				head: { ref: 'feature/x', repo: { fork: opts.isFork ?? false } },
				base: { ref: 'main' },
			},
		},
		repo: { owner: 'org', repo: 'repo' },
		ref: 'refs/heads/main',
	} as unknown as Ctx;
}

describe('resolveDelivery — defaults', () => {
	const cases: Array<{ event: DocloopEvent; expected: DeliveryMode }> = [
		{ event: 'pr_merged', expected: 'direct_commit' },
		{ event: 'pr_open', expected: 'pr_comment' },
		{ event: 'workflow_dispatch', expected: 'pr' },
	];

	for (const { event, expected } of cases) {
		it(`event=${event} → delivery=${expected} when not specified`, () => {
			expect(resolveDelivery(undefined, event, makeContext())).toBe(expected);
		});
	}
});

describe('resolveDelivery — explicit values', () => {
	it('accepts pr for pr_merged', () => {
		expect(resolveDelivery('pr', 'pr_merged', makeContext())).toBe('pr');
	});

	it('accepts pr_branch_commit for pr_open', () => {
		expect(resolveDelivery('pr_branch_commit', 'pr_open', makeContext({ isFork: false }))).toBe('pr_branch_commit');
	});
});

describe('resolveDelivery — illegal combos', () => {
	it('rejects pr_branch_commit for pr_merged', () => {
		expect(() => resolveDelivery('pr_branch_commit', 'pr_merged', makeContext())).toThrow(/not allowed/);
	});

	it('rejects direct_commit for pr_open', () => {
		expect(() => resolveDelivery('direct_commit', 'pr_open', makeContext())).toThrow(/not allowed/);
	});

	it('rejects pr_comment for workflow_dispatch', () => {
		expect(() => resolveDelivery('pr_comment', 'workflow_dispatch', makeContext({ eventName: 'workflow_dispatch' }))).toThrow(/not allowed/);
	});
});

describe('resolveDelivery — fork PR auto-degrade', () => {
	it('auto-degrades pr_branch_commit to pr_comment for fork PRs', () => {
		expect(resolveDelivery('pr_branch_commit', 'pr_open', makeContext({ isFork: true }))).toBe('pr_comment');
	});

	it('does not auto-degrade for same-repo PRs', () => {
		expect(resolveDelivery('pr_branch_commit', 'pr_open', makeContext({ isFork: false }))).toBe('pr_branch_commit');
	});
});

describe('detectEvent', () => {
	it('returns pr_merged for closed+merged PR', () => {
		expect(detectEvent(makeContext({ action: 'closed', merged: true }))).toBe('pr_merged');
	});

	it('returns null for closed PR that was not merged', () => {
		expect(detectEvent(makeContext({ action: 'closed', merged: false }))).toBeNull();
	});

	it('returns pr_open for opened/synchronize/reopened actions', () => {
		expect(detectEvent(makeContext({ action: 'opened' }))).toBe('pr_open');
		expect(detectEvent(makeContext({ action: 'synchronize' }))).toBe('pr_open');
		expect(detectEvent(makeContext({ action: 'reopened' }))).toBe('pr_open');
	});

	it('returns workflow_dispatch for workflow_dispatch event', () => {
		expect(detectEvent(makeContext({ eventName: 'workflow_dispatch' }))).toBe('workflow_dispatch');
	});

	it('returns null for unhandled events', () => {
		expect(detectEvent(makeContext({ eventName: 'push' }))).toBeNull();
	});
});
