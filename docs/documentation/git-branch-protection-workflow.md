# Git Workflow With Protected `main`

This repository follows protected branch rules on `main`.

## Rules

- Never push directly to `main`.
- Create a feature branch for all changes.
- Open PRs to `main`.
- Merge only after CI is green.

## Daily Flow

```bash
git checkout main
git pull origin main
git checkout -b feat/<short-change-name>
make check
git add .
git commit -m "type: short summary"
git push -u origin feat/<short-change-name>
gh pr create --fill --base main --head feat/<short-change-name>
gh pr checks <PR_NUMBER> --watch
gh pr merge <PR_NUMBER> --rebase --auto --delete-branch
git checkout main
git pull origin main
```

## Auto-Merge Actor And Mainline Proof

The repository auto-merge helper queues rebase auto-merge with `LOTUS_AUTOMERGE_TOKEN`, not the
default `GITHUB_TOKEN`. This keeps the merged main update eligible for downstream workflow
dispatch. If `LOTUS_AUTOMERGE_TOKEN` is not configured, the helper emits a warning and leaves merge
ownership to an authorized human or release actor.

After a PR merges to `main`, `.github/workflows/merged-pr-main-releasability.yml` dispatches
`main-releasability.yml` from a created-or-verified immutable
`main-releasability-<merge_sha>` tag, passing the expected merge SHA and originating PR number. The
gate has no automatic `push` trigger and rejects a different checkout before Workflow Lint and the
quality chain start. Concurrency is revision-aware: it keys on the expected merge SHA, with
`github.sha` used only when an operator dispatches the gate without an expected SHA.
