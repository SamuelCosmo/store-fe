<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Rules

## Git operations are forbidden

NEVER run commit, push, rebase, merge, pull, pull request creation, branch
creation/switching, worktrees, cherry-pick, stash, tag, or any other git
operation that modifies history, refs, remotes, or working-tree state beyond
reading it.

Read-only git commands (status, diff, log, show, blame) are allowed.

If a task seems to require a git write operation, stop and ask the user to
run it themselves.
