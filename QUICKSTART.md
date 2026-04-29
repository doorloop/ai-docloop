# Quick Start Guide

## Using DocLoop AI in your repository

Create a workflow file (e.g., `.github/workflows/docloop.yml`) in the repo whose READMEs you want maintained:

```yaml
name: Update READMEs

on:
    pull_request:
        types: [closed]

jobs:
    update-readmes:
        if: github.event.pull_request.merged == true
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
                  base_branches: main
                  path_scopes: src/features/**
                  openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

Add an `OPENAI_API_KEY` repository secret (Settings → Secrets and variables → Actions). On the next merged PR that touches files under `path_scopes`, the action will generate or update the README in the affected directories.

See [README.md](./README.md#inputs) for the full input reference and monorepo examples.

## Contributing to this repo

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.1
- Node 20 (only if you want to run the local `act` test flow; CI handles releases without it)

### Setup

```bash
bun install
```

This installs dependencies and activates the Husky git hooks (`pre-commit` runs lint-staged + knip; `commit-msg` runs commitlint).

### Common commands

```bash
bun run build          # Bundle src/ into dist/index.js with tsup
bun run typecheck      # tsc --noEmit
bun test               # Run the full test suite (Bun's built-in runner)
bun test --coverage    # With coverage report (writes coverage/lcov.info)
bun run lint           # oxlint
bun run lint:fix       # oxlint with autofixes
bun run format         # oxfmt --write across the repo
bun run format:check   # oxfmt --check (CI-style)
bun run knip           # Detect unused exports/files/dependencies
```

### Releases

This repo uses [semantic-release](./PUBLISHING.md). Just merge PRs with conventional-commit messages (`feat:`, `fix:`, `chore:`, `perf:`, `breaking:`) and a new version is published automatically.

## Testing the action locally with `act`

If you want to actually run the action against a fake PR event without pushing to GitHub:

1. Install `act`:

    ```bash
    brew install act  # macOS
    ```

2. Set up secrets (run from project root):

    ```bash
    cp .secrets.example .secrets
    # Edit .secrets with:
    # GITHUB_TOKEN=your_personal_access_token  (repo scope)
    # OPENAI_API_KEY=your_openai_key
    ```

3. Build and run:

    ```bash
    bun run build
    bun run act:test
    ```

The `bun run test:local` helper script can pre-create the GitHub event JSON for `act` to consume:

```bash
bun run test:local -- --repo owner/repo --pr-number 123 --base-branch main
```

## Troubleshooting

### Action not found by consumers

- Confirm this repo is public.
- Confirm the tag exists on the remote: `git ls-remote --tags origin`.
- Check the latest run of `Semantic Release` in the Actions tab — if it didn't publish a release, see [PUBLISHING.md](./PUBLISHING.md#my-merge-didnt-produce-a-release).

### Local hooks not firing

`bun install` should have run `husky` via the `prepare` script. If hooks aren't firing, run `bunx husky` manually to re-activate.

### `act` errors

- Docker must be running.
- The `linux/amd64` flag in the `act:test` script is required on Apple Silicon.

## Next Steps

- [README.md](./README.md) — full input reference and monorepo examples.
- [TESTING.md](./TESTING.md) — detailed `act` setup.
- [PUBLISHING.md](./PUBLISHING.md) — how releases work.
- [`examples/`](./examples/) — copy-paste-ready setups: a basic flat v1 workflow (`docloop.yml`), a `.docloop.yml`-driven wiki-insights mapping (`wiki-insights.yml`), and a `pr_opened` preview-comment workflow (`pr-preview.yml`).
