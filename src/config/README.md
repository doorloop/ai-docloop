# Configuration Management

The configuration management feature allows users to define formatting commands and ensure all generated Markdown files comply with popular formatting standards, enhancing compatibility across various consumer repositories.

## Features

- Always appends a trailing newline to generated files to prevent formatting errors.
- Allows consumers to specify their own formatting command for better integration with existing workflows.
- Logs warnings for non-zero exit statuses from formatters without blocking commits, ensuring smoother CI processes.

## Usage

To utilize the configuration management feature, specify the `format_command` in your workflow file. This command will be executed on each generated file before committing. Here’s an example YAML snippet:

```yaml
- uses: doorloop/ai-docloop@v2
  with:
      ...
      format_command: bunx --no-install prettier --write
```

This command will format your files according to the specified formatter, ensuring compatibility with your CI pipeline.

## Examples

For Prettier with npm or bun, use: `bunx --no-install prettier --write`.

For pnpm users, the command is: `pnpm exec prettier --write`.

For oxfmt, use: `bunx --no-install oxfmt --write`.

For dprint, simply use: `dprint fmt`.

For biome, the command is: `bunx --no-install biome format --write`.

For custom scripts, the format command would be: `bun run format:file --`.
