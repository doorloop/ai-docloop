import type { KnipConfig } from 'knip';

const config: KnipConfig = {
	ignoreDependencies: [
		// Driven by cycjimmy/semantic-release-action in CI; not imported from source.
		'semantic-release',
		'@semantic-release/changelog',
		'@semantic-release/git',
	],
	ignoreBinaries: [
		// Installed externally (brew install act); referenced only by the act:test script.
		'act',
	],
};

export default config;
