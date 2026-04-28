# lib

The `lib` component provides advanced functionality for managing feature-specific README updates using a configuration layer defined in `.docloop.yml`. It includes utilities for glob pattern matching, file mapping, and triggers for automated documentation updates based on repository events.

## Features

- Optional `.docloop.yml` configuration for feature-specific mappings
- Glob pattern compiler with advanced capture capabilities
- Trigger support for pull request events and workflow dispatches
- Backward compatibility with existing pipeline inputs
- Automated README updates based on user-defined prompts and conditions

## Usage

To utilize the `lib` component, ensure that your project includes a `.docloop.yml` file at the root. This file can define mappings for features, specify a prompt for documentation updates, and set triggers for when these updates should occur. Below is an example of a `.docloop.yml` configuration:

```yaml
mappings:
  myFeature:
    watch: "src/myFeature/**/*.ts"
    readme_template: "README.myFeature.md"
    prompt: "./prompts/myFeature.md"
triggers:
  - pr_opened
  - workflow_dispatch
```

Once configured, the library will handle the processing of changes and updates to README files based on the specified mappings and triggers. You can run the action using existing inputs or leverage the new functionality for advanced behavior.

## Examples

Example of a glob pattern with `<NAME>` captures: `src/features/<NAME>/**/*.ts` can capture any feature name and adjust README files accordingly.

Using triggers to automate README updates upon pull request events, ensuring documentation reflects the latest changes in the codebase.