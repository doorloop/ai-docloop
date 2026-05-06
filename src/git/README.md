# Git Auto-Generated Documentation Updates

Improvements to the auto-generated documentation process when creating PRs for updates, ensuring up-to-date content and enhanced branding.

## Features

- Automatic rebase against the latest base branch before opening the PR to prevent merge conflicts.
- Enhanced branding for generated PRs, including specific naming conventions and titles.
- Utilization of industry-standard emojis for documentation PRs to improve visibility and organization.

## Usage

To utilize the enhanced auto-generated documentation feature, ensure that your workflow is set up to call the updated git commands as specified in the `commit.ts` file. When a new documentation PR is created, the system will now automatically rebase against the latest `main` branch before opening the PR, ensuring that any changes are based on the most current state. If a conflict arises during the rebase, a clear error will surface, prompting a re-run of the workflow.

Example command:
```bash
# This command triggers the documentation update workflow
bun run docs:update
```