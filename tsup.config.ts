import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: 'cjs',
	platform: 'node',
	target: 'node20',
	outDir: 'dist',
	splitting: false,
	clean: true,
	noExternal: ['@actions/core', '@actions/exec', '@actions/github', 'openai', 'normalize-path', 'yaml'],
});
