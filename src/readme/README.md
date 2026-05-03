# Formatter Compatibility

Enhancements to the README generation process to ensure compatibility with various Markdown formatters. This feature introduces a consistent trailing newline and an opt-in command for formatting generated files.

## Features

- Always appends a trailing newline to generated README files for compatibility with Markdown formatters.
- Allows users to specify a custom formatting command via the `format_command` input in the GitHub Action workflow.
- Includes a variety of examples for popular formatters, making it easy for consumers to integrate this functionality.

## Usage

To utilize the new formatting features, specify the `format_command` in your workflow YAML. This command should point to your preferred formatter and will be executed on each generated README file before committing it to ensure compliance with your project's styling rules. Example YAML configuration:

```yaml
- uses: doorloop/ai-docloop@v2
  with:
      format_command: bunx --no-install prettier --write
```

The `writeReadmeAt` function will also now ensure that every generated README ends with a single trailing newline, which is essential for compatibility with Markdown formatters.

## Examples

Using Prettier with npm:

```yaml
format_command: bunx --no-install prettier --write
```

Using pnpm:

```yaml
format_command: pnpm exec prettier --write
```

Using dprint:

```yaml
format_command: dprint fmt
```
