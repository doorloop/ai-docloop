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
	it('low detail returns the minimum content fields plus the update signal', () => {
		const schema = asSchema(getReadmeSchema('low')).json_schema.schema;
		expect(schema.required).toEqual(['title', 'description', 'usage', 'should_update', 'update_reason']);
		expect(Object.keys(schema.properties).toSorted()).toEqual(['description', 'should_update', 'title', 'update_reason', 'usage']);
	});

	it('medium detail adds features and examples', () => {
		const schema = asSchema(getReadmeSchema('medium')).json_schema.schema;
		expect(schema.required).toEqual(['title', 'description', 'usage', 'features', 'examples', 'should_update', 'update_reason']);
	});

	it('high detail adds installation/api/configuration/notes', () => {
		const schema = asSchema(getReadmeSchema('high')).json_schema.schema;
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
		const schema = asSchema(getReadmeSchema('medium'));
		expect(schema.json_schema.strict).toBe(true);
		expect(schema.json_schema.schema.additionalProperties).toBe(false);
	});

	it('models the update signal types correctly', () => {
		const schema = asSchema(getReadmeSchema('low')).json_schema.schema;
		expect(schema.properties.should_update).toMatchObject({ type: 'boolean' });
		expect(schema.properties.update_reason).toMatchObject({ type: 'string' });
	});
});
