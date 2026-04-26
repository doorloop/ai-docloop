type StructuredOutput = {
	type: 'json_schema';
	json_schema: {
		name: string;
		strict: boolean;
		schema: Record<string, unknown>;
	};
};

// OpenAI's structured-output strict mode requires:
//   1. additionalProperties: false on every object,
//   2. every property listed in `required`,
//   3. optional content represented via nullable types (e.g. ['string', 'null']),
//      not by leaving the field out of `required`.
// The runtime formatter (src/ai/formatter.ts) already treats null / empty values
// as "skip this section," so we model optional content as nullable and let the
// model emit null when a section has nothing to say.

const TITLE = {
	type: 'string',
	description: 'The title/name of the feature or component',
} as const;

const DESCRIPTION = {
	type: 'string',
	description: 'A clear, concise description of what this feature/component does',
} as const;

const USAGE = {
	type: 'string',
	description: 'How to use this feature/component, including code examples',
} as const;

const FEATURES = {
	type: ['array', 'null'],
	items: { type: 'string' },
	description: 'List of key features or capabilities. Null when there is nothing meaningful to list.',
} as const;

const EXAMPLES = {
	type: ['array', 'null'],
	items: { type: 'string' },
	description: 'Code examples demonstrating usage. Null when no examples apply.',
} as const;

const INSTALLATION = {
	type: ['string', 'null'],
	description: 'Installation or setup instructions. Null when not applicable.',
} as const;

const API = {
	type: ['string', 'null'],
	description: 'API documentation, method signatures, or interface details. Null when not applicable.',
} as const;

const CONFIGURATION = {
	type: ['string', 'null'],
	description: 'Configuration options, environment variables, or settings. Null when not applicable.',
} as const;

const NOTES = {
	type: ['string', 'null'],
	description: 'Additional notes, best practices, or important considerations. Null when there are none.',
} as const;

function wrap(schema: Record<string, unknown>): StructuredOutput {
	return {
		type: 'json_schema',
		json_schema: {
			name: 'readme_structure',
			strict: true,
			schema,
		},
	};
}

export function getReadmeSchema(detailLevel: 'low' | 'medium' | 'high'): StructuredOutput {
	if (detailLevel === 'low') {
		return wrap({
			type: 'object',
			additionalProperties: false,
			properties: {
				title: TITLE,
				description: DESCRIPTION,
				usage: USAGE,
			},
			required: ['title', 'description', 'usage'],
		});
	}

	if (detailLevel === 'medium') {
		return wrap({
			type: 'object',
			additionalProperties: false,
			properties: {
				title: TITLE,
				description: DESCRIPTION,
				usage: USAGE,
				features: FEATURES,
				examples: EXAMPLES,
			},
			required: ['title', 'description', 'usage', 'features', 'examples'],
		});
	}

	return wrap({
		type: 'object',
		additionalProperties: false,
		properties: {
			title: TITLE,
			description: DESCRIPTION,
			usage: USAGE,
			features: FEATURES,
			examples: EXAMPLES,
			installation: INSTALLATION,
			api: API,
			configuration: CONFIGURATION,
			notes: NOTES,
		},
		required: ['title', 'description', 'usage', 'features', 'examples', 'installation', 'api', 'configuration', 'notes'],
	});
}
