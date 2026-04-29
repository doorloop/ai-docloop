# Types

The Types component provides a structured way to define and manage types used across the project, ensuring type safety and consistency. This includes the definition of optional fields, which can now be explicitly marked as nullable to align with strict JSON schema requirements. Recent updates enhance the configuration for pull request handling.

## Features

- Explicit declaration of optional fields as nullable types
- Alignment with OpenAI structured-output strict mode
- Improved type safety and consistency across the project
- New `prTitle` input to customize the PR title for different documentation pipelines
- Auto-request review from source PR author for enhanced workflow efficiency

## Usage

To utilize the Types component in your project, simply import the types from `src/types/config.ts` and use them in your TypeScript files. For example:

```typescript
import { MappingIntent } from './types/config';

const example: MappingIntent = {
	prTitle: 'Custom PR Title', // Override default PR title
	requestReviewFromPrAuthor: true, // Enable auto-request review from the PR author
};
```

## Examples

To set a custom PR title:
  ```typescript
  const config: MappingIntent = {
    prTitle: 'Custom Documentation Update',
  };
  ```

To disable auto-review from the PR author:
  ```typescript
  const config: MappingIntent = {
    requestReviewFromPrAuthor: false,
  };
  ```