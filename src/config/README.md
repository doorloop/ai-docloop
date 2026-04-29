# Config Component

The Config component provides configuration options for managing documentation PRs in automated workflows, specifically for overriding PR titles and requesting reviews from the source PR author.

## Features

- Override the default PR title with a custom title
- Automatically request a review from the author of the source PR
- Supports multiple documentation workflows within the same repository
- Defensive input handling to prevent errors in configuration

## Usage

To use the Config component, define the following inputs in your `action.yml`: 

```yaml
inputs:
  pr_title:
    description: 'Overrides the default PR title'
    required: false
    default: '📚 docs: update READMEs via DocLoop AI'
  request_review_from_pr_author:
    description: 'Automatically requests a review from the author of the source PR'
    required: true
    default: 'true'
```

### Example Usage

```yaml
name: Documentation Update
on:
  pull_request:
    types: [closed]

jobs:
  update-docs:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Run DocLoop AI
        uses: your-org/docloop-action@v1
        with:
          pr_title: 'Custom Title for Documentation PR'
          request_review_from_pr_author: 'true'
```

In the example above, the PR title will be set to 'Custom Title for Documentation PR', and a review will be automatically requested from the author of the source PR when the documentation PR is created.

## Examples

Override the default title for documentation PRs by specifying `pr_title` in your workflow.

To opt-out of requesting reviews from the source PR author, set `request_review_from_pr_author: false`.