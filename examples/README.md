# DocLoop AI — example configs

Each file here is a self-contained, copy-paste-ready example. None of them
are active CI in this repo (they live under `examples/`, not
`.github/workflows/`), so GitHub does not run them from here.

## Index

| File                                       | Kind                                              | What it shows                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`docloop.yml`](./docloop.yml)             | GitHub Actions workflow                           | Basic flat v1 inputs. Direct commit on PR merge. The simplest possible setup — no `.docloop.yml` needed.                                         |
| [`wiki-insights.yml`](./wiki-insights.yml) | `.docloop.yml` (with workflow in header comments) | `<FEATURE_NAME>` mappings into `docs/wiki/insights/<FEATURE_NAME>-feature.md`, custom prompt MD as the primary directive, `delivery: pr`.        |
| [`pr-preview.yml`](./pr-preview.yml)       | `.docloop.yml` (with workflow in header comments) | `pr_opened` trigger with `delivery: pr_comment`. Reviewers see proposed updates as a single PR comment (rewritten on each push), no disk writes. |

## Picking the right one

- **Just want to keep top-level READMEs in sync after merges?** Start with
  [`docloop.yml`](./docloop.yml). No new files at the consumer's repo root.
- **Maintaining a wiki of feature pages instead of in-tree READMEs?** See
  [`wiki-insights.yml`](./wiki-insights.yml). Matches the example walked
  through in the project README's "Advanced configuration" section.
- **Want to see proposed updates before merge?** See
  [`pr-preview.yml`](./pr-preview.yml). Combine with `wiki-insights.yml`
  (both triggers in the same `.docloop.yml`) for preview-during-review +
  write-on-merge.

## How to use the `.docloop.yml` examples

The two single-file examples (`wiki-insights.yml` and `pr-preview.yml`) are
shaped like a `.docloop.yml`. To apply one in your repo:

1. Copy the YAML body to your repo root as `.docloop.yml`.
2. Read the header comment block in the file — it contains the companion
   workflow snippet to drop at `.github/workflows/docloop.yml`.
3. Adjust the `watch:` paths to match your actual feature folder layout.
4. Make sure `OPENAI_API_KEY` is in repo or org secrets, and your job grants
   `contents: write` and `pull-requests: write` (or just `pull-requests: write`
   for `pr_comment` delivery).

## Versioning note

All workflow snippets reference `doorloop/ai-docloop@v1`. The `@v1` tag is
moved by semantic-release on every minor / patch in the v1 line, so consumers
automatically pick up bug fixes and new features without editing their
workflow. Pin to a specific tag (e.g. `@v1.11.0`) if you need stricter
control.
