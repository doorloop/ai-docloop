# lib

The `lib` component of the project facilitates various functionalities, including handling pull request titles and automating review requests based on source PR authors. It enhances the documentation flow by allowing customized PR titles and ensuring relevant stakeholders are notified for reviews.

## Features

- Customizable pull request title with the `pr_title` input
- Automatic review requests from the source PR author
- Configurable behavior through workflow inputs
- Error handling for review requests with logging on failure

## Usage

To utilize the new features in the `lib` component, you can configure the following inputs in your workflow file:

```yaml
name: Documentation Workflow
on:
  pull_request:
    types: [closed]

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
      - name: Run Documentation Action
        uses: your-org/your-repo@latest
        with:
          pr_title: 'Custom PR Title'
          request_review_from_pr_author: true
```

Replace `'Custom PR Title'` with your desired title for the documentation PR. Setting `request_review_from_pr_author` to `true` will enable automatic review requests from the author of the source PR, while setting it to `false` will disable this feature.

## Examples

> Example workflow configuration:

```yaml
name: Documentation Workflow
on:
  pull_request:
    types: [closed]

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
      - name: Run Documentation Action
        uses: your-org/your-repo@latest
        with:
          pr_title: 'Custom PR Title'
          request_review_from_pr_author: true
```