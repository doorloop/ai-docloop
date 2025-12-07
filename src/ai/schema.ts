type StructuredOutput = {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
};

export function getReadmeSchema(detailLevel: 'low' | 'medium' | 'high'): StructuredOutput {
  const baseSchema = {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string',
        description: 'The title/name of the feature or component',
      },
      description: {
        type: 'string',
        description: 'A clear, concise description of what this feature/component does',
      },
      usage: {
        type: 'string',
        description: 'How to use this feature/component, including code examples',
      },
    },
    required: ['title', 'description', 'usage'],
  };

  if (detailLevel === 'low') {
    return {
      type: 'json_schema',
      json_schema: {
        name: 'readme_structure',
        strict: true,
        schema: baseSchema,
      },
    };
  }

  const mediumSchema = {
    ...baseSchema,
    properties: {
      ...baseSchema.properties,
      features: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of key features or capabilities',
      },
      examples: {
        type: 'array',
        items: { type: 'string' },
        description: 'Code examples demonstrating usage',
      },
    },
  };

  if (detailLevel === 'medium') {
    return {
      type: 'json_schema',
      json_schema: {
        name: 'readme_structure',
        strict: true,
        schema: mediumSchema,
      },
    };
  }

  // High detail level
  return {
    type: 'json_schema',
    json_schema: {
      name: 'readme_structure',
      strict: true,
      schema: {
        ...mediumSchema,
        properties: {
          ...mediumSchema.properties,
          installation: {
            type: 'string',
            description: 'Installation or setup instructions if applicable',
          },
          api: {
            type: 'string',
            description: 'API documentation, method signatures, or interface details',
          },
          configuration: {
            type: 'string',
            description: 'Configuration options, environment variables, or settings',
          },
          notes: {
            type: 'string',
            description: 'Additional notes, best practices, or important considerations',
          },
        },
      },
    },
  };
}

