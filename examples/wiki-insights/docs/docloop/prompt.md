# DocLoop directive — feature insights

You are maintaining the **Feature Insights** wiki for our application. Each
`docs/wiki/insights/<FEATURE_NAME>-feature.md` page is the canonical source
of truth that engineers, PMs, and on-call folks reach for when they need
to understand what a feature does, how it is wired up, and where to look
when it breaks.

## What every feature page must cover

- **Purpose**: one paragraph. What problem does this feature solve, who
  uses it, and why does it exist? Avoid implementation detail here.
- **Key entry points**: the controllers, routes, jobs, queues, or UI
  containers that act as the surface area. Cite real file paths.
- **Data model**: the tables, collections, or external systems the feature
  reads/writes. Note any non-obvious foreign keys or denormalised fields.
- **External dependencies**: third-party APIs, internal services, feature
  flags, secrets, or config it relies on. Flag any failure modes worth
  knowing.
- **Operational notes**: dashboards, alerts, runbook links, known gotchas.

## Style

- Tight, dense, scannable. Engineers will skim; respect their time.
- Real file paths and table names beat hand-wavy prose.
- When you spot uncertainty (e.g. a TODO in the code, a feature flag
  that gates new behaviour, a comment that flags risk), call it out
  explicitly under "Operational notes" rather than burying it.

## What to skip

- Boilerplate sections like "Installation" — these wiki pages are not
  per-package READMEs.
- Generic "Contributing" / "License" sections.
- Marketing copy. If it would not appear in an engineering doc, leave
  it out.

## When there is nothing meaningful to update

If the changed files only touch tests, snapshots, formatting, or other
content that does not change the feature's purpose, surface area, data
model, dependencies, or operational behaviour, set `should_update` to
`false` and explain briefly in `update_reason`. We would rather have a
quiet PR history than churn-commits.
