# lib

The 'lib' component provides core functionality for managing readme candidates and their routing based on specified watch paths. This component enhances the workflow by filtering candidate paths according to the defined watch scope, ensuring that only relevant changes trigger documentation updates. Additionally, it introduces compatibility enhancements for Markdown formatters used in consumer repositories.

## Features

- Pre-filters candidate paths based on specified watch patterns.
- Ensures that only changes within the watch scope trigger documentation updates.
- Maintains compatibility with existing candidate path configurations.
- Improves semantic consistency in routing behavior across placeholder and candidate modes.
- Newly appends a trailing newline to generated files for Markdown compatibility.
- Allows consumers to specify a formatting command to be executed on generated files.

## Usage

To utilize the 'lib' component, ensure that your configuration includes a 'watch' property that defines the file paths to monitor. The library will automatically filter incoming changes based on this watch property before evaluating candidate paths. Furthermore, you can specify a 'format_command' to format generated files before committing them. Example configuration:

```yaml
watch:
    - apps/server/src/features/**
    - apps/client/src/features/**
candidates:
    paths:
        - apps/server/src/constants/cashPayments.ts
        - apps/server/src/infrastructure/rabbitmq/definitions/embeddedFinancing/**
format_command: bunx --no-install prettier --write
```

In this setup, only changes within the specified watch paths will trigger documentation updates, and any generated files will be formatted according to the provided command.

## Examples

A PR touching `apps/server/src/constants/cashPayments.ts` will not fire documentation updates, as it is outside the watch scope.

Changes within `apps/server/src/features/**` will continue to route normally, triggering the appropriate documentation updates.

If your project uses Prettier, you can opt-in to formatting by adding `format_command: bunx --no-install prettier --write` to your configuration.
