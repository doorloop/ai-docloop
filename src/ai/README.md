# AI Component

The AI component provides functionality to generate structured README content based on predefined schemas, ensuring compliance with OpenAI's structured-output strict mode requirements. Recent refactoring has improved the organization of prompt text within the component, making it more maintainable and readable.

## Features

- Ensures compliance with OpenAI structured-output strict mode
- Declares additional properties as false for strict JSON schema validation
- Lists all properties in the required array to enforce explicit definitions
- Handles optional content using nullable types for clarity in schema definitions
- Improved organization of static prompt text using named module-level constants
- Byte-identical output after refactoring, ensuring no changes to functionality

## Usage

To use the AI component, you can call the `getReadmeSchema` function to retrieve the schema for your README files. Example usage:

```typescript
import { getReadmeSchema } from './ai/schema';

const schema = getReadmeSchema();
console.log(schema);
```

Additionally, you can construct prompts using the updated `buildPrompt` function, which utilizes module-level constants for static prompt text. Example:

```typescript
import { buildPrompt } from './ai/prompt';

const context = {}; // Your context here
const options = {}; // Your options here
const prompt = buildPrompt(context, options);
console.log(prompt);
```

## Examples

To retrieve the schema for your README files, call the `getReadmeSchema` function.

To generate prompts, use the `buildPrompt` function with appropriate context and options.
