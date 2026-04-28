import { describe, expect, it, mock } from 'bun:test';

import { MappingConfig, PathScopeConfig } from '../../types';
import { buildPathScopeConfigs, mapFilesToDocRoots, resolveMappingTargets } from '../path-mapper';

mock.module('../logger', () => ({
	logger: {
		debug: mock(),
		info: mock(),
		warning: mock(),
		error: mock(),
		setFailed: mock(),
	},
}));

describe('pathMapper', () => {
	describe('buildPathScopeConfigs', () => {
		it('should parse simple path scopes', () => {
			const scopes = buildPathScopeConfigs(['apps/client/src/features/**']);

			expect(scopes).toHaveLength(1);
			expect(scopes[0].scopeRoot).toBe('apps/client/src/features');
			expect(scopes[0].scopeRootSegments).toEqual(['apps', 'client', 'src', 'features']);
		});

		it('should handle paths with leading ./', () => {
			const scopes = buildPathScopeConfigs(['./apps/client/**']);

			expect(scopes[0].scopeRoot).toBe('apps/client');
			expect(scopes[0].scopeRootSegments).toEqual(['apps', 'client']);
		});

		it('should handle multiple scopes', () => {
			const scopes = buildPathScopeConfigs(['apps/client/**', 'packages/ui/**']);

			expect(scopes).toHaveLength(2);
			expect(scopes[0].scopeRoot).toBe('apps/client');
			expect(scopes[1].scopeRoot).toBe('packages/ui');
		});

		it('should handle Windows-style paths', () => {
			// Windows paths with backslashes should be normalized
			const scopes = buildPathScopeConfigs(['apps\\client\\src\\**']);

			// normalize-path converts backslashes to forward slashes, and glob pattern is removed
			expect(scopes[0].scopeRoot).toBe('apps/client/src');
			expect(scopes[0].scopeRootSegments).toEqual(['apps', 'client', 'src']);
		});

		it('should handle paths without glob suffix', () => {
			// Test that paths without ** still work
			const scopes = buildPathScopeConfigs(['apps/client/src']);

			expect(scopes[0].scopeRoot).toBe('apps/client/src');
			expect(scopes[0].scopeRootSegments).toEqual(['apps', 'client', 'src']);
		});
	});

	describe('mapFilesToDocRoots', () => {
		it('should map files to doc roots with depth 1', () => {
			const scopes: PathScopeConfig[] = [
				{
					pattern: 'apps/client/src/features/**',
					scopeRoot: 'apps/client/src/features',
					scopeRootSegments: ['apps', 'client', 'src', 'features'],
				},
			];

			const files = [
				'apps/client/src/features/inspection/components/Button.tsx',
				'apps/client/src/features/inspection/utils/helper.ts',
				'apps/client/src/features/payment/components/Form.tsx',
			];

			const result = mapFilesToDocRoots(files, scopes, 1);

			expect(result.size).toBe(2);
			expect(result.get('apps/client/src/features/inspection')).toEqual([
				'apps/client/src/features/inspection/components/Button.tsx',
				'apps/client/src/features/inspection/utils/helper.ts',
			]);
			expect(result.get('apps/client/src/features/payment')).toEqual(['apps/client/src/features/payment/components/Form.tsx']);
		});

		it('should skip files not matching any scope', () => {
			const scopes: PathScopeConfig[] = [
				{
					pattern: 'apps/client/**',
					scopeRoot: 'apps/client',
					scopeRootSegments: ['apps', 'client'],
				},
			];

			const files = [
				'apps/client/src/file.ts',
				'packages/utils/helper.ts', // Should be skipped
			];

			const result = mapFilesToDocRoots(files, scopes, 1);

			expect(result.size).toBe(1);
			expect(result.has('packages/utils')).toBe(false);
		});

		it('should handle files not deep enough', () => {
			const scopes: PathScopeConfig[] = [
				{
					pattern: 'apps/client/**',
					scopeRoot: 'apps/client',
					scopeRootSegments: ['apps', 'client'],
				},
			];

			// File at apps/client/file.ts has 3 segments: ['apps', 'client', 'file.ts']
			// Scope root has 2 segments: ['apps', 'client']
			// With depth=2, we need rootLen(2) + 2 = 4 segments for docRoot
			// File only has 3 segments, so slice(0, 4) = 3 segments
			// Check: 3 <= 2 is false, so it would match, but that's actually correct behavior
			// Let's test with a file that's truly at the root level
			const filesAtRoot = ['apps/client']; // Only 2 segments, same as root
			const result = mapFilesToDocRoots(filesAtRoot, scopes, 1);

			// File has 2 segments, root has 2, depth=1 needs 3 total
			// slice(0, 3) on 2 segments = 2 segments
			// 2 <= 2 is true, so it should be skipped
			expect(result.size).toBe(0);
		});
	});

	describe('resolveMappingTargets', () => {
		const baseMapping: MappingConfig = {
			name: 'server-features',
			watch: ['apps/server/features/<FEATURE_NAME>/**'],
			readme: 'docs/wiki/insights/<FEATURE_NAME>-feature.md',
		};

		it('groups files by capture value into a single target per feature', () => {
			const files = [
				'apps/server/features/inspections/components/Button.tsx',
				'apps/server/features/inspections/utils/helper.ts',
				'apps/server/features/payment/index.ts',
			];
			const targets = resolveMappingTargets(baseMapping, files, []);
			expect(targets).toHaveLength(2);

			const inspections = targets.find((t) => t.captures.FEATURE_NAME === 'inspections');
			const payment = targets.find((t) => t.captures.FEATURE_NAME === 'payment');

			expect(inspections?.targetPath).toBe('docs/wiki/insights/inspections-feature.md');
			expect(inspections?.changedFiles).toEqual([
				'apps/server/features/inspections/components/Button.tsx',
				'apps/server/features/inspections/utils/helper.ts',
			]);
			expect(payment?.targetPath).toBe('docs/wiki/insights/payment-feature.md');
			expect(payment?.changedFiles).toEqual(['apps/server/features/payment/index.ts']);
		});

		it('drops files that do not match any watch entry', () => {
			const files = ['apps/server/features/inspections/index.ts', 'packages/utils/helper.ts', 'README.md'];
			const targets = resolveMappingTargets(baseMapping, files, []);
			expect(targets).toHaveLength(1);
			expect(targets[0].changedFiles).toEqual(['apps/server/features/inspections/index.ts']);
		});

		it('groups files across multi-watch entries that share the same capture', () => {
			const mapping: MappingConfig = {
				name: 'monorepo-features',
				watch: ['apps/server/features/<FEATURE_NAME>/**', 'apps/client/features/<FEATURE_NAME>/**'],
				readme: 'docs/wiki/<FEATURE_NAME>.md',
			};
			const files = ['apps/server/features/auth/index.ts', 'apps/client/features/auth/index.ts', 'apps/server/features/payment/index.ts'];
			const targets = resolveMappingTargets(mapping, files, []);
			expect(targets).toHaveLength(2);

			const auth = targets.find((t) => t.captures.FEATURE_NAME === 'auth');
			const payment = targets.find((t) => t.captures.FEATURE_NAME === 'payment');

			expect(auth?.changedFiles).toEqual(['apps/server/features/auth/index.ts', 'apps/client/features/auth/index.ts']);
			expect(payment?.changedFiles).toEqual(['apps/server/features/payment/index.ts']);
		});

		it('substitutes multiple placeholders into the target path', () => {
			const mapping: MappingConfig = {
				name: 'app-features',
				watch: ['apps/<APP>/features/<FEATURE_NAME>/**'],
				readme: 'docs/<APP>/<FEATURE_NAME>.md',
			};
			const files = ['apps/server/features/auth/index.ts', 'apps/client/features/auth/index.ts'];
			const targets = resolveMappingTargets(mapping, files, []);
			expect(targets).toHaveLength(2);

			const paths = targets.map((t) => t.targetPath).toSorted();
			expect(paths).toEqual(['docs/client/auth.md', 'docs/server/auth.md']);
		});

		it('uses default exclude patterns when mapping does not override', () => {
			const files = ['apps/server/features/inspections/index.ts', 'apps/server/features/inspections/index.test.ts'];
			const targets = resolveMappingTargets(baseMapping, files, ['**/*.test.ts']);
			expect(targets).toHaveLength(1);
			expect(targets[0].changedFiles).toEqual(['apps/server/features/inspections/index.ts']);
		});

		it('mapping-level exclude fully overrides default excludes', () => {
			const mapping: MappingConfig = {
				...baseMapping,
				exclude: ['**/__snapshots__/**'],
			};
			const files = [
				'apps/server/features/inspections/index.ts',
				'apps/server/features/inspections/index.test.ts',
				'apps/server/features/inspections/__snapshots__/x.snap',
			];
			const targets = resolveMappingTargets(mapping, files, ['**/*.test.ts']);
			expect(targets).toHaveLength(1);
			expect(targets[0].changedFiles).toEqual(['apps/server/features/inspections/index.ts', 'apps/server/features/inspections/index.test.ts']);
		});

		it('returns empty array when no files match', () => {
			const targets = resolveMappingTargets(baseMapping, ['unrelated/file.ts'], []);
			expect(targets).toEqual([]);
		});
	});
});
