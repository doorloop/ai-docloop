# lib

The 'lib' component provides core functionality for managing readme candidates and their routing based on specified watch paths. This component enhances the workflow by filtering candidate paths according to the defined watch scope, ensuring that only relevant changes trigger documentation updates.

## Features

- Pre-filters candidate paths based on specified watch patterns.
- Ensures that only changes within the watch scope trigger documentation updates.
- Maintains compatibility with existing candidate path configurations.
- Improves semantic consistency in routing behavior across placeholder and candidate modes.

## Usage

To utilize the 'lib' component, ensure that your configuration includes a 'watch' property that defines the file paths to monitor. The library will automatically filter incoming changes based on this watch property before evaluating candidate paths. Example configuration:

```yaml
watch:
    - apps/server/src/features/**
    - apps/client/src/features/**
candidates:
    paths:
        - apps/server/src/constants/cashPayments.ts
        - apps/server/src/infrastructure/rabbitmq/definitions/embeddedFinancing/**
```

In this setup, only changes within the specified watch paths will trigger documentation updates.

## Examples

A PR touching `apps/server/src/constants/cashPayments.ts` will not fire documentation updates, as it is outside the watch scope.

Changes within `apps/server/src/features/**` will continue to route normally, triggering the appropriate documentation updates.
