# Types

The Types component provides a structured way to define and manage types used across the project, ensuring type safety and consistency. This includes the definition of optional fields, which can now be explicitly marked as nullable to align with strict JSON schema requirements. Recent updates introduce a new `.docloop.yml` configuration layer for enhanced README generation and feature mapping.

## Features

- Explicit declaration of optional fields as nullable types
- Alignment with OpenAI structured-output strict mode
- Improved type safety and consistency across the project
- New `.docloop.yml` configuration for feature mappings and README generation
- Support for triggers like `pr_opened` and `workflow_dispatch`

## Usage

To utilize the Types component in your project, simply import the types from `src/types/readme.ts` and use them in your TypeScript files. For example:

```typescript
import { MyType, DocloopConfig, MappingConfig } from './types/readme';

const example: MyType = {
	title: 'Example Title',
	usage: 'This is an example usage of MyType.',
	features: null, // indicating no features available
};

const docloopConfig: DocloopConfig = {
	mappings: [], // Define your feature mappings here
	prompts: 'path/to/prompt.md', // Path to your prompt MD file
	triggers: ['pr_opened', 'workflow_dispatch'], // Specify triggers
};
```

This demonstrates how to define a type and utilize the new configuration structure for `.docloop.yml`. With the new features, you can also customize your README update triggers and mappings effectively.