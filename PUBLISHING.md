# Publishing Guide

This guide covers how to publish new versions of the DocLoop AI GitHub Action.

## Prerequisites

- Repository must be **public** (required for others to use the action)
- Write access to the repository
- Git configured with proper credentials

## Publishing a New Version

### Step 1: Prepare Your Repository

1. **Ensure repository is public**:
    - Go to repository settings on GitHub
    - Verify the repository visibility is set to "Public"

2. **Update version in package.json** (if needed):
    ```bash
    npm version patch   # for bug fixes (1.0.0 -> 1.0.1)
    npm version minor   # for new features (1.0.0 -> 1.1.0)
    npm version major   # for breaking changes (1.0.0 -> 2.0.0)
    ```

### Step 2: Create a Release

**Option A: Using the interactive release script** (recommended):

```bash
npm run release
```

The interactive release script will:

- Prompt you to select version type (patch/minor/major) or enter custom version
- Run type checking (`npm run typecheck`)
- Run tests (`npm test`)
- Build the action (`npm run build`)
- Update `package.json` version
- Stage and commit the `dist/` directory and `package.json`
- Create a git tag
- Provide next steps for pushing

**Option B: Non-interactive mode** (for CI/CD):

```bash
npm run release 1.0.1
```

**Option C: Manual process**:

```bash
# Build the action
npm run build

# Commit the built files (GitHub Actions needs dist/ in the repository)
git add -f dist/
git commit -m "chore: build action for release"
git push

# Create and push tag
git tag v1.0.0
git push origin v1.0.0
```

**Important**: The `dist/` folder must be committed to the repository for the action to work when others reference it. The release script handles this automatically.

### Step 3: Automatic Release Workflow

When you push a tag (e.g., `v1.0.0`), the release workflow (`.github/workflows/release.yml`) automatically:

- Builds the action (`npm run build`)
- Runs type checking (`npm run typecheck`)
- Runs tests (`npm test`)
- Creates a GitHub release with:
    - Built files (`dist/**`)
    - `action.yml`
    - `README.md`
    - `LICENSE`
    - Auto-generated release notes

### Step 4: Verify the Release

1. Go to your repository on GitHub
2. Click "Releases" in the sidebar
3. Verify your new release appears with the built files attached
4. Check that the release notes were generated correctly

### Step 5: Using the Published Action

Once published, users can reference your action in their workflows:

```yaml
- uses: doorloop/docloop-ai@v1.0.0
```

Or use a major version tag for automatic updates:

```yaml
- uses: doorloop/docloop-ai@v1 # Automatically uses latest v1.x.x
```

## Versioning Strategy

Follow [Semantic Versioning](https://semver.org/) (SemVer):

- **MAJOR** version (X.0.0): Breaking changes
- **MINOR** version (0.X.0): New features (backward compatible)
- **PATCH** version (0.0.X): Bug fixes (backward compatible)

### Examples

```bash
# Bug fix release
npm run release
# Select "Patch" when prompted, or:
npm run release 1.0.1

# New feature release
npm run release
# Select "Minor" when prompted, or:
npm run release 1.1.0

# Breaking change release
npm run release
# Select "Major" when prompted, or:
npm run release 2.0.0
```

## Release Checklist

Before publishing a new version:

- [ ] All tests pass (`npm test`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Code is built successfully (`npm run build`)
- [ ] Version updated in `package.json`
- [ ] `dist/` folder is committed
- [ ] Git tag created and pushed
- [ ] Release workflow completed successfully
- [ ] Release notes reviewed on GitHub

## Troubleshooting

### Release Workflow Fails

- **Check build output**: Ensure `dist/index.js` exists after building
- **Verify tests**: Run `npm test` locally to catch issues early
- **Check action.yml**: Ensure `action.yml` is in the root directory
- **Review workflow logs**: Check GitHub Actions logs for specific errors

### Action Not Found After Release

- **Repository visibility**: Ensure repository is public
- **Tag exists**: Verify tag was pushed: `git ls-remote --tags origin`
- **Release created**: Check that GitHub release was created successfully
- **Tag format**: Ensure tag follows `v*` pattern (e.g., `v1.0.0`)

### Users Can't Find Latest Version

- **Check tag**: Verify latest tag exists and is pushed
- **Release workflow**: Ensure release workflow completed successfully
- **Version badge**: The README version badge should update automatically via shields.io

### Dist Folder Not Committed

If the `dist/` folder is not committed, users won't be able to use the action:

```bash
# Manually commit dist/ if needed
git add -f dist/
git commit -m "chore: build action for release"
git push
```

## Best Practices

1. **Always test before releasing**: Run `npm test` and `npm run build` locally
2. **Use the release script**: It automates the process and reduces errors
3. **Follow semantic versioning**: Helps users understand the impact of updates
4. **Write clear release notes**: Describe what changed in each version
5. **Tag consistently**: Always use `v` prefix (e.g., `v1.0.0`)
6. **Keep dist/ committed**: Required for GitHub Actions to work

## Related Documentation

- [TESTING.md](./TESTING.md) - Testing instructions
- [README.md](./README.md) - Main documentation
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
