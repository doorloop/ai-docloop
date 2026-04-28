import { describe, expect, it } from 'bun:test';

import { compileWatchPattern, extractPlaceholderNames, matchWatchPattern, substitutePlaceholders, WatchPatternError } from '../glob-with-captures';

describe('extractPlaceholderNames', () => {
	it('returns placeholders in declaration order, deduped', () => {
		expect(extractPlaceholderNames('apps/<APP>/features/<FEATURE_NAME>/**')).toEqual(['APP', 'FEATURE_NAME']);
		expect(extractPlaceholderNames('docs/<APP>/<FEATURE_NAME>/<APP>.md')).toEqual(['APP', 'FEATURE_NAME']);
		expect(extractPlaceholderNames('plain/path/no/captures')).toEqual([]);
	});

	it('only matches the placeholder grammar', () => {
		expect(extractPlaceholderNames('<lowercase>/<MIXED_Case>/<OK_NAME>')).toEqual(['OK_NAME']);
	});
});

describe('substitutePlaceholders', () => {
	it('replaces every occurrence of declared captures', () => {
		const out = substitutePlaceholders('docs/<APP>/<FEATURE_NAME>-<APP>.md', { APP: 'server', FEATURE_NAME: 'inspections' });
		expect(out).toBe('docs/server/inspections-server.md');
	});

	it('throws when a referenced placeholder has no capture', () => {
		expect(() => substitutePlaceholders('docs/<APP>.md', {})).toThrow(WatchPatternError);
	});

	it('leaves non-placeholder content untouched', () => {
		expect(substitutePlaceholders('docs/plain.md', {})).toBe('docs/plain.md');
	});
});

describe('compileWatchPattern', () => {
	it('compiles a literal path', () => {
		const compiled = compileWatchPattern('apps/server/main.ts');
		expect(compiled.placeholders).toEqual([]);
		expect(compiled.regex.test('apps/server/main.ts')).toBe(true);
		expect(compiled.regex.test('apps/server/other.ts')).toBe(false);
		expect(compiled.regex.test('apps/server/main.ts/extra')).toBe(false);
	});

	it('treats single * as a single segment match', () => {
		const compiled = compileWatchPattern('apps/*/main.ts');
		expect(compiled.regex.test('apps/server/main.ts')).toBe(true);
		expect(compiled.regex.test('apps/client/main.ts')).toBe(true);
		expect(compiled.regex.test('apps/server/utils/main.ts')).toBe(false);
	});

	it('treats trailing /** as zero or more trailing segments', () => {
		const compiled = compileWatchPattern('apps/server/**');
		expect(compiled.regex.test('apps/server')).toBe(true);
		expect(compiled.regex.test('apps/server/main.ts')).toBe(true);
		expect(compiled.regex.test('apps/server/sub/dir/main.ts')).toBe(true);
		expect(compiled.regex.test('apps/client/main.ts')).toBe(false);
	});

	it('treats /**/ in the middle as zero or more middle segments', () => {
		const compiled = compileWatchPattern('apps/**/main.ts');
		expect(compiled.regex.test('apps/main.ts')).toBe(true);
		expect(compiled.regex.test('apps/a/main.ts')).toBe(true);
		expect(compiled.regex.test('apps/a/b/main.ts')).toBe(true);
		expect(compiled.regex.test('main.ts')).toBe(false);
	});

	it('treats leading **/ as zero or more leading segments', () => {
		const compiled = compileWatchPattern('**/main.ts');
		expect(compiled.regex.test('main.ts')).toBe(true);
		expect(compiled.regex.test('a/main.ts')).toBe(true);
		expect(compiled.regex.test('a/b/main.ts')).toBe(true);
	});

	it('captures a single named placeholder', () => {
		const compiled = compileWatchPattern('apps/server/features/<FEATURE_NAME>/**');
		expect(compiled.placeholders).toEqual(['FEATURE_NAME']);

		const match = compiled.regex.exec('apps/server/features/inspections/components/Button.tsx');
		expect(match).not.toBeNull();
		expect(match?.groups?.FEATURE_NAME).toBe('inspections');
	});

	it('captures multiple placeholders', () => {
		const compiled = compileWatchPattern('apps/<APP>/features/<FEATURE_NAME>/**');
		expect(compiled.placeholders).toEqual(['APP', 'FEATURE_NAME']);

		const match = compiled.regex.exec('apps/client/features/payment/index.ts');
		expect(match?.groups?.APP).toBe('client');
		expect(match?.groups?.FEATURE_NAME).toBe('payment');
	});

	it('treats a repeated placeholder as a back-reference', () => {
		const compiled = compileWatchPattern('apps/<APP>/<APP>/main.ts');
		expect(compiled.placeholders).toEqual(['APP']);

		expect(compiled.regex.test('apps/foo/foo/main.ts')).toBe(true);
		expect(compiled.regex.test('apps/foo/bar/main.ts')).toBe(false);
	});

	it('escapes regex metacharacters in literal segments', () => {
		const compiled = compileWatchPattern('apps/v1.0/main.ts');
		expect(compiled.regex.test('apps/v1.0/main.ts')).toBe(true);
		expect(compiled.regex.test('apps/v1x0/main.ts')).toBe(false);
	});

	it('rejects an empty pattern', () => {
		expect(() => compileWatchPattern('')).toThrow(WatchPatternError);
	});

	it('does not match a placeholder against an empty segment', () => {
		const compiled = compileWatchPattern('apps/<F>/main.ts');
		expect(compiled.regex.test('apps//main.ts')).toBe(false);
	});
});

describe('matchWatchPattern', () => {
	const compiled = compileWatchPattern('apps/<APP>/features/<FEATURE_NAME>/**');

	it('returns a record of captures on a match', () => {
		const result = matchWatchPattern('apps/server/features/inspections/file.ts', compiled);
		expect(result).toEqual({ APP: 'server', FEATURE_NAME: 'inspections' });
	});

	it('returns null on a non-match', () => {
		expect(matchWatchPattern('packages/server/file.ts', compiled)).toBeNull();
	});

	it('returns an empty record for a pattern with no placeholders', () => {
		const literalCompiled = compileWatchPattern('apps/server/**');
		const result = matchWatchPattern('apps/server/main.ts', literalCompiled);
		expect(result).toEqual({});
	});
});
