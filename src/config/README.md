# Config Feature

The Config feature introduces an optional `.docloop.yml` configuration layer that enables users to define per-feature mappings, provide custom prompts, and manage triggers for README updates, enhancing the flexibility and control over the documentation process.

## Features

- Supports optional `.docloop.yml` configuration
- Allows per-feature watch→README mappings
- Custom prompt file specification for agent directives
- Flexible update triggers including `pr_opened` and `workflow_dispatch`
- Backward compatibility with legacy README generation

## Usage

To utilize the Config feature, create a `.docloop.yml` file in the root of your repository. Here’s an example of what the file might look like:

```yaml
mappings:
  - feature: FeatureA
    watch: 'src/featureA/**/*.ts'
    readme: 'docs/featureA.md'
    format: structured

prompts:
  - type: custom
    file: 'prompts/custom_prompt.md'

triggers:
  - pull_request_opened
  - workflow_dispatch
```

With this setup, the documentation action will listen for specified triggers and utilize the defined mappings and prompts accordingly. You can then run your documentation workflow to see the changes reflected in your README file.

## Examples

To create a mapping for a feature, include it in the `.docloop.yml` under the mappings section, specifying the files to watch and the corresponding README output location.

To provide a custom prompt, specify the path to your Markdown file within the prompts section. The action will use this prompt as the primary directive for generating updates.

To use the new triggers, simply list them under the triggers section. The action will automatically respond to these events based on your configuration.