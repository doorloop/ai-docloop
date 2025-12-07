# DocLoop AI

> Automatically generate and update README files using AI when pull requests are merged

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Version](https://img.shields.io/github/v/tag/doorloop/docloop-ai)](https://github.com/doorloop/docloop-ai/releases)

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
- [Examples](#examples)
- [Development](#development)
- [Testing](#testing)
- [Publishing](#publishing)
- [License](#license)

## Features

- **AI-Powered Documentation**: Automatically generates or updates README files using large language models (supports all OpenAI models including gpt-4o-mini, gpt-4o, and gpt-4-turbo)
- **Monorepo Support**: Configure multiple path scopes to handle complex monorepo architectures
- **Smart Update Modes**: Choose between updating existing READMEs or overwriting them completely
- **Configurable Detail Levels**: Control the depth and detail of generated documentation (low, medium, high)
- **Flexible Deployment**: Commit changes directly to the repository or create pull requests for review
- **Branch Filtering**: Only process PRs merged into specified base branches using glob patterns
- **Path-Based Organization**: Automatically organizes documentation based on directory structure and path scopes

## Prerequisites

- GitHub repository with Actions enabled
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- GitHub token with `contents: write` and `pull-requests: write` permissions (automatically provided via `GITHUB_TOKEN`)

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
        uses: doorloop/docloop-ai@v1
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
  uses: doorloop/docloop-ai@v1
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

| Input                       | Required | Default                          | Description                                                                                          |
| --------------------------- | -------- | -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `base_branches`             | Yes      | -                                | Comma or newline separated list of base branch names (supports glob patterns like `release/*`)       |
| `path_scopes`               | Yes      | -                                | One or more glob-like path scopes (comma or newline separated) that define where changes are tracked |
| `doc_root_depth_from_scope` | No       | `1`                              | How many path segments below the scope root define a single doc root                                 |
| `readme_filename`           | No       | `README.md`                      | Name of the README file to create/update in each doc root                                            |
| `detail_level`              | No       | `medium`                         | Controls how detailed the README should be. Options: `low`, `medium`, `high`                         |
| `openai_model`              | No       | `gpt-4o-mini`                    | OpenAI model identifier (e.g., `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`)                               |
| `openai_api_key`            | Yes      | -                                | OpenAI API key (should be stored in GitHub secrets)                                                  |
| `update_mode`               | No       | `update`                         | `update` to merge with existing README, `overwrite` for fresh generation                             |
| `commit_message`            | No       | `docs: update READMEs [skip ci]` | Commit message used for the documentation commit                                                     |
| `create_pr`                 | No       | `false`                          | When `true`, creates a PR instead of committing directly                                             |

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

## Examples

### Basic Single-Path Setup

```yaml
- uses: doorloop/docloop-ai@v1
  with:
    base_branches: main
    path_scopes: src/features/**
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

### High-Detail Documentation with PRs

```yaml
- uses: doorloop/docloop-ai@v1
  with:
    base_branches: main,develop
    path_scopes: src/**
    detail_level: high
    openai_model: gpt-4o
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
    create_pr: true
    commit_message: "docs: auto-update READMEs [skip ci]"
```

### Branch Pattern Matching

```yaml
- uses: doorloop/docloop-ai@v1
  with:
    base_branches: main,release/*
    path_scopes: packages/**
    openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

## Development

### Prerequisites

- Node.js >= 20.0.0
- npm

### Building

```bash
npm install
npm run build
```

### Type Checking

```bash
npm run typecheck
```

### Running Tests

```bash
npm test
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage
```

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
   npm run build
   npm run act:test
   ```

2. **Unit tests**:
   ```bash
   npm test
   ```

## Publishing

To publish a new version:

1. **Build and commit the dist folder**:

   ```bash
   ./scripts/release.sh v1.0.0
   git push
   git push origin v1.0.0
   ```

2. **The release workflow automatically**:

   - Builds the action
   - Runs tests
   - Creates a GitHub release with the built files

3. **Users can reference the action**:
   ```yaml
   - uses: doorloop/docloop-ai@v1.0.0
   ```

**Important**: The repository must be public for others to use the action.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
