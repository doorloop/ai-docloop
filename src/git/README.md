# Git Integration with .docloop.yml Configuration

This component enhances Git integration by adding support for an optional `.docloop.yml` configuration file, allowing users to specify mappings, prompts, and triggers for README updates based on feature changes in their projects. It enables more flexible documentation workflows while maintaining backward compatibility with existing setups.

## Features

- Optional `.docloop.yml` configuration for enhanced mapping and prompt customization.
- Backward compatibility with existing v1 configurations without requiring changes.
- Supports new triggers for pull requests and manual workflows, enabling versatile documentation updates.
- Automatic grouping of changed files based on capture tuples in glob patterns for efficient README generation.
- Detailed validation for the `.docloop.yml` configuration to prevent errors in field paths and target collisions.

## Usage

### Installation
To use this feature, ensure your project has the required dependencies installed. If you have not yet added the necessary packages, you can use the following command:

```bash
bun install
yarn add <required-packages>
```

### Configuration
Create an optional `.docloop.yml` file in the root of your repository:

```yaml
# Example .docloop.yml
mappings:
  featureName:
    prompt: 'path/to/your/prompt.md'
    watch: 'glob-pattern/**/*'

triggers:
  - pr_opened
  - workflow_dispatch
```

### Usage Example
Once you have configured your `.docloop.yml`, you can trigger actions based on the specified events. For example, on a new pull request or workflow dispatch, the agent will evaluate if a README update is needed based on the changes detected in the mapped files. The output will be previewed as a PR comment or directly committed to the branch.

### Running the Integration
To run the integration and see it in action, use the command:

```bash
bun run your-command-here
```

Check the output for any README updates that have been proposed based on your configuration.

## Examples

To create a new pull request and trigger README updates, simply push your changes to the branch and open a PR. If your `.docloop.yml` is configured correctly, you will see a comment with proposed updates.

You can also manually trigger the workflow by running the command corresponding to the `workflow_dispatch` event. This can be useful for testing your `.docloop.yml` configuration before merging.