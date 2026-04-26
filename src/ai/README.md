# AI Component

The AI Component provides functionality for generating structured README documentation based on a defined schema. It leverages OpenAI's natural language processing capabilities to produce high-quality documentation from code comments and structure.

## Features

- Generates README documentation automatically from source code comments
- Supports strict mode validation for structured output
- Handles optional fields correctly using nullable types
- Ensures compliance with OpenAI API schema requirements

## Usage

To use the AI Component, ensure you have the necessary dependencies installed. Then, you can invoke the `generateReadme` function from the AI module by passing the path to the source code you want to document. Here is an example:

```typescript
import { generateReadme } from './ai';

const pathToSource = 'src/index.ts';
generateReadme(pathToSource)
  .then((readme) => console.log(readme))
  .catch((error) => console.error('Error generating README:', error));
```