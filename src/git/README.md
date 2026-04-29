# Git Integration for Pull Request Management

This feature enhances the Git integration by allowing users to customize PR titles and automatically request reviews from the authors of the source PRs when generating documentation PRs.

## Features

- Customizable PR titles via the `pr_title` input
- Automatic review requests from the source PR author
- Default settings that ensure smooth integration without requiring manual intervention

## Usage

To use the new features, include the following inputs in your action configuration:

```yaml
inputs:
  pr_title:
    description: 'Override the default PR title'
    required: false
    default: '📚 docs: update READMEs via DocLoop AI'
  request_review_from_pr_author:
    description: 'Automatically request a review from the author of the source PR'
    required: false
    default: 'true'
```

When a PR is opened from a merged-PR event, the documentation PR will adopt the specified `pr_title` and will automatically request a review from the source PR author unless opted out by setting `request_review_from_pr_author: false`.

## Examples

> Example configuration for a GitHub Action:
```yaml
name: Generate Documentation PR
on:
  pull_request:
    types: [closed]

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
      - name: Generate Documentation PR
        uses: your-org/your-repo@main
        with:
          pr_title: 'Custom Documentation Title'
          request_review_from_pr_author: 'true'
```