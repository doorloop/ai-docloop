import { describe, expect, it } from 'bun:test';

import { parseFrontmatter } from '../frontmatter';

describe('parseFrontmatter', () => {
	it('parses title and a paths block', () => {
		const raw = `---
title: Inspections — Critical Insights
category: insights
paths:
  - apps/server/src/features/inspections/**
  - apps/server/src/jobs/dataModels/inspectionJob.ts
---

# Body
`;
		const fm = parseFrontmatter(raw);
		expect(fm).not.toBeNull();
		expect(fm?.title).toBe('Inspections — Critical Insights');
		expect(fm?.paths).toEqual(['apps/server/src/features/inspections/**', 'apps/server/src/jobs/dataModels/inspectionJob.ts']);
	});

	it('returns null when there is no frontmatter delimiter', () => {
		expect(parseFrontmatter('# Just markdown\n\nNo frontmatter here.')).toBeNull();
	});

	it('returns null when the closing delimiter is missing', () => {
		expect(parseFrontmatter('---\ntitle: x\npaths:\n  - a/**\n')).toBeNull();
	});

	it('handles an empty paths array via inline form', () => {
		const fm = parseFrontmatter('---\npaths: []\n---\n');
		expect(fm?.paths).toEqual([]);
	});

	it('strips quoted scalars on title and list items', () => {
		const raw = `---
title: "Quoted Title"
paths:
  - "apps/server/**"
  - 'apps/client/**'
---
`;
		const fm = parseFrontmatter(raw);
		expect(fm?.title).toBe('Quoted Title');
		expect(fm?.paths).toEqual(['apps/server/**', 'apps/client/**']);
	});

	it('ignores list items that come before the paths key', () => {
		const raw = `---
sources_audited:
  - apps/server/foo.ts
title: T
paths:
  - apps/server/bar/**
---
`;
		const fm = parseFrontmatter(raw);
		expect(fm?.paths).toEqual(['apps/server/bar/**']);
	});

	it('returns paths even when title is missing', () => {
		const raw = `---
paths:
  - apps/server/x/**
---
`;
		const fm = parseFrontmatter(raw);
		expect(fm?.title).toBeUndefined();
		expect(fm?.paths).toEqual(['apps/server/x/**']);
	});
});
