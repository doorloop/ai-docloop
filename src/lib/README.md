# lib

The 'lib' component provides core functionality for managing readme candidates and their routing based on specified watch paths. This component enhances the workflow by filtering candidate paths according to the defined watch scope, ensuring that only relevant changes trigger documentation updates. This README has been enhanced with a structured layout including feature highlights, clear usage instructions, and a branded footer for better visibility and engagement.

## Features

- Single-step install
- Two routing modes
- Bring Your Own (BYO) prompt
- No-churn updates
- Four delivery modes
- Auto-routed reviews

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

In this setup, only changes within the specified watch paths will trigger documentation updates. A PR touching `apps/server/src/constants/cashPayments.ts` will not fire documentation updates, as it is outside the watch scope. Changes within `apps/server/src/features/**` will continue to route normally, triggering the appropriate documentation updates.

## Examples

> [!TIP]  Required permissions must be granted for the routing modes to function correctly.
> [!IMPORTANT]  Ensure that the prompt-file context limits are adhered to in order to avoid unexpected behavior.
> [!NOTE]  Candidate frontmatter safety guarantees are in place for all routing functions.