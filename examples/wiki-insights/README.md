# Wiki insights example

A `.docloop.yml` setup where every feature folder under
`apps/server/features/<name>/` and `apps/client/features/<name>/` is mirrored
into a single canonical insight page at
`docs/wiki/insights/<name>-feature.md`.

## What this example shows

- **`<FEATURE_NAME>` placeholder capture** in the watch glob, reused in the
  README target template. A change to `apps/server/features/auth/login.ts`
  resolves to `docs/wiki/insights/auth-feature.md`. Two mappings (server
  and client) share the same target template so client and server changes
  fold into the same page.
- **Custom prompt** at `docs/docloop/prompt.md` as the PRIMARY directive
  for the model. The action's built-in operational boundaries (return JSON,
  honour `should_update`, etc.) are appended after — you own the editorial
  brief, the action owns the protocol.
- **`pr_merged` trigger with `delivery: pr`** — README updates land in a
  separate "📚 docs" PR for review rather than going straight to `main`.
- **`should_update` short-circuit** — when the diff only touches tests,
  snapshots, or formatting, the model returns `should_update: false` and
  the action skips the write entirely. No churn-commits.

## Files in this example

| File                     | Goes to                                    |
| ------------------------ | ------------------------------------------ |
| `docloop.yml`            | Your repo: `.github/workflows/docloop.yml` |
| `.docloop.yml`           | Your repo: `.docloop.yml` (root)           |
| `docs/docloop/prompt.md` | Your repo: `docs/docloop/prompt.md`        |

## To use in your repo

1. Copy `docloop.yml` to `.github/workflows/`.
2. Copy `.docloop.yml` to your repo root.
3. Copy `docs/docloop/prompt.md` to your repo (or write your own — the
   `prompt:` field in `.docloop.yml` points at it).
4. Adjust the `watch:` paths in `.docloop.yml` to match your actual feature
   folder layout. The `<FEATURE_NAME>` token must appear in both the watch
   glob and the readme template.
5. Make sure the calling job grants `contents: write` and
   `pull-requests: write`, and that `OPENAI_API_KEY` is in repo or org
   secrets.
6. (First run) The first PR that touches a feature will create
   `docs/wiki/insights/<name>-feature.md` from scratch. Review the PR
   carefully — subsequent updates will preserve existing content.
