import { describe, expect, it } from 'bun:test';

import { getReadmeSchema } from '../schema';

interface SchemaShape {
	type: 'json_schema';
	json_schema: {
		name: string;
		strict: boolean;
		schema: {
			type: 'object';
			additionalProperties: false;
			properties: Record<string, unknown>;
			required: string[];
		};
	};
}

function asSchema(out: ReturnType<typeof getReadmeSchema>): SchemaShape {
	return out as SchemaShape;
}

describe('getReadmeSchema', () => {
	it('returns three required fields at low detail level (no signal)', () => {
		const schema = asSchema(getReadmeSchema('low')).json_schema.schema;
		expect(schema.required).toEqual(['title', 'description', 'usage']);
		expect(Object.keys(schema.properties).toSorted()).toEqual(['description', 'title', 'usage']);
	});

	it('returns five required fields at medium detail level (no signal)', () => {
		const schema = asSchema(getReadmeSchema('medium')).json_schema.schema;
		expect(schema.required).toEqual(['title', 'description', 'usage', 'features', 'examples']);
	});

	it('returns nine required fields at high detail level (no signal)', () => {
		const schema = asSchema(getReadmeSchema('high')).json_schema.schema;
		expect(schema.required).toEqual(['title', 'description', 'usage', 'features', 'examples', 'installation', 'api', 'configuration', 'notes']);
	});

	it('appends should_update and update_reason when withUpdateSignal=true at low detail', () => {
		const schema = asSchema(getReadmeSchema('low', { withUpdateSignal: true })).json_schema.schema;
		expect(schema.required).toEqual(['title', 'description', 'usage', 'should_update', 'update_reason']);
		expect(schema.properties.should_update).toMatchObject({ type: 'boolean' });
		expect(schema.properties.update_reason).toMatchObject({ type: 'string' });
	});

	it('appends should_update and update_reason at high detail too', () => {
		const schema = asSchema(getReadmeSchema('high', { withUpdateSignal: true })).json_schema.schema;
		expect(schema.required).toEqual([
			'title',
			'description',
			'usage',
			'features',
			'examples',
			'installation',
			'api',
			'configuration',
			'notes',
			'should_update',
			'update_reason',
		]);
	});

	it('keeps strict mode and additionalProperties: false', () => {
		const schema = asSchema(getReadmeSchema('medium', { withUpdateSignal: true }));
		expect(schema.json_schema.strict).toBe(true);
		expect(schema.json_schema.schema.additionalProperties).toBe(false);
	});
});
