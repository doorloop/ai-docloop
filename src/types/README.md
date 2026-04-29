# Types

The Types component provides a structured way to define and manage types used across the project, ensuring type safety and consistency. This includes the definition of optional fields, which can now be explicitly marked as nullable to align with strict JSON schema requirements. The recent updates introduce a new `readmeCandidates` property, making the `readme` field optional and enhancing the routing capabilities for documentation generation.

## Features

- Explicit declaration of optional fields as nullable types
- Alignment with OpenAI structured-output strict mode
- Improved type safety and consistency across the project
- New `readmeCandidates` property to enhance documentation routing

## Usage

To utilize the Types component in your project, simply import the types from `src/types/config.ts` and use them in your TypeScript files. For example:

```typescript
import { Config } from './types/config';

const example: Config = {
	readmeCandidates: ['docs/wiki/insights/*-feature.md'],
	// other config properties
};
```

## Examples

To define a configuration with optional readme candidates:

```typescript
const config: Config = {
	readmeCandidates: ['docs/wiki/insights/*-feature.md'],
	// other optional fields
};
```