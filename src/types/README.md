# Types

The Types component provides a structured way to define and manage types used across the project, ensuring type safety and consistency. This includes the definition of optional fields, which can now be explicitly marked as nullable to align with strict JSON schema requirements.

## Features

- Explicit declaration of optional fields as nullable types
- Alignment with OpenAI structured-output strict mode
- Improved type safety and consistency across the project

## Usage

To utilize the Types component in your project, simply import the types from `src/types/readme.ts` and use them in your TypeScript files. For example:

```typescript
import { MyType } from './types/readme';

const example: MyType = {
	title: 'Example Title',
	usage: 'This is an example usage of MyType.',
	features: null, // indicating no features available
};
```
