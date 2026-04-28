# DocLoop AI — example configs

Each example here is a self-contained set of files you can copy into a
consumer repo. None of them are active CI in this repo (they live under
`examples/`, not `.github/workflows/`), so GitHub will not run them from
here.

## Index

| Example                              | What it shows                                                                                                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docloop.yml`](./docloop.yml)       | Basic flat v1 inputs. Direct commit on PR merge. The simplest possible setup.                                                                                                                                     |
| [`wiki-insights/`](./wiki-insights/) | `.docloop.yml` with `<FEATURE_NAME>` mappings into `docs/wiki/insights/<FEATURE_NAME>-feature.md`, a custom prompt MD as the primary directive, and `delivery: pr` so README updates land in their own review PR. |
| [`pr-preview/`](./pr-preview/)       | `pr_opened` trigger with `delivery: pr_comment`. Reviewers see proposed README updates as a single PR comment (rewritten on each push), nothing written to disk.                                                  |

## Picking the right one

- **Just want to keep top-level READMEs in sync after merges?** Start
  with [`docloop.yml`](./docloop.yml). No new files at the consumer's
  repo root.
- **Maintaining a wiki of feature pages, not in-tree READMEs?** See
  [`wiki-insights/`](./wiki-insights/). It is the example walked through
  in the project README's "Advanced configuration" section.
- **Want to see proposed updates before merge?** See
  [`pr-preview/`](./pr-preview/). Combine with `wiki-insights` (both
  triggers in the same `.docloop.yml`) for preview-during-review +
  write-on-merge.

## Versioning note

All examples reference the action as `doorloop/ai-docloop@v1`. The `@v1`
tag is moved by semantic-release on every minor / patch in the v1 line,
so consumers automatically pick up bug fixes and new features without
editing their workflow. Pin to a specific tag (e.g. `@v1.11.0`) if you
need stricter control.
