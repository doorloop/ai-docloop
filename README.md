# DocLoop AI

> Automatically generate and update README files using AI when pull requests are merged

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Version](https://img.shields.io/github/v/tag/doorloop/ai-docloop)](https://github.com/doorloop/ai-docloop/releases)

DocLoop AI is a GitHub Action that leverages large language models (LLMs) to automatically generate and maintain README documentation for your codebase. It analyzes changes in merged pull requests and creates or updates README files in the affected directories, making documentation maintenance effortless.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Usage](#usage)
    - [Basic Example](#basic-example)
    - [Monorepo Example](#monorepo-example)
- [Inputs](#inputs)
- [How It Works](#how-it-works)
- [Path Scope Configuration](#path-scope-configuration)
- [Advanced configuration with `.docloop.yml`](#advanced-configuration-with-docloopyml)
- [Examples](#examples)
- [Development](#development)
- [Testing](#testing)
- [License](#license)

## Features

- **AI-Powered Documentation**: Automatically generates or updates README files using large language models (supports all OpenAI models including gpt-4o-mini, gpt-4o, and gpt-4-turbo)
- **Monorepo Support**: Configure multiple path scopes to handle complex monorepo architectures
- **Smart Update Modes**: Choose between updating existing READMEs or overwriting them completely
- **Configurable Detail Levels**: Control the depth and detail of generated documentation (low, medium, high)
- **Flexible Deployment**: Commit changes directly to the repository, open a PR, push to a PR's head branch, or post a preview comment for review
- **Branch Filtering**: Only process PRs merged into specified base branches using glob patterns
- **Path-Based Organization**: Automatically organizes documentation based on directory structure and path scopes
- **Watch → README Mappings** _(advanced)_: Drop in an optional `.docloop.yml` to declare per-feature mappings (e.g. `apps/server/features/<FEATURE_NAME>/**` → `docs/wiki/insights/<FEATURE_NAME>-feature.md`), supply your own prompt MD file as the agent's primary directive, and let the model decide whether the change is even worth a README update.

## Prerequisites

- GitHub repository with Actions enabled
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- A workflow job that grants `contents: write` and `pull-requests: write` permissions. The action picks up the workflow-provided token automatically via the `github_token` input default; override it only if you need a PAT (e.g., for cross-repo writes).

## Usage

### Basic Example

Create a workflow file (e.g., `.github/workflows/docloop.yml`):

```yaml
name: Update READMEs

on:
    pull_request:
        types: [closed]

jobs:
    update-readmes:
        runs-on: ubuntu-latest
        permissions:
            contents: write
            pull-requests: write
        steps:
            - name: Checkout code
              uses: actions/checkout@v4
              with:
                  token: ${{ secrets.GITHUB_TOKEN }}
                  fetch-depth: 0

            - name: Run DocLoop AI
              uses: doorloop/ai-docloop@v1
              with:
                  base_branches: main,develop
                  path_scopes: src/features/**
                  doc_root_depth_from_scope: 1
                  openai_api_key: ${{ secrets.OPENAI_API_KEY }}
                  create_pr: false
```

### Monorepo Example

For monorepo setups with multiple path scopes:

```yaml
- name: Run DocLoop AI
  uses: doorloop/ai-docloop@v1
  with:
      base_branches: main
      path_scopes: |
          apps/client/src/features/**
          packages/ui/components/**
          libs/shared/utils/**
      doc_root_depth_from_scope: 1
      detail_level: high
      openai_model: gpt-4o
      openai_api_key: ${{ secrets.OPENAI_API_KEY }}
      update_mode: update
      create_pr: true
```

## Inputs

| Input                       | Required | Default                          | Description                                                                                                                                                                                                                                                                         |
| --------------------------- | -------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base_branches`             | Yes      | -                                | Comma or newline separated list of base branch names (supports glob patterns like `release/*`)                                                                                                                                                                                      |
| `path_scopes`               | Yes      | -                                | One or more glob-like path scopes (comma or newline separated) that define where changes are tracked                                                                                                                                                                                |
| `doc_root_depth_from_scope` | No       | `1`                              | How many path segments below the scope root define a single doc root                                                                                                                                                                                                                |
| `readme_filename`           | No       | `README.md`                      | Name of the README file to create/update in each doc root                                                                                                                                                                                                                           |
| `detail_level`              | No       | `medium`                         | Controls how detailed the README should be. Options: `low`, `medium`, `high`                                                                                                                                                                                                        |
| `openai_model`              | No       | `gpt-4o-mini`                    | OpenAI model identifier (e.g., `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`)                                                                                                                                                                                                              |
| `openai_api_key`            | Yes      | -                                | OpenAI API key (should be stored in GitHub secrets)                                                                                                                                                                                                                                 |
| `update_mode`               | No       | `update`                         | `update` to merge with existing README, `overwrite` for fresh generation                                                                                                                                                                                                            |
| `commit_message`            | No       | `docs: update READMEs [skip ci]` | Commit message used for the documentation commit                                                                                                                                                                                                                                    |
| `create_pr`                 | No       | `false`                          | When `true`, creates a PR instead of committing directly                                                                                                                                                                                                                            |
| `github_token`              | No       | `${{ github.token }}`            | Token for reading PR files and pushing commits / opening PRs. The default uses the workflow-provided token; override only to use a PAT with cross-repo permissions                                                                                                                  |
| `config_file`               | No       | `.docloop.yml`                   | Path to an optional `.docloop.yml` (see [Advanced configuration](#advanced-configuration-with-docloopyml)). When the file exists at this path, all rich config (mappings, triggers, prompts) comes from there. When absent, the action uses the inputs above (legacy v1 behaviour). |

## How It Works

1. **Trigger**: The action runs when a pull request is merged (`pull_request` event with `types: [closed]`)
2. **Validation**: Verifies that the PR was actually merged and the base branch matches one of the configured `base_branches`
3. **File Detection**: Retrieves all changed files from the merged PR using the GitHub API
4. **Path Mapping**: Maps changed files to documentation root folders based on `path_scopes` and `doc_root_depth_from_scope`
5. **README Generation**: For each identified doc root:
    - Reads existing README content if present (when `update_mode: update`)
    - Analyzes changed files and PR context
    - Uses OpenAI API to generate or update README content
    - Writes the updated README file to disk
6. **Commit**: Stages, commits, and pushes changes either directly to the branch or via a pull request (based on `create_pr` setting)

## Path Scope Configuration

The `path_scopes` input uses glob-like patterns to define which parts of your codebase should trigger README generation. Combined with `doc_root_depth_from_scope`, you can control how documentation is organized.

### Example

Given the configuration:

- `path_scopes: apps/client/src/features/**`
- `doc_root_depth_from_scope: 1`

For a changed file: `apps/client/src/features/inspection/components/Button.tsx`

- **Scope root**: `apps/client/src/features`
- **Doc root**: `apps/client/src/features/inspection` (1 level deep from scope root)
- **README location**: `apps/client/src/features/inspection/README.md`

### Multiple Path Scopes

You can define multiple path scopes to handle different parts of your monorepo:

```yaml
path_scopes: |
    apps/client/src/features/**
    packages/ui/components/**
    libs/shared/utils/**
```

Each scope is processed independently, allowing different documentation strategies for different parts of your codebase.

## Advanced configuration with `.docloop.yml`

For richer setups — multiple watch→README mappings, custom prompts, per-mapping behaviour, additional triggers, or PR previews — drop a `.docloop.yml` at your repo root. When the file is present the action reads its config from there and ignores most of the legacy inputs (only `openai_api_key` and `github_token` still come from action inputs, since they belong in secrets). When the file is absent, behaviour is unchanged from the legacy inputs above.

### Concept

A mapping says _"watch these paths, maintain this README"_. The watch path declares placeholder names with `<NAME>` syntax, and those names get substituted into the README target path:

```yaml
mappings:
    - name: server-features
      watch:
          - apps/server/features/<FEATURE_NAME>/**
      readme: docs/wiki/insights/<FEATURE_NAME>-feature.md
```

When a PR touches `apps/server/features/inspections/index.ts`, `<FEATURE_NAME>` captures `inspections` and the action targets `docs/wiki/insights/inspections-feature.md`. Multiple captures are supported (e.g. `apps/<APP>/features/<FEATURE_NAME>/**` for monorepos that maintain per-app docs).

### Triggers and deliveries

| Trigger             | Event                                                | Allowed deliveries               |
| ------------------- | ---------------------------------------------------- | -------------------------------- |
| `pr_merged`         | `pull_request` `closed` && `merged=true`             | `direct_commit`, `pr`            |
| `pr_opened`         | `pull_request` `opened` / `synchronize` / `reopened` | `pr_comment`, `pr_branch_commit` |
| `workflow_dispatch` | `workflow_dispatch`                                  | `direct_commit`, `pr`            |

`pr_comment` posts a single comment on the PR that previews the proposed README updates and is rewritten on each `synchronize` (de-duplicated by signature). `pr_branch_commit` writes the changes directly to the PR's head branch — fork PRs auto-degrade to `pr_comment` since GitHub-issued tokens cannot push to forks.

### Custom prompt

Set `prompt:` (globally, or per-mapping) to point at a Markdown file in your repo. Its contents become the **primary** directive sent to the model; the action's built-in operational boundaries (return JSON / return Markdown / how to signal "no update needed") are appended after. This lets your team own the agent's brief while the action keeps the protocol consistent.

### `should_update` and freeform mode

When the model is asked to generate structured output, the schema includes `should_update` and `update_reason` fields. If the model judges a change to be cosmetic or unrelated to anything documentable, it sets `should_update: false` and the action skips the write entirely — no churn-commits.

Set `format: freeform` per-mapping (or in `defaults`) to skip the JSON schema and let the model emit plain Markdown. The model signals "no meaningful update" by returning the literal sentinel `<!-- docloop:no-update -->`.

### Example `.docloop.yml`

```yaml
version: 1

# Optional global prompt — inherited by every mapping that doesn't declare its own.
prompt: docs/docloop/prompt.md

defaults:
    detail_level: medium
    model: gpt-4o-mini
    format: structured # structured | freeform
    on_missing_readme: create # create | skip
    exclude:
        - '**/*.test.ts'
        - '**/__snapshots__/**'

triggers:
    pr_merged:
        enabled: true
        base_branches: ['main', 'release/*']
        delivery: direct_commit # direct_commit | pr
        commit_message: 'docs: update READMEs [skip ci]'
    pr_opened:
        enabled: true
        base_branches: ['main']
        delivery: pr_comment # pr_comment | pr_branch_commit
        commit_message: 'docs: sync READMEs from PR [skip ci]'
    workflow_dispatch:
        enabled: false
        delivery: pr # direct_commit | pr
        base_branch: main

mappings:
    - name: server-features
      watch:
          - apps/server/features/<FEATURE_NAME>/**
      readme: docs/wiki/insights/<FEATURE_NAME>-feature.md
      on_missing_readme: create
      prompt: docs/docloop/prompts/server.md
      detail_level: high

    - name: client-features
      watch:
          - apps/client/features/<FEATURE_NAME>/**
      readme: docs/wiki/insights/<FEATURE_NAME>-feature.md
      on_missing_readme: skip # skip targets that don't already exist on disk
      format: freeform # user prompt fully drives the Markdown output

    - name: monorepo-packages
      watch:
          - packages/<PACKAGE>/src/**
          - packages/<PACKAGE>/lib/**
      readme: packages/<PACKAGE>/README.md
```

### Workflow setup with `.docloop.yml`

When using `pr_opened`, your workflow must subscribe to those PR action types in addition to `closed`:

```yaml
on:
    pull_request:
        types: [opened, synchronize, reopened, closed]
    workflow_dispatch: # optional, only if you set workflow_dispatch.enabled

jobs:
    docloop:
        runs-on: ubuntu-latest
        permissions:
            contents: write
            pull-requests: write
        steps:
            - uses: actions/checkout@v4
              with:
                  token: ${{ secrets.GITHUB_TOKEN }}
                  fetch-depth: 0
            - uses: doorloop/ai-docloop@v1
              with:
                  openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

Everything else flows from the `.docloop.yml` file.

## Examples

### Basic Single-Path Setup

```yaml
- uses: doorloop/ai-docloop@v1
  with:
      base_branches: main
      path_scopes: src/features/**
      openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

### High-Detail Documentation with PRs

```yaml
- uses: doorloop/ai-docloop@v1
  with:
      base_branches: main,develop
      path_scopes: src/**
      detail_level: high
      openai_model: gpt-4o
      openai_api_key: ${{ secrets.OPENAI_API_KEY }}
      create_pr: true
      commit_message: 'docs: auto-update READMEs [skip ci]'
```

### Branch Pattern Matching

```yaml
- uses: doorloop/ai-docloop@v1
  with:
      base_branches: main,release/*
      path_scopes: packages/**
      openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.1
- Node.js >= 20 (consumers of the action need nothing — only contributors who want to run the local `act` flow)

### Building

```bash
bun install
bun run build
```

### Type Checking

```bash
bun run typecheck
```

### Running Tests

```bash
bun test
bun test --watch        # Watch mode
bun test --coverage     # With coverage
```

### Linting & Formatting

```bash
bun run lint            # oxlint
bun run lint:fix        # oxlint with autofixes
bun run format          # oxfmt --write
bun run format:check    # CI-style check
bun run knip            # Detect unused exports / files / dependencies
```

Husky hooks installed via `bun install` enforce formatting + linting on staged files (`pre-commit`) and conventional-commit messages (`commit-msg`).

## Testing

For comprehensive testing instructions, see [TESTING.md](./TESTING.md).

### Quick Start

1. **Local testing with act** (recommended):

    ```bash
    # Install act: https://github.com/nektos/act
    brew install act

    # Setup secrets
    cp .secrets.example .secrets
    # Edit .secrets with your tokens

    # Build and test
    bun run build
    bun run act:test
    ```

2. **Unit tests**:
    ```bash
    bun test
    ```

## Publishing

For detailed publishing and deployment instructions, see [PUBLISHING.md](./PUBLISHING.md).

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
