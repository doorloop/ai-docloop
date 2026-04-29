// Minimal YAML frontmatter parser scoped to what we need:
// `paths:` (string array) and `title:` (single string). We deliberately don't
// pull in a full YAML library because docloop ships `dist/index.js` to action
// runners and we want to keep the bundle small. The parser handles the
// common shapes used by docloop insights files:
//
//     ---
//     title: Inspections — Critical Insights
//     paths:
//       - apps/server/src/features/inspections/**
//       - apps/server/src/jobs/dataModels/inspectionJob.ts
//     ---
//
// It is intentionally strict about indentation and structure. If a candidate
// file deviates, the caller treats it as "no routing info" rather than
// trying to recover.

const FRONTMATTER_DELIMITER = '---';

interface ParsedFrontmatter {
	title?: string;
	paths: string[];
}

export function parseFrontmatter(rawContent: string): ParsedFrontmatter | null {
	const lines = rawContent.split('\n');
	if (lines.length === 0 || lines[0].trim() !== FRONTMATTER_DELIMITER) {
		return null;
	}

	let endIndex = -1;
	for (let i = 1; i < lines.length; i++) {
		if (lines[i].trim() === FRONTMATTER_DELIMITER) {
			endIndex = i;
			break;
		}
	}
	if (endIndex === -1) {
		return null;
	}

	const block = lines.slice(1, endIndex);
	let title: string | undefined;
	const paths: string[] = [];
	let inPaths = false;

	for (const line of block) {
		// Top-level scalar: `key: value` (no leading whitespace).
		if (/^[A-Za-z_][A-Za-z0-9_]*:/.test(line)) {
			inPaths = false;
			const colon = line.indexOf(':');
			const key = line.slice(0, colon).trim();
			const value = line.slice(colon + 1).trim();

			if (key === 'title') {
				title = stripQuotes(value);
				continue;
			}
			if (key === 'paths') {
				inPaths = true;
				// Inline form `paths: [a, b]` is also tolerated.
				if (value.length > 0 && value !== '[]') {
					const inline = parseInlineList(value);
					if (inline !== null) {
						paths.push(...inline);
						inPaths = false;
					}
				}
			}
			continue;
		}

		// List item under `paths:` — must start with whitespace + `- `.
		if (inPaths) {
			const match = /^\s+-\s+(.+)$/.exec(line);
			if (match) {
				paths.push(stripQuotes(match[1].trim()));
			}
		}
	}

	return { title, paths };
}

function stripQuotes(value: string): string {
	if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
		return value.slice(1, -1);
	}
	return value;
}

function parseInlineList(value: string): string[] | null {
	if (!value.startsWith('[') || !value.endsWith(']')) {
		return null;
	}
	const inner = value.slice(1, -1).trim();
	if (inner.length === 0) return [];
	return inner.split(',').map((s) => stripQuotes(s.trim()));
}
