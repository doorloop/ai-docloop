import { describe, expect, it, mock } from 'bun:test';

import { MappingIntent } from '../../types';
import { resolveMappingTargets } from '../path-mapper';

mock.module('../logger', () => ({
	logger: {
		debug: mock(),
		info: mock(),
		warning: mock(),
		error: mock(),
		setFailed: mock(),
	},
}));

function makeIntent(overrides: Partial<MappingIntent> = {}): MappingIntent {
	return {
		name: 'server-features',
		watch: ['apps/server/features/<FEATURE_NAME>/**'],
		readme: 'docs/wiki/insights/<FEATURE_NAME>-feature.md',
		detailLevel: 'medium',
		format: 'structured',
		onMissingReadme: 'create',
		exclude: [],
		commitMessage: 'docs: update [skip ci]',
		requestReviewFromPrAuthor: true,
		openaiApiKey: 'test-key',
		openaiModel: 'gpt-4o-mini',
		...overrides,
	};
}

describe('resolveMappingTargets', () => {
	it('groups files by capture value into a single target per feature', () => {
		const intent = makeIntent();
		const files = [
			'apps/server/features/inspections/components/Button.tsx',
			'apps/server/features/inspections/utils/helper.ts',
			'apps/server/features/payment/index.ts',
		];
		const targets = resolveMappingTargets(intent, files);
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
		const intent = makeIntent();
		const files = ['apps/server/features/inspections/index.ts', 'packages/utils/helper.ts', 'README.md'];
		const targets = resolveMappingTargets(intent, files);
		expect(targets).toHaveLength(1);
		expect(targets[0].changedFiles).toEqual(['apps/server/features/inspections/index.ts']);
	});

	it('groups files across multi-watch entries that share the same capture', () => {
		const intent = makeIntent({
			name: 'monorepo-features',
			watch: ['apps/server/features/<FEATURE_NAME>/**', 'apps/client/features/<FEATURE_NAME>/**'],
			readme: 'docs/wiki/<FEATURE_NAME>.md',
		});
		const files = ['apps/server/features/auth/index.ts', 'apps/client/features/auth/index.ts', 'apps/server/features/payment/index.ts'];
		const targets = resolveMappingTargets(intent, files);
		expect(targets).toHaveLength(2);

		const auth = targets.find((t) => t.captures.FEATURE_NAME === 'auth');
		const payment = targets.find((t) => t.captures.FEATURE_NAME === 'payment');

		expect(auth?.changedFiles).toEqual(['apps/server/features/auth/index.ts', 'apps/client/features/auth/index.ts']);
		expect(payment?.changedFiles).toEqual(['apps/server/features/payment/index.ts']);
	});

	it('substitutes multiple placeholders into the target path', () => {
		const intent = makeIntent({
			name: 'app-features',
			watch: ['apps/<APP>/features/<FEATURE_NAME>/**'],
			readme: 'docs/<APP>/<FEATURE_NAME>.md',
		});
		const files = ['apps/server/features/auth/index.ts', 'apps/client/features/auth/index.ts'];
		const targets = resolveMappingTargets(intent, files);
		expect(targets).toHaveLength(2);

		const paths = targets.map((t) => t.targetPath).toSorted();
		expect(paths).toEqual(['docs/client/auth.md', 'docs/server/auth.md']);
	});

	it('honors exclude patterns', () => {
		const intent = makeIntent({ exclude: ['**/*.test.ts'] });
		const files = ['apps/server/features/inspections/index.ts', 'apps/server/features/inspections/index.test.ts'];
		const targets = resolveMappingTargets(intent, files);
		expect(targets).toHaveLength(1);
		expect(targets[0].changedFiles).toEqual(['apps/server/features/inspections/index.ts']);
	});

	it('returns empty array when no files match', () => {
		const intent = makeIntent();
		const targets = resolveMappingTargets(intent, ['unrelated/file.ts']);
		expect(targets).toEqual([]);
	});
});
