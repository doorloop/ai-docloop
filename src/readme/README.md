# README Component

The README component provides an automated mechanism for generating and updating project documentation based on code changes. It includes support for an optional `.docloop.yml` configuration file that allows users to define mappings, prompts, and triggers for when README updates should occur.

## Features

- Optional `.docloop.yml` configuration for flexible README generation
- Support for custom prompt markdown files to guide documentation updates
- Triggers for automatic updates on specific events like pull requests or manual workflows
- Backward compatibility with existing README generation workflows
- Enhanced glob pattern matching for file watching and mapping

## Usage

To use the README component, include an optional `.docloop.yml` file in your project root. The file can define mappings for features, custom prompts, and triggers for README updates. Here is an example of a `.docloop.yml` configuration:

```yaml
mappings:
  - feature: "My Feature"
    watch: "src/my_feature"
    prompt: "prompts/my_feature.md"
triggers:
  - name: "pr_opened"
    delivery: "pr_comment"
```

After setting up the configuration file, you can invoke the README generation process through your CI pipeline or manually by running the appropriate command. The system will evaluate changes and decide if an update is necessary based on the defined mappings and triggers.

## Examples

Create a `.docloop.yml` file to customize your README generation.

Use predefined triggers to automate README updates on pull requests.

Define specific mappings for features to control which parts of the codebase affect the README.