import type { Config } from 'prettier';

const config: Config = {
	tabWidth: 4,
	printWidth: 160,
	useTabs: true,
	semi: true,
	singleQuote: true,
	quoteProps: 'consistent',
	trailingComma: 'all',
	bracketSpacing: true,
	arrowParens: 'always',
	bracketSameLine: false,
};

export default config;
