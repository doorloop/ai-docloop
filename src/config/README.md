# Config

The Config component provides a flexible routing mechanism for documentation generation based on YAML frontmatter, allowing for complex mappings between source files and documentation files.

## Features

- Supports multiple source files to a single documentation file mapping.
- Allows single documentation files to be associated with multiple source directories.
- Ignores naming conventions by allowing flexible file name mappings via frontmatter.

## Usage

To use the Config component, define your documentation files using the new `readme_candidates` input in your workflow. Each candidate documentation file must include a YAML frontmatter section with the `title` and `paths` fields. For example:

```yaml
---
title: Inspections Feature Insights
paths:
  - apps/server/src/features/inspections/**
  - docs/wiki/insights/inspections-feature.md
---
```

In your workflow configuration, replace the `readme` field with `readme_candidates`:

```yaml
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Docs
        uses: your-org/your-repo@main
        with:
          readme_candidates: docs/wiki/insights/*-feature.md
```
This allows the action to parse each candidate's frontmatter and route source files accordingly.

## Examples

Example 1: Mapping a single source directory to multiple documentation files using the `paths` array in YAML frontmatter.

Example 2: Configuring multiple unrelated source globs for a single documentation file, enhancing documentation reuse.