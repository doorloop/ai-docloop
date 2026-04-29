import { describe, expect, it } from 'bun:test';

import { type MappingPreview, renderPreviewBody } from '../pr-comment';

describe('renderPreviewBody', () => {
	it('starts with a per-mapping signature so multiple steps each have their own comment', () => {
		const body = renderPreviewBody('server-features', []);
		expect(body.startsWith('<!-- docloop:summary:server-features -->')).toBe(true);
	});

	it('escapes embedded "-->" sequences in mapping names so the HTML comment cannot be terminated early', () => {
		const body = renderPreviewBody('weird-->name', []);
		expect(body).toContain('<!-- docloop:summary:weird--&gt;name -->');
	});

	it('says no files matched when previews is empty', () => {
		const body = renderPreviewBody('server-features', []);
		expect(body).toContain('No files in this PR matched this mapping.');
	});

	it('renders the mapping name in the heading', () => {
		const body = renderPreviewBody('server-features', []);
		expect(body).toContain('proposed updates for `server-features`');
	});

	it('lists update count, target paths, and proposed content for non-skip previews', () => {
		const previews: MappingPreview[] = [
			{
				targetPath: 'docs/wiki/insights/inspections-feature.md',
				existing: undefined,
				proposed: '# Inspections\n\nDescription here.',
				skip: false,
			},
		];
		const body = renderPreviewBody('server-features', previews);
		expect(body).toContain('1 update(s) suggested');
		expect(body).toContain('docs/wiki/insights/inspections-feature.md');
		expect(body).toContain('new file');
		expect(body).toContain('# Inspections');
	});

	it('marks targets as "update" when an existing readme was found', () => {
		const previews: MappingPreview[] = [
			{
				targetPath: 'docs/x.md',
				existing: '# old',
				proposed: '# new',
				skip: false,
			},
		];
		const body = renderPreviewBody('server-features', previews);
		expect(body).toContain('update');
		expect(body).not.toContain('new file');
	});

	it('renders a separate skipped section with reasons', () => {
		const previews: MappingPreview[] = [
			{
				targetPath: 'docs/auth.md',
				existing: undefined,
				proposed: '',
				skip: true,
				skipReason: 'target missing and on_missing_readme=skip',
			},
		];
		const body = renderPreviewBody('client-features', previews);
		expect(body).toContain('1 target(s) skipped');
		expect(body).toContain('docs/auth.md');
		expect(body).toContain('on_missing_readme=skip');
	});

	it('handles mixed updates and skips', () => {
		const previews: MappingPreview[] = [
			{ targetPath: 'docs/a.md', existing: '# a', proposed: '# new a', skip: false },
			{ targetPath: 'docs/b.md', existing: undefined, proposed: '', skip: true, skipReason: 'no change' },
		];
		const body = renderPreviewBody('mixed', previews);
		expect(body).toContain('1 update(s) suggested');
		expect(body).toContain('1 target(s) skipped');
	});
});
