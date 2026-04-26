module.exports = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		// Mirror the release-triggering types in .releaserc.js (chore, feat, fix, perf, breaking)
		// while keeping the rest of the conventional set so non-release commits stay valid.
		'type-enum': [2, 'always', ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test', 'breaking']],
	},
};
