import { describe, expect, it } from 'bun:test';

import { AiRequestContext } from '../../types';
import { buildPrompt } from '../prompt';

const baseCtx: AiRequestContext = {
	featureName: 'inspections',
	detailLevel: 'medium',
	changedFiles: ['apps/server/features/inspections/index.ts'],
	updateMode: 'update',
};

describe('buildPrompt', () => {
	describe('legacy mode (no options)', () => {
		it('returns the original system prompt with detail-level guidance', () => {
			const { system } = buildPrompt(baseCtx);
			expect(system).toContain('You are a technical documentation expert');
			expect(system).toContain('Provide a balanced overview');
			expect(system).not.toContain('automated GitHub Action');
			expect(system).not.toContain('should_update');
		});

		it('emits the canonical user message format', () => {
			const ctx: AiRequestContext = {
				...baseCtx,
				prTitle: 'feat: add audit log',
				prBody: 'Adds audit logging to the controller.',
				existingReadme: '# Inspections\n\nOld content.',
			};
			const { user } = buildPrompt(ctx);
			expect(user).toContain('Generate structured README content for the feature/component: **inspections**');
			expect(user).toContain('PR Title: feat: add audit log');
			expect(user).toContain('PR Description:\nAdds audit logging to the controller.');
			expect(user).toContain('Existing README:');
			expect(user).toContain('Please update this README to reflect the recent changes');
		});

		it('handles overwrite update mode in the user message', () => {
			const ctx: AiRequestContext = {
				...baseCtx,
				existingReadme: '# Old',
				updateMode: 'overwrite',
			};
			const { user } = buildPrompt(ctx);
			expect(user).toContain('Previous README (for context only');
			expect(user).toContain('Please generate a new README based on the current state of the code.');
		});
	});

	describe('docloop mode (options provided)', () => {
		it('appends operational boundaries after the user directive', () => {
			const { system } = buildPrompt(baseCtx, { format: 'structured' });
			expect(system).toContain('You are a technical documentation expert');
			expect(system).toContain('---');
			expect(system).toContain('automated GitHub Action');
			expect(system).toContain('Return structured JSON matching the supplied schema.');
		});

		it('replaces the directive when a userPrompt is provided', () => {
			const { system } = buildPrompt(baseCtx, {
				format: 'structured',
				userPrompt: 'Focus on security boundaries and audit hooks. Keep examples minimal.',
			});
			expect(system).toStartWith('Focus on security boundaries and audit hooks.');
			expect(system).not.toContain('You are a technical documentation expert');
			expect(system).toContain('automated GitHub Action');
		});

		it('adds should_update guidance when includeUpdateSignal is true', () => {
			const { system } = buildPrompt(baseCtx, { format: 'structured', includeUpdateSignal: true });
			expect(system).toContain('`should_update`');
			expect(system).toContain('`update_reason`');
		});

		it('omits should_update guidance when includeUpdateSignal is false', () => {
			const { system } = buildPrompt(baseCtx, { format: 'structured', includeUpdateSignal: false });
			expect(system).not.toContain('should_update');
		});

		it('switches to freeform Markdown instructions when format is freeform', () => {
			const { system } = buildPrompt(baseCtx, { format: 'freeform' });
			expect(system).toContain('Return plain Markdown');
			expect(system).toContain('<!-- docloop:no-update -->');
			expect(system).not.toContain('Return structured JSON');
		});

		it('user message stays the same context block as legacy', () => {
			const legacy = buildPrompt(baseCtx);
			const docloop = buildPrompt(baseCtx, { format: 'structured' });
			expect(docloop.user).toBe(legacy.user);
		});
	});
});
