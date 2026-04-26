# AI Component

The AI component provides functionality to generate structured README content based on predefined schemas, ensuring compliance with OpenAI's structured-output strict mode requirements.

## Features

- Ensures compliance with OpenAI structured-output strict mode
- Declares additional properties as false for strict JSON schema validation
- Lists all properties in the required array to enforce explicit definitions
- Handles optional content using nullable types for clarity in schema definitions

## Usage

To use the AI component, you can call the `getReadmeSchema` function to retrieve the schema for your README files. Example usage:

```typescript
import { getReadmeSchema } from './ai/schema';

const schema = getReadmeSchema();
console.log(schema);
```
