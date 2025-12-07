# Quick Start Guide

## Publishing Your Action

### Step 1: Prepare Your Repository

1. **Make sure your repository is public** (required for others to use your action)

### Step 2: Create a Release

**Option A: Using the release script** (recommended):

```bash
./scripts/release.sh v1.0.0
git push
git push origin v1.0.0
```

**Option B: Manual process**:

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

**Note**: The `dist/` folder must be committed to the repository for the action to work when others reference it. The release script handles this automatically.

2. **The release workflow will automatically**:

   - Build your action (`npm run build`)
   - Run tests (`npm test`)
   - Create a GitHub release with the built files

3. **Verify the release**:
   - Go to your repository on GitHub
   - Click "Releases" in the sidebar
   - You should see your new release with the built files attached

### Step 3: Use in Another Repository

Create a workflow file (e.g., `.github/workflows/docloop.yml`) in your test repository:

```yaml
name: Update READMEs

on:
  pull_request:
    types: [closed]

jobs:
  update-readmes:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0

      - name: Run DocLoop AI
        uses: YOUR_USERNAME/docloop-ai@v1.0.0 # Replace with your username/repo
        with:
          base_branches: main
          path_scopes: src/features/**
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

**Important**: Replace `YOUR_USERNAME` with your GitHub username or organization name.

## Testing Locally

### Using `act` (Recommended)

1. **Install act**:

   ```bash
   brew install act  # macOS
   # Or: https://github.com/nektos/act/releases
   ```

2. **Install Docker** (required for act)

3. **Setup secrets** (run from project root: `/path/to/ai-docloop/`):

   ```bash
   cp .secrets.example .secrets
   # Edit .secrets and add:
   # GITHUB_TOKEN=your_token_here
   # OPENAI_API_KEY=your_key_here
   ```

   **Getting your tokens**:

   - **GITHUB_TOKEN**: Create a [Personal Access Token](https://github.com/settings/tokens) with `repo` scope
   - **OPENAI_API_KEY**: Get from [OpenAI API Keys](https://platform.openai.com/api-keys)

4. **Build and test**:
   ```bash
   npm run build
   npm run act:test
   ```

### Quick Test Script

```bash
npm run test:local -- \
  --repo owner/repo-name \
  --pr-number 123 \
  --base-branch main \
  --path-scopes "src/features/**"
```

This creates the necessary event files for `act` but doesn't actually run the action (use `act` for that).

## Troubleshooting

### Action Not Found

- Make sure your repository is **public**
- Verify the tag exists: `git ls-remote --tags origin`
- Check that the release workflow completed successfully

### Release Workflow Fails

- Check that `dist/index.js` exists after building
- Verify all tests pass: `npm test`
- Ensure `action.yml` is in the root directory

### Local Testing Issues

- **Docker not running**: Start Docker Desktop
- **act not found**: Install act first
- **Permission errors**: Make sure your GitHub token has `repo` scope

## Next Steps

- Read [TESTING.md](./TESTING.md) for detailed testing instructions
- Check [README.md](./README.md) for full documentation
- See `.github/workflows/example-usage.yml` for a complete example
