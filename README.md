# DocLoop AI

> Maintain documentation files using AI when pull requests merge.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Version](https://img.shields.io/github/v/tag/doorloop/ai-docloop)](https://github.com/doorloop/ai-docloop/releases)

DocLoop AI is a GitHub Action that keeps documentation files in sync with the codebase using OpenAI. Each invocation is one **mapping intent** — "watch these source paths, maintain this documentation file" — expressed entirely as flat workflow inputs. Compose more intents by adding more steps.

## Table of Contents

- [Concept](#concept)
- [Quick start](#quick-start)
- [Composing multiple intents](#composing-multiple-intents)
- [Inputs](#inputs)
- [Behavior by event](#behavior-by-event)
- [Placeholders & fan-out](#placeholders--fan-out)
- [Custom prompts](#custom-prompts)
- [Update signal](#update-signal)
- [Examples](#examples)
- [Development](#development)
- [License](#license)

## Concept

A mapping says: _"watch these paths, maintain this documentation file."_

```yaml
- uses: doorloop/ai-docloop@v2
  with:
      openai_api_key: ${{ secrets.OPENAI_API_KEY }}
      watch: apps/server/features/<FEATURE_NAME>/**
      readme: docs/wiki/insights/<FEATURE_NAME>-feature.md
```

When a PR touches `apps/server/features/inspections/index.ts`, `<FEATURE_NAME>` captures `inspections` and the action targets `docs/wiki/insights/inspections-feature.md`. Multiple captures (`apps/<APP>/features/<FEATURE_NAME>/**`) work too.

A workflow is just a list of mappings — one step per intent. Triggers come from the workflow's own `on:` and `if:`; the action introspects the actual GitHub event to decide what to do.

## Quick start

Create `.github/workflows/docloop.yml`:

```yaml
name: Maintain READMEs

on:
    pull_request:
        types: [closed]

jobs:
    docs:
        if: github.event.pull_request.merged == true
        runs-on: ubuntu-latest
        permissions:
            contents: write
            pull-requests: write
        steps:
            - uses: actions/checkout@v4
              with:
                  fetch-depth: 0

            - uses: doorloop/ai-docloop@v2
              with:
                  openai_api_key: ${{ secrets.OPENAI_API_KEY }}
                  watch: src/features/<FEATURE>/**
                  readme: src/features/<FEATURE>/README.md
```

That's the whole setup. No config file. No heredoc. Required inputs are `openai_api_key`, `watch`, and `readme`.

## Composing multiple intents

A single workflow can maintain several documentation surfaces by adding more steps:

```yaml
on:
    pull_request:
        types: [opened, synchronize, reopened, closed]

jobs:
    docs:
        runs-on: ubuntu-latest
        permissions:
            contents: write
            pull-requests: write
        steps:
            - uses: actions/checkout@v4
              with:
                  fetch-depth: 0

            - name: Maintain feature insights
              uses: doorloop/ai-docloop@v2
              with:
                  openai_api_key: ${{ secrets.OPENAI_API_KEY }}
                  watch: apps/server/features/<FEATURE_NAME>/**
                  readme: docs/wiki/insights/<FEATURE_NAME>-feature.md
                  prompt_file: docs/prompts/insights.md
                  detail_level: high
                  format: freeform
                  on_missing_readme: skip
                  delivery: pr

            - name: Maintain component READMEs
              uses: doorloop/ai-docloop@v2
              with:
                  openai_api_key: ${{ secrets.OPENAI_API_KEY }}
                  watch: apps/client/src/components/<COMPONENT>/**
                  readme: apps/client/src/components/<COMPONENT>/README.md
                  prompt_file: docs/prompts/components.md
                  delivery: direct_commit
```

Steps run sequentially in one job — no git contention. Each step is independent: separate prompt, detail level, delivery, and exclude rules. PR-preview comments are keyed on the step's `name` so they update idempotently in multi-step PRs.

## Inputs

| Input               | Required | Default                       | Purpose                                                                                                           |
| ------------------- | -------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `openai_api_key`    | yes      | —                             | OpenAI API key (store in `secrets`).                                                                              |
| `openai_model`      | no       | `gpt-5.5`                     | Model identifier. Override if your OpenAI project does not have access to the default.                            |
| `github_token`      | no       | `${{ github.token }}`         | Token for PR file lists, commits, PRs, and comments. Override only for cross-repo writes via PAT.                 |
| `watch`             | yes      | —                             | One or more glob patterns (newline- or comma-separated). May contain `<PLACEHOLDER>` segments for fan-out.        |
| `readme`            | yes      | —                             | Target documentation path. Any `<PLACEHOLDER>` here must be declared in `watch`.                                  |
| `prompt_file`       | no       | —                             | Path to a Markdown file used as the model's primary directive.                                                    |
| `detail_level`      | no       | `medium`                      | `low` \| `medium` \| `high`.                                                                                      |
| `format`            | no       | `structured`                  | `structured` (JSON with `should_update`) or `freeform` (Markdown with the `<!-- docloop:no-update -->` sentinel). |
| `on_missing_readme` | no       | `create`                      | `create` or `skip` — what to do when the target file does not exist.                                              |
| `exclude`           | no       | —                             | Glob patterns to exclude from the watch set (newline- or comma-separated).                                        |
| `delivery`          | no       | event-derived\*               | `direct_commit` \| `pr` \| `pr_comment` \| `pr_branch_commit`.                                                    |
| `commit_message`    | no       | `docs: update [skip ci]`      | Used for `direct_commit`, `pr`, and `pr_branch_commit` deliveries.                                                |
| `name`              | no       | derived from `watch`+`readme` | Mapping name; keys per-step PR-preview comments so multi-step workflows keep their comments idempotent.           |

\* Default `delivery`: closed-merged PR → `direct_commit`; opened/synchronize/reopened PR → `pr_comment`; `workflow_dispatch` → `pr`.

## Behavior by event

| Workflow event                                       | Action behavior                                     | Allowed deliveries                                                            |
| ---------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| `pull_request` `closed` && `merged==true`            | Process the PR's changed files and ship the result. | `direct_commit`, `pr`                                                         |
| `pull_request` `opened` / `synchronize` / `reopened` | Process the PR's changed files and post a preview.  | `pr_comment`, `pr_branch_commit` (auto-degrades to `pr_comment` for fork PRs) |
| `workflow_dispatch`                                  | Process every tracked file in the repo.             | `direct_commit`, `pr`                                                         |
| Any other event                                      | No-op (logs and exits 0).                           | —                                                                             |

The action validates `delivery` against the event and fails loudly on illegal combos.

## Placeholders & fan-out

`<PLACEHOLDER>` syntax in `watch` and `readme` lets one step expand to N target files based on which features changed:

```yaml
watch: apps/<APP>/features/<FEATURE_NAME>/**
readme: docs/<APP>/<FEATURE_NAME>.md
```

A PR touching `apps/server/features/auth/index.ts` and `apps/client/features/billing/index.ts` produces two separate generations: `docs/server/auth.md` and `docs/client/billing.md`. Files within the same capture group share one OpenAI call.

Rules:

- Placeholders are uppercase identifiers (`<NAME>`, `<FEATURE_NAME>`, `<APP_2>` …).
- Every placeholder used in `readme` must be declared in `watch`.
- All `watch` entries must declare the same placeholder set (they unify into one fan-out).

## Custom prompts

Set `prompt_file` to point at a Markdown file in your repo. Its contents become the **primary** directive for the model; the action's operational boundaries (return JSON / return Markdown / how to signal "no update") are appended after. This lets your team own the agent's brief while the action keeps the protocol consistent.

## Update signal

In `format: structured`, the response schema includes `should_update` and `update_reason`. If the model judges a change cosmetic or unrelated, it returns `should_update: false` and the action skips the write — no churn-commits.

In `format: freeform`, the model signals "no meaningful update" by returning the literal sentinel `<!-- docloop:no-update -->` and nothing else.

## Examples

See [`examples/`](./examples/) — `single-step.yml` for the minimum viable invocation and `wiki-insights.yml` for a real multi-step composition.

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.1
- Node.js >= 20 (consumers need nothing — only contributors who run the local `act` flow)

### Common commands

```bash
bun install
bun run build           # bundle src/ into dist/index.js
bun run typecheck
bun test                # bun test --coverage for lcov
bun run lint            # oxlint
bun run lint:fix
bun run format          # oxfmt --write
bun run format:check
bun run knip            # detect unused exports / files / deps
```

Husky hooks installed via `bun install` enforce formatting + linting on staged files (`pre-commit`) and conventional-commit messages (`commit-msg`).

## License

MIT — see [LICENSE](./LICENSE).
