# PR-preview comment example

A `.docloop.yml` setup that runs on every PR open / synchronize / reopen
and posts a single PR comment showing the proposed README updates —
without writing anything to disk.

## What this example shows

- **`pr_opened` trigger with `delivery: pr_comment`** — non-mutating
  preview. The action calls the model, renders the proposed content,
  and either creates a new comment on the PR or edits an existing one
  (de-duplicated by the `<!-- docloop:summary -->` signature) so
  subsequent pushes do not stack comments.
- **No writes to disk**: reviewers get a chance to spot wrong output
  before it lands. Pair this with `pr_merged` (in a second trigger
  block) if you want the preview during review and the actual write
  at merge time.
- **Skip handling**: targets that the model judges do not need an
  update (`should_update: false`) appear in a separate "skipped"
  section in the comment, with the model's stated reason. Useful for
  catching when the model is being too eager or too lazy.

## Files in this example

| File           | Goes to                                    |
| -------------- | ------------------------------------------ |
| `docloop.yml`  | Your repo: `.github/workflows/docloop.yml` |
| `.docloop.yml` | Your repo: `.docloop.yml` (root)           |

## To use in your repo

1. Copy `docloop.yml` to `.github/workflows/`.
2. Copy `.docloop.yml` to your repo root.
3. Adjust the `watch:` paths to match your feature folder layout.
4. The job needs `pull-requests: write` to post and edit comments;
   `contents: read` is enough — pr_comment never writes to disk.
5. Add `OPENAI_API_KEY` to repo or org secrets.

## Combining with a merge-time write

If you want preview comments AND a real write on merge, declare both
triggers in the same `.docloop.yml`:

```yaml
triggers:
    pr_opened:
        enabled: true
        base_branches: ['main']
        delivery: pr_comment
    pr_merged:
        enabled: true
        base_branches: ['main']
        delivery: direct_commit
        commit_message: 'docs: update READMEs [skip ci]'
```

The same `mappings:` list serves both triggers.

## Fork PRs

`pr_comment` works on fork PRs the same way as same-repo PRs, since
posting a comment uses the calling repo's token — it does not need
write access to the fork. (`pr_branch_commit`, by contrast, falls
back to `pr_comment` automatically on fork PRs because GitHub tokens
issued to the base repo cannot push to forks.)
