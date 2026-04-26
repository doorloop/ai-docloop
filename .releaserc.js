const config = {
	branches: ['main'],
	repositoryUrl: 'git+https://github.com/doorloop/ai-docloop',
	plugins: [
		[
			'@semantic-release/commit-analyzer',
			{
				preset: 'angular',
				releaseRules: [
					{ type: 'chore', release: 'minor' },
					{ type: 'feat', release: 'minor' },
					{ type: 'fix', release: 'patch' },
					{ type: 'perf', release: 'patch' },
					{ type: 'breaking', release: 'major' },
				],
			},
		],
		'@semantic-release/release-notes-generator',
		'@semantic-release/changelog',
		['@semantic-release/npm', { npmPublish: false }],
		[
			'@semantic-release/git',
			{
				assets: ['package.json', 'CHANGELOG.md', 'dist/**'],
				message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
			},
		],
		'@semantic-release/github',
	],
};

module.exports = config;
