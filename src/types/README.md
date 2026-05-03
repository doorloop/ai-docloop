# Types

The Types component provides a structured way to define and manage types used across the project, ensuring type safety and consistency. This includes the definition of optional fields, which can now be explicitly marked as nullable to align with strict JSON schema requirements. Recent updates enhance formatter compatibility for generated files.

## Features

- Explicit declaration of optional fields as nullable types
- Alignment with OpenAI structured-output strict mode
- Improved type safety and consistency across the project
- Formatter compatibility for markdown generated files, ensuring they end with a trailing newline and can be formatted using a specified command.

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

Additionally, you can now specify a `format_command` in your configuration to format files automatically before committing. Here's how to add it to your workflow:

```yaml
- uses: doorloop/ai-docloop@v2
  with:
      format_command: bunx --no-install prettier --write
```

## Examples

To format a generated README file using prettier, include the following in your GitHub Actions configuration:

```yaml
- uses: doorloop/ai-docloop@v2
  with:
      format_command: bunx --no-install prettier --write
```

For using the Types component:

```typescript
import { MyType } from './types/readme';

const example: MyType = {
	title: 'Example Title',
	usage: 'This is an example usage of MyType.',
	features: null,
};
```
