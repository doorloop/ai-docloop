# CLAUDE.md

Onboarding for Claude Code working in this repo. Loaded into every conversation — keep additions tight.

## Project

`doorloop/ai-docloop` is a published GitHub Action that auto-generates and updates README files in a consumer's repo when a PR merges, using OpenAI. Action runtime is Node 20; `dist/index.js` is the bundled entrypoint that GitHub Actions executes directly.

## Hard constraints — violating these breaks consumers or releases

- **Action runtime is Node 20.** `action.yml` declares `using: node20`. The deployed action does not run on Bun. Do not change the runtime.
- **`dist/index.js` is committed and self-contained.** tsup bundles with `noExternal` for the five runtime deps (`@actions/core`, `@actions/exec`, `@actions/github`, `openai`, `normalize-path`). Consumers do not run any install step — the file must be ready to execute as-is.
- **Releases are entirely commit-driven.** semantic-release runs on every push to `main`, decides the version, updates `CHANGELOG.md`, rebuilds `dist/`, commits, tags `vX.Y.Z`, force-updates `v$MAJOR`, and creates the GitHub Release. There is no manual release flow.
- **Bun is dev/CI-only.** Use it for `install`, `run`, `test`, scripts. The action itself never executes under Bun.
- **`prepare` runs only `husky`.** Do not re-add `bun run build` to `prepare` — it would silently mutate committed `dist/` on every contributor's `bun install`.

## Stack

| Concern                         | Tool                                  |
| ------------------------------- | ------------------------------------- |
| Package manager / script runner | Bun                                   |
| Bundler (action dist)           | tsup with `noExternal`                |
| Formatter                       | oxfmt (`.oxfmtrc.json`)               |
| Linter                          | oxlint (`.oxlintrc.json`)             |
| Tests                           | `bun test` (`bunfig.toml [test]`)     |
| Dead-code detection             | knip (`knip.config.ts`)               |
| Git hooks                       | husky (`.husky/`)                     |
| Staged-file processing          | lint-staged (block in `package.json`) |
| Commit-message validation       | commitlint (`commitlint.config.js`)   |
| Release automation              | semantic-release (`.releaserc.js`)    |

## Common commands

- `bun run build` — bundle `src/` into `dist/index.js`
- `bun run typecheck` — `tsc --noEmit`
- `bun test` — run the test suite (`bun test --coverage` for lcov)
- `bun run lint` / `bun run lint:fix` — oxlint
- `bun run format` / `bun run format:check` — oxfmt
- `bun run knip` — detect unused exports / files / deps
- `bun audit` — security check

## Architecture

- `src/index.ts` — action entry; orchestrates the merged-PR → doc-roots → AI → write-and-commit pipeline.
- `src/ai/` — OpenAI client, prompt construction, structured-output schema. Public surface: `generateReadme`.
- `src/config/` — parses action inputs from `@actions/core` into `ActionConfig`.
- `src/git/` — GitHub API (paginated `pulls.listFiles`) and git operations (commit + push or PR).
- `src/lib/` — shared utilities: `logger`, glob → regex, path-scope → doc-root mapping.
- `src/readme/` — README file ops (build doc roots, write to disk).
- `src/types/` — shared types.
- `dist/index.js` — bundled output, committed, executed by the action runner.
- `scripts/test-local.ts` — helper for the `act` local-testing flow.
- `.husky/` — `pre-commit` runs lint-staged + knip; `commit-msg` runs commitlint.

## Conventions

- **Code style:** tabs, 160-col width, single quotes, trailing-comma all, sorted imports. Enforced by oxfmt — do not fight the formatter.
- **Commit messages:** conventional commits, validated by `commit-msg` Husky hook.
- **Release-type mapping** (from `.releaserc.js`):

    | Commit type                                            | Release                          |
    | ------------------------------------------------------ | -------------------------------- |
    | `chore:` `feat:`                                       | minor                            |
    | `fix:` `perf:`                                         | patch                            |
    | `breaking:`                                            | major                            |
    | `docs` `refactor` `test` `style` `build` `ci` `revert` | none — valid commits, no release |

## Workflow rules — DO

- Branch + PR for any non-trivial change. `main` is reviewable.
- Pull `main` and fast-forward before branching: `git switch main && git pull --ff-only origin main`.
- Use `bun add` / `bun remove` for dependencies. Never `npm install`.
- Run `bun run lint && bun run knip && bun test` before claiming work is done — same set the `quality.yml` CI gate runs.
- `--force-with-lease` is fine on your own feature branch when rebasing.
- When `bun.lock` conflicts on a rebase: take the merged `package.json`, then `rm bun.lock && bun install`.

## Workflow rules — DON'T

- Don't push directly to `main` — every push triggers semantic-release; an unintended push can ship a surprise version.
- Don't `git push --force` to `main`. The `vX.Y.Z` tags and the moving `v$MAJOR` tag live there; force-pushing corrupts release history.
- Don't rebuild `dist/` and commit it as part of a non-release change. CI rebuilds dist on every release; local rebuilds produce dist-diff noise on every PR.
- Don't bypass hooks with `--no-verify`. If a hook fails, fix the cause.
- Don't change `action.yml` inputs without bumping major (`breaking:`). Consumers pin to `@v1` and rely on input stability.
- Don't reorder or remove plugins in `.releaserc.js` without understanding semantic-release. Plugin order is load-bearing (changelog must precede git).
- Don't "fix" the five `// eslint-disable-next-line no-await-in-loop` comments in `src/git/files.ts`, `src/git/commit.ts`, and `src/index.ts`. They are intentional: paginated GitHub API, sequential git index access, OpenAI rate-limit avoidance — each carries a one-line reason at the call site.

## CI overview (`.github/workflows/`)

- `quality.yml` — fan-out parallel jobs on PRs and `main`: lint, format, typecheck, knip, test, audit, build, plus an aggregate `All quality checks pass` gate suitable for branch protection.
- `release.yml` — runs on push to `main`; build/typecheck/test then semantic-release; updates the moving `v$MAJOR` tag.
- `docloop.yml` — dogfoods this action on the repo's own `src/*` directories when PRs merge.
- `test-local.yml` — used by the local `act` flow; not part of normal CI.

## Watch out for

- The repo slug is `doorloop/ai-docloop`. Older history mistakenly references `doorloop/docloop-ai` — those are stale; use `ai-docloop` everywhere.
- `bun-types` is wired via `tsconfig.json: types: ["bun"]`. If you add new test files, you don't need to import the test globals' types separately — they come from there.
- The `release` script (`bun run release`) was removed during cleanup. Releases are CI-driven; there is no longer an interactive flow.
