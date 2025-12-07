# DocLoop AI

A GitHub Action that automatically generates and updates README files using AI whenever pull requests are merged.

## Features

- 🤖 **AI-Powered Documentation**: Automatically generates or updates README files using OpenAI's GPT models (supports all OpenAI models)
- 🎯 **Monorepo-Friendly**: Supports multiple path scopes for monorepo architectures
- 🔄 **Smart Updates**: Choose between updating existing READMEs or overwriting them
- 📝 **Configurable Detail Levels**: Control the depth and detail of generated documentation
- 🚀 **Flexible Deployment**: Commit directly or create PRs for documentation changes

## Usage

### Basic Setup

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
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0

      - uses: doorloop/docloop-ai@v1
        with:
          base_branches: main,develop
          path_scopes: apps/client/src/features/**,packages/ui/**
          doc_root_depth_from_scope: 1
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          create_pr: false
```

### Configuration Options

| Input                       | Required | Default                          | Description                                                                                    |
| --------------------------- | -------- | -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `base_branches`             | ✅       | -                                | Comma or newline separated list of base branch names (supports glob patterns like `release/*`) |
| `path_scopes`               | ✅       | -                                | Comma or newline separated path scopes (e.g., `apps/client/src/features/**`)                   |
| `doc_root_depth_from_scope` | ❌       | `1`                              | How many path segments below the scope root define a doc root                                  |
| `readme_filename`           | ❌       | `README.md`                      | Name of the README file to create/update                                                       |
| `detail_level`              | ❌       | `medium`                         | Detail level: `low`, `medium`, or `high`                                                       |
| `openai_model`              | ❌       | `gpt-4o-mini`                    | OpenAI model identifier (e.g., `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`)                         |
| `openai_api_key`            | ✅       | -                                | OpenAI API key (use GitHub secrets)                                                            |
| `update_mode`               | ❌       | `update`                         | `update` to merge with existing README, `overwrite` for fresh generation                       |
| `commit_message`            | ❌       | `docs: update READMEs [skip ci]` | Commit message for documentation changes                                                       |
| `create_pr`                 | ❌       | `false`                          | Set to `true` to create a PR instead of committing directly                                    |

### Example: Monorepo Setup

```yaml
- uses: doorloop/docloop-ai@v1
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

### How It Works

1. **Trigger**: Runs when a PR is merged (`pull_request` event with `types: [closed]`)
2. **Validation**: Checks if the PR was merged and the base branch matches configured branches
3. **File Detection**: Fetches all changed files from the merged PR
4. **Path Mapping**: Maps changed files to doc root folders based on path scopes and depth
5. **README Generation**: For each doc root:
   - Reads existing README if present
   - Uses AI to generate/update README content
   - Writes the updated README file
6. **Commit**: Stages, commits, and pushes changes (directly or via PR)

### Path Scope Examples

Given `path_scopes: apps/client/src/features/**` and `doc_root_depth_from_scope: 1`:

- Changed file: `apps/client/src/features/inspection/components/Button.tsx`
- Scope root: `apps/client/src/features`
- Doc root: `apps/client/src/features/inspection` (1 level deep)
- README location: `apps/client/src/features/inspection/README.md`

## Development

### Building

```bash
npm install
npm run build
```

### Type Checking

```bash
npm run typecheck
```

### Testing

See [TESTING.md](./TESTING.md) for comprehensive testing instructions.

**Quick Start:**

1. **Local testing with act** (recommended):

   ```bash
   # Install act: https://github.com/nektos/act
   brew install act  # or your package manager

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

To publish a new version of this action:

1. **Update version** (if needed):

   ```bash
   npm version patch  # or minor, major
   ```

2. **Create and push a tag**:

   ```bash
   git tag v1.0.0  # Use your version number
   git push origin v1.0.0
   ```

3. **The release workflow will automatically**:

   - Build the action
   - Run tests
   - Create a GitHub release with the built files

4. **Users can then reference your action**:
   ```yaml
   - uses: doorloop/docloop-ai@v1.0.0
   ```

**Note**: Make sure your repository is public or the action won't be usable by others.

## License

MIT
