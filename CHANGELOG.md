## [2.2.1](https://github.com/doorloop/ai-docloop/compare/v2.2.0...v2.2.1) (2026-04-29)

### Bug Fixes

- honor watch as a pre-filter in candidate-routing mode ([3ec5b23](https://github.com/doorloop/ai-docloop/commit/3ec5b23fa884afb91c1d2a195740fc25cb575432))

# [2.2.0](https://github.com/doorloop/ai-docloop/compare/v2.1.0...v2.2.0) (2026-04-29)

### Features

- add readme_candidates input for frontmatter-driven routing ([98e4850](https://github.com/doorloop/ai-docloop/commit/98e485053b6aba448010b99703ec7d2167a202d1))

# [2.1.0](https://github.com/doorloop/ai-docloop/compare/v2.0.1...v2.1.0) (2026-04-29)

### Features

- add pr_title input and auto-request review from source PR author ([904c7f4](https://github.com/doorloop/ai-docloop/commit/904c7f46b540c9b03469729e39e743f52ce95202))

## [2.0.1](https://github.com/doorloop/ai-docloop/compare/v2.0.0...v2.0.1) (2026-04-29)

### Bug Fixes

- trailing /\*\* must require ≥1 descendant segment ([2a4f7ff](https://github.com/doorloop/ai-docloop/commit/2a4f7ffac4c40d0f2be7a06d7fac083580c220f5))

# [2.0.0](https://github.com/doorloop/ai-docloop/compare/v1.11.0...v2.0.0) (2026-04-29)

- feat!: redesign action surface as flat per-step inputs (v2) ([375013d](https://github.com/doorloop/ai-docloop/commit/375013df89871cc769db5a21e80fee8fc839177d))

### BREAKING CHANGES

- `.docloop.yml`, the `config_file`/`config` inputs, and
  the legacy flat inputs (`base_branches`, `path_scopes`,
  `doc_root_depth_from_scope`, `readme_filename`, `update_mode`,
  `create_pr`) are removed. Consumers must update their workflow to the new
  input set and pin to `@v2`. The `yaml` runtime dependency is dropped;
  `dist/index.js` shrinks ~270KB.

# [1.11.0](https://github.com/doorloop/ai-docloop/compare/v1.10.3...v1.11.0) (2026-04-28)

### Features

- **ai:** user-directive prompt + freeform mode + should_update signal ([caa3568](https://github.com/doorloop/ai-docloop/commit/caa3568510e620badfb6f17de504eb8b2038d950))
- **config:** load .docloop.yml when present ([a7f1476](https://github.com/doorloop/ai-docloop/commit/a7f14761f847b22bc1954d775400bc366105dabd))
- **lib:** glob with captures + mapping target resolution ([6863d59](https://github.com/doorloop/ai-docloop/commit/6863d5943c45596d3b43aaf731c19ce375fc7ebb))
- **orchestrator:** dispatcher with config-file path ([b5f93bc](https://github.com/doorloop/ai-docloop/commit/b5f93bc6c6e44e6aa008a005a3d5bd3fcab4c1d3))
- **triggers:** pr_opened (pr_comment, pr_branch_commit) + workflow_dispatch ([3872a8a](https://github.com/doorloop/ai-docloop/commit/3872a8ac6b2909d4cbf7414d29a4a6864d83f656))

## [1.10.3](https://github.com/doorloop/ai-docloop/compare/v1.10.2...v1.10.3) (2026-04-26)

### Bug Fixes

- make readme schema valid for OpenAI structured-output strict mode ([78a3473](https://github.com/doorloop/ai-docloop/commit/78a347328c55aacbb7735d699e0524108e7df947))
- rebase against latest base before opening generated PR + brand the PR ([53233ca](https://github.com/doorloop/ai-docloop/commit/53233cad93fd75bbb41bb8eb43675746ab83b71b))

## [1.10.2](https://github.com/doorloop/ai-docloop/compare/v1.10.1...v1.10.2) (2026-04-26)

### Bug Fixes

- read GitHub token from action input, default to github.token ([ebbb135](https://github.com/doorloop/ai-docloop/commit/ebbb135f315b702d2104796abb282402c95e930d))

## [1.10.1](https://github.com/doorloop/ai-docloop/compare/v1.10.0...v1.10.1) (2026-04-26)

### Bug Fixes

- stop example workflow from running as live CI ([731c479](https://github.com/doorloop/ai-docloop/commit/731c4790c9fe3227f01558ecf82bae70925f1d83))

# [1.10.0](https://github.com/doorloop/ai-docloop/compare/v1.9.1...v1.10.0) (2026-04-26)

## [1.9.1](https://github.com/doorloop/ai-docloop/compare/v1.9.0...v1.9.1) (2026-04-26)

### Bug Fixes

- bump @actions/\* to latest majors to clear undici vulnerabilities ([12f4dd9](https://github.com/doorloop/ai-docloop/commit/12f4dd9d4401723f0fc81865a93d7cc4c64ce45d))

# [1.9.0](https://github.com/doorloop/ai-docloop/compare/v1.8.0...v1.9.0) (2026-04-26)

# [1.8.0](https://github.com/doorloop/ai-docloop/compare/v1.7.0...v1.8.0) (2026-04-26)

# [1.7.0](https://github.com/doorloop/ai-docloop/compare/v1.6.0...v1.7.0) (2026-04-26)

### Features

- husky pre-commit and commitlint via commit-msg hook ([d3da911](https://github.com/doorloop/ai-docloop/commit/d3da911711494c5a486e04cadce64ab06e807d0d))

# [1.6.0](https://github.com/doorloop/ai-docloop/compare/v1.5.0...v1.6.0) (2026-04-26)

# [1.5.0](https://github.com/doorloop/ai-docloop/compare/v1.4.0...v1.5.0) (2026-04-26)

# [1.4.0](https://github.com/doorloop/ai-docloop/compare/v1.3.0...v1.4.0) (2026-04-26)

# [1.3.0](https://github.com/doorloop/ai-docloop/compare/v1.2.1...v1.3.0) (2026-04-26)

## [1.2.1](https://github.com/doorloop/ai-docloop/compare/v1.2.0...v1.2.1) (2026-04-26)

### Bug Fixes

- bundle runtime dependencies into dist/index.js ([2f91553](https://github.com/doorloop/ai-docloop/commit/2f9155303d26edba6f7f3e5a29855eddda8b7813))

# [1.2.0](https://github.com/doorloop/ai-docloop/compare/v1.1.1...v1.2.0) (2026-04-26)

### Features

- dogfood docloop on this repo's src/\* directories ([2dd5d86](https://github.com/doorloop/ai-docloop/commit/2dd5d86d9ef08b24caeece9bb5dab276f83dddc3))

## [1.1.1](https://github.com/doorloop/ai-docloop/compare/v1.1.0...v1.1.1) (2026-04-26)

### Bug Fixes

- ship dist with each release and maintain major version tag ([c32395f](https://github.com/doorloop/ai-docloop/commit/c32395ffcdd4fd69ec10ad00a26bb58b8f34fd78))

# [1.1.0](https://github.com/doorloop/ai-docloop/compare/v1.0.0...v1.1.0) (2026-04-26)
