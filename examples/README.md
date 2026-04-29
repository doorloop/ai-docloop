# Examples

| File                                       | Flow                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| [`docloop.yml`](./docloop.yml)             | GitHub Actions workflow with flat v1 inputs. Direct commit on PR merge.                                                          |
| [`wiki-insights.yml`](./wiki-insights.yml) | `.docloop.yml` — `<FEATURE_NAME>` mappings into `docs/wiki/insights/<FEATURE_NAME>-feature.md`, freeform output, `delivery: pr`. |
| [`pr-preview.yml`](./pr-preview.yml)       | `.docloop.yml` — `pr_opened` trigger with `delivery: pr_comment`.                                                                |

`wiki-insights.yml` and `pr-preview.yml` are `.docloop.yml`-shaped — copy to your repo root as `.docloop.yml`. `docloop.yml` is a workflow file — copy to `.github/workflows/docloop.yml`. See the project [README](../README.md#advanced-configuration-with-docloopyml) for the full schema and the workflow snippet that pairs with `.docloop.yml`.
