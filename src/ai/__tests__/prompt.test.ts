import { describe, expect, it } from 'bun:test';

import { AiRequestContext } from '../../types';
import { buildPrompt } from '../prompt';

const baseCtx: AiRequestContext = {
	featureName: 'inspections',
	detailLevel: 'medium',
	changedFiles: ['apps/server/features/inspections/index.ts'],
};

describe('buildPrompt', () => {
	it('uses the structured directive by default', () => {
		const { system } = buildPrompt(baseCtx, { format: 'structured' });
		expect(system).toContain('You are a technical documentation expert');
		expect(system).toContain('Provide a balanced overview');
		expect(system).toContain('automated GitHub Action');
		expect(system).toContain('Return structured JSON matching the supplied schema.');
		expect(system).toContain('`should_update`');
	});

	it('uses the freeform directive and emits the no-update sentinel guidance', () => {
		const { system } = buildPrompt(baseCtx, { format: 'freeform' });
		expect(system).toContain('Generate clear, well-structured Markdown');
		expect(system).toContain('Return plain Markdown');
		expect(system).toContain('<!-- docloop:no-update -->');
		expect(system).not.toContain('Return structured JSON');
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

	it('renders PR title and body in the user message when present', () => {
		const ctx: AiRequestContext = {
			...baseCtx,
			prTitle: 'feat: add audit log',
			prBody: 'Adds audit logging to the controller.',
			existingReadme: '# Inspections\n\nOld content.',
		};
		const { user } = buildPrompt(ctx, { format: 'structured' });
		expect(user).toContain('Generate documentation for the feature/component: **inspections**');
		expect(user).toContain('PR Title: feat: add audit log');
		expect(user).toContain('PR Description:\nAdds audit logging to the controller.');
		expect(user).toContain('Existing document:');
		expect(user).toContain('Please update this document to reflect the recent changes');
	});

	it('asks for fresh documentation when no existing file is provided', () => {
		const { user } = buildPrompt(baseCtx, { format: 'structured' });
		expect(user).toContain('Please generate documentation for this feature/component.');
		expect(user).not.toContain('Existing document');
	});

	it('omits the "please update" trailer when a userPrompt is provided alongside an existing document', () => {
		const ctx: AiRequestContext = {
			...baseCtx,
			existingReadme: '# Inspections\n\nOld content.',
		};
		const { user } = buildPrompt(ctx, {
			format: 'freeform',
			userPrompt: 'Maintain the file per the rules above. Default to the no-update sentinel.',
		});
		expect(user).toContain('Existing document:');
		expect(user).not.toContain('Please update this document');
		expect(user).not.toContain('Please generate documentation for this feature/component.');
	});

	it('omits the "please generate" trailer when a userPrompt is provided without an existing document', () => {
		const { user } = buildPrompt(baseCtx, {
			format: 'freeform',
			userPrompt: 'Maintain the file per the rules above. Default to the no-update sentinel.',
		});
		expect(user).not.toContain('Please generate documentation for this feature/component.');
		expect(user).not.toContain('Please update this document');
	});

	it('keeps the boundaries block on the system prompt regardless of userPrompt', () => {
		const withUserPrompt = buildPrompt(baseCtx, {
			format: 'freeform',
			userPrompt: 'Custom rules go here.',
		});
		const withoutUserPrompt = buildPrompt(baseCtx, { format: 'freeform' });
		expect(withUserPrompt.system).toContain('automated GitHub Action');
		expect(withUserPrompt.system).toContain('<!-- docloop:no-update -->');
		expect(withoutUserPrompt.system).toContain('automated GitHub Action');
		expect(withoutUserPrompt.system).toContain('<!-- docloop:no-update -->');
	});
});
