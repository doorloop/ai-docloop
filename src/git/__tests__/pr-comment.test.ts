import { describe, expect, it } from 'bun:test';

import { type MappingPreview, renderPreviewBody } from '../pr-comment';

describe('renderPreviewBody', () => {
	it('starts with the docloop signature so we can find it again later', () => {
		const body = renderPreviewBody([]);
		expect(body.startsWith('<!-- docloop:summary -->')).toBe(true);
	});

	it('says no mappings matched when previews is empty', () => {
		const body = renderPreviewBody([]);
		expect(body).toContain('No mappings matched the changed files in this PR.');
	});

	it('lists update count, target paths, and proposed content for non-skip previews', () => {
		const previews: MappingPreview[] = [
			{
				mappingName: 'server-features',
				targetPath: 'docs/wiki/insights/inspections-feature.md',
				existing: undefined,
				proposed: '# Inspections\n\nDescription here.',
				skip: false,
			},
		];
		const body = renderPreviewBody(previews);
		expect(body).toContain('1 update(s) suggested');
		expect(body).toContain('docs/wiki/insights/inspections-feature.md');
		expect(body).toContain('mapping: `server-features`');
		expect(body).toContain('new file');
		expect(body).toContain('# Inspections');
	});

	it('marks targets as "update" when an existing readme was found', () => {
		const previews: MappingPreview[] = [
			{
				mappingName: 'server-features',
				targetPath: 'docs/x.md',
				existing: '# old',
				proposed: '# new',
				skip: false,
			},
		];
		const body = renderPreviewBody(previews);
		expect(body).toContain('update');
		expect(body).not.toContain('new file');
	});

	it('renders a separate skipped section with reasons', () => {
		const previews: MappingPreview[] = [
			{
				mappingName: 'client-features',
				targetPath: 'docs/auth.md',
				existing: undefined,
				proposed: '',
				skip: true,
				skipReason: 'target missing and on_missing_readme=skip',
			},
		];
		const body = renderPreviewBody(previews);
		expect(body).toContain('1 target(s) skipped');
		expect(body).toContain('docs/auth.md');
		expect(body).toContain('on_missing_readme=skip');
	});

	it('handles mixed updates and skips', () => {
		const previews: MappingPreview[] = [
			{ mappingName: 'a', targetPath: 'docs/a.md', existing: '# a', proposed: '# new a', skip: false },
			{ mappingName: 'b', targetPath: 'docs/b.md', existing: undefined, proposed: '', skip: true, skipReason: 'no change' },
		];
		const body = renderPreviewBody(previews);
		expect(body).toContain('1 update(s) suggested');
		expect(body).toContain('1 target(s) skipped');
	});
});
