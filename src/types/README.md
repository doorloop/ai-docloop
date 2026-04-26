# Types

The Types feature provides a structured way to define and handle type definitions within the codebase, ensuring type safety and clarity throughout the application.

## Features

- Provides a robust type-checking mechanism to avoid runtime errors.
- Supports nullable types to allow for explicit null values in type definitions.
- Ensures compatibility with OpenAI's structured-output strict mode for effective documentation generation.

## Usage

To define a type, use the following syntax:

```typescript
interface MyType {
    property1: string;
    property2?: number | null;
}

const example: MyType = {
    property1: 'Hello',
    property2: null // This is valid due to the nullable type definition
};
```

You can also use union types to allow a value to be one of several types:

```typescript
type Status = 'active' | 'inactive' | null;
const currentStatus: Status = 'active'; // or 'inactive' or null
```

Ensure that all optional fields in your types are defined as `?: T | null` to comply with strict mode requirements.