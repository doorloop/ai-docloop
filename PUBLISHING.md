# Publishing Guide

This repo publishes new versions of the DocLoop AI GitHub Action automatically via [`semantic-release`](https://semantic-release.gitbook.io/) on every push to `main`. There is no manual `npm/bun run release` flow — releases are entirely commit-driven.

## How a release happens

1. You merge a PR into `main`.
2. `.github/workflows/release.yml` runs:
    - `bun install --frozen-lockfile`
    - `bun run build` (rebuilds `dist/index.js`)
    - `bun run typecheck`
    - `bun run test`
    - `semantic-release` analyzes commits since the last tag, decides the next version, updates `CHANGELOG.md`, bumps `package.json`, commits the rebuilt `dist/`, creates the git tag (e.g. `v1.7.0`), and creates the GitHub Release with auto-generated notes.
    - The major-version tag (`v1`) is force-updated to point at the new release.
3. Consumers using `uses: doorloop/ai-docloop@v1` automatically pick up the new version.

## What controls the version bump

`.releaserc.js` maps commit-message types to release types. The current rules:

| Commit type | Release impact |
| ----------- | -------------- |
| `chore:`    | minor          |
| `feat:`     | minor          |
| `fix:`      | patch          |
| `perf:`     | patch          |
| `breaking:` | major          |

Other conventional types (`docs`, `refactor`, `test`, `style`, `build`, `ci`, `revert`) are accepted by commitlint locally but **do not trigger a release**. If your only commits since the last tag are those types, no new version is published.

`commit-msg` (Husky + commitlint) rejects non-conventional messages locally so you can't accidentally push a commit that won't trigger a release.

## Day-to-day flow

```bash
# Make changes
git checkout -b feat/my-change

# Commit using a release-triggering type
git commit -m "feat: support gpt-5 model"

# Open PR; merge when reviewed
gh pr create

# After merge: nothing else to do. CI handles the release.
```

## Manually re-running a failed release

If `release.yml` fails for transient reasons (network, GitHub API hiccup), you can re-run the failed workflow run from the Actions tab. semantic-release is idempotent — it skips work that's already done and picks up where it left off.

If `bun install --frozen-lockfile` fails because `bun.lock` and `package.json` drifted, run `bun install` locally, commit the updated lockfile, and push.

## Marketplace publishing

GitHub Releases are created automatically by semantic-release. To list a release on the GitHub Marketplace:

1. Open the release on GitHub → **Edit**.
2. Tick **"Publish this release to the GitHub Marketplace"**.
3. Pick categories (suggested: `Utilities` + `Continuous integration`).
4. **Update release**.

This is a one-time-per-release manual step; semantic-release does not toggle the Marketplace checkbox. The `doorloop` org admin must accept the GitHub Marketplace Developer Agreement once before this option appears.

## Versioning convention

Standard [Semantic Versioning](https://semver.org/):

- **MAJOR** (`X.0.0`) — breaking changes (use `breaking:` commit type).
- **MINOR** (`0.X.0`) — new features (use `feat:` or `chore:`).
- **PATCH** (`0.0.X`) — bug fixes (use `fix:` or `perf:`).

## Troubleshooting

### My merge didn't produce a release

Check the merged commits since the last tag. If they're all `docs:` / `refactor:` / `test:` / etc., that's expected — those types don't trigger releases. Add a `chore:` commit if you want a release.

### `release.yml` failed at "Run tests" / "Build action"

Failure here usually means the new code broke. Fix the issue in a follow-up PR; semantic-release will pick up both commits at the next release.

### Tag didn't move to `v$MAJOR`

Check the "Update major version tag" step in `release.yml`. It runs only when `steps.semantic.outputs.new_release_published == 'true'` — if no release was cut (see above), the major tag also doesn't move.

### Branch protection rejected the release commit

The GitHub Actions bot needs to be allowed to push to `main`. Either disable required reviews on `main` for this bot, or add a bypass rule.

## Related Documentation

- [TESTING.md](./TESTING.md) — local testing setup.
- [README.md](./README.md) — main documentation and consumer-facing usage.
- [QUICKSTART.md](./QUICKSTART.md) — quick start for using the action in another repo.
