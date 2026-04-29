import * as github from '@actions/github';

import { logger } from './lib/logger';
import { DeliveryMode, DocloopEvent } from './types';

const ALLOWED_DELIVERY: Record<DocloopEvent, readonly DeliveryMode[]> = {
	pr_merged: ['direct_commit', 'pr'],
	pr_open: ['pr_comment', 'pr_branch_commit'],
	workflow_dispatch: ['direct_commit', 'pr'],
};

const DEFAULT_DELIVERY: Record<DocloopEvent, DeliveryMode> = {
	pr_merged: 'direct_commit',
	pr_open: 'pr_comment',
	workflow_dispatch: 'pr',
};

export function detectEvent(context: typeof github.context): DocloopEvent | null {
	const eventName = context.eventName;
	const action = context.payload.action;

	if (eventName === 'pull_request') {
		const pr = context.payload.pull_request;
		if (action === 'closed' && pr?.merged === true) return 'pr_merged';
		if (action === 'opened' || action === 'synchronize' || action === 'reopened') return 'pr_open';
		return null;
	}

	if (eventName === 'workflow_dispatch') {
		return 'workflow_dispatch';
	}

	return null;
}

export function resolveDelivery(requested: DeliveryMode | undefined, event: DocloopEvent, context: typeof github.context): DeliveryMode {
	let delivery: DeliveryMode = requested ?? DEFAULT_DELIVERY[event];

	if (delivery === 'pr_branch_commit') {
		const pr = context.payload.pull_request;
		if (pr?.head?.repo?.fork === true) {
			logger.warning('PR is from a fork; cannot push to head ref. Falling back to pr_comment delivery.');
			delivery = 'pr_comment';
		}
	}

	const allowed = ALLOWED_DELIVERY[event];
	if (!allowed.includes(delivery)) {
		throw new Error(`delivery "${delivery}" is not allowed for event "${event}"; allowed: ${allowed.join(', ')}`);
	}
	return delivery;
}
