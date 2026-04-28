# AI Component

The AI component provides functionality to generate structured README content based on predefined schemas. It ensures compliance with OpenAI's structured-output strict mode requirements and allows for advanced configuration through a new `.docloop.yml` file.

## Features

- Ensures compliance with OpenAI structured-output strict mode
- Declares additional properties as false for strict JSON schema validation
- Lists all properties in the required array to enforce explicit definitions
- Handles optional content using nullable types for clarity in schema definitions
- Supports an optional `.docloop.yml` configuration for advanced mappings and prompts
- Allows users to supply their own prompt MD file as the agent's primary directive
- Enables the model to decide whether a change is worth a README update
- Introduces new triggers and deliveries for enhanced integration with pull requests and workflow dispatches.

## Usage

To use the AI component, you can call the `getReadmeSchema` function to retrieve the schema for your README files. You can also utilize the new features provided by the `.docloop.yml` configuration for advanced usage. Example usage:

```typescript
import { getReadmeSchema, generateMappingReadme } from './ai/schema';

const schema = getReadmeSchema();
console.log(schema);

const readmeResult = generateMappingReadme(someMappings);
console.log(readmeResult);
```

## Examples

Basic usage of getReadmeSchema to retrieve the schema for your README files.

Using generateMappingReadme to create README content based on specific mappings.

Configuring a .docloop.yml file to customize the behavior of the AI component.