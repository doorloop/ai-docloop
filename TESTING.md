# Testing Guide

This guide covers different ways to test the DocLoop AI GitHub Action.

## Local Testing Options

### Option 1: Using `act` (Recommended for Full Integration Testing)

[act](https://github.com/nektos/act) is a tool that runs GitHub Actions locally using Docker.

#### Setup

1. **Install act**:

    ```bash
    # macOS
    brew install act

    # Linux (using Homebrew)
    brew install act

    # Or download from: https://github.com/nektos/act/releases
    ```

2. **Install Docker** (required for act):
    - macOS: [Docker Desktop](https://www.docker.com/products/docker-desktop)
    - Linux: Follow [Docker installation guide](https://docs.docker.com/engine/install/)

3. **Create secrets file** (run from project root: `/path/to/ai-docloop/`):

    ```bash
    cp .secrets.example .secrets
    # Edit .secrets and add your tokens
    ```

    **Getting your tokens**:
    - **GITHUB_TOKEN**: Create a [Personal Access Token](https://github.com/settings/tokens) with `repo` scope
    - **OPENAI_API_KEY**: Get from [OpenAI API Keys](https://platform.openai.com/api-keys)

4. **Build the action**:
    ```bash
    bun run build
    ```

#### Running Tests

```bash
# Test with a specific PR event
bun run act:test

# Or manually with act
act pull_request -W .github/workflows/test-local.yml --secret-file .secrets

# Test with a specific event JSON file
act pull_request -W .github/workflows/test-local.yml \
  --eventpath .github/events/pull_request_closed.json \
  --secret-file .secrets
```

#### Creating Test Event Files

You can create event JSON files in `.github/events/` to simulate different PR scenarios:

```json
{
	"action": "closed",
	"pull_request": {
		"number": 123,
		"merged": true,
		"base": {
			"ref": "main"
		},
		"head": {
			"ref": "feature-branch"
		},
		"title": "Add new feature",
		"body": "This PR adds a new feature"
	},
	"repository": {
		"full_name": "your-org/your-repo"
	}
}
```

### Option 2: Direct Node.js Testing (For Development)

For quick iteration during development, you can test individual functions:

```bash
# Run unit tests
bun test

# Run tests in watch mode
bun test --watch

# Run with coverage
bun test --coverage
```

### Option 3: Manual Testing Script

The `test-local.ts` script allows you to test the action with mocked GitHub context:

```bash
# Build first
bun run build

# Run with required parameters
bun run test:local -- \
  --repo owner/repo-name \
  --pr-number 123 \
  --base-branch main \
  --path-scopes "src/features/**" \
  --openai-api-key your_key_here
```

**Note**: This approach has limitations since it can't fully simulate GitHub API calls. Use `act` for more realistic testing.

## Testing in Another Repository

### Step 1: Publish Your Action

Releases are automatic via semantic-release on every push to `main`. See [PUBLISHING.md](./PUBLISHING.md).

### Step 2: Use in Another Repository

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
              if: github.event.pull_request.merged == true
              uses: doorloop/ai-docloop@v2 # Tracks the latest v2.x.y
              with:
                  openai_api_key: ${{ secrets.OPENAI_API_KEY }}
                  watch: src/features/<FEATURE>/**
                  readme: src/features/<FEATURE>/README.md
                  delivery: direct_commit
```

### Step 3: Test with a PR

1. Create a test PR in your repository
2. Merge it
3. The action should run and update READMEs

## Testing Tips

1. **Start Small**: Test with a single mapping and simple changes first
2. **Use `delivery: pr`**: This is safer for testing — you can review changes before merging
3. **Check Logs**: GitHub Actions logs will show detailed information about what the action is doing
4. **Test Edge Cases**:
    - PRs with no matching files
    - PRs merged to non-matching branches (gate via the workflow's `if:` block)
    - PRs whose changed files don't match the watch pattern

## Troubleshooting

### act Issues

- **Docker not running**: Make sure Docker Desktop is running
- **Permission errors**: On Linux, you may need to add your user to the docker group
- **Large images**: act downloads Docker images on first run, be patient

### Action Not Running

- Check that the workflow file is in `.github/workflows/`
- Verify the trigger event matches (`pull_request` with `types: [closed]`)
- Ensure the PR was actually merged (not just closed)

### API Errors

- Verify your `OPENAI_API_KEY` is set correctly
- Check that `GITHUB_TOKEN` has the right permissions (`contents: write`)
- For act, make sure secrets are in `.secrets` file
