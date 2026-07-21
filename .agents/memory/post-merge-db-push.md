---
name: Post-merge DB push
description: drizzle-kit push is interactive and hangs during post-merge; use push-force + yes pipe.
---

## Rule
`scripts/post-merge.sh` must use:
```bash
yes "" 2>/dev/null | pnpm --filter @workspace/db run push-force || true
```
Never use bare `push` or bare `push-force` without the `yes ""` pipe.

**Why:** Two separate interactive prompts can block the post-merge run:
1. `drizzle-kit push` uses inquirer for data-loss confirmations ("are you sure?"). `--force` skips these.
2. `drizzle-kit push --force` still asks a **rename-vs-create** selector for each new table ("Is X created or renamed from another table?"). With stdin closed (`/dev/null`) this prompt gets EOF and silently skips the table — the command exits 0 but the table is never created. `yes ""` pipes unlimited newlines so each selector auto-selects the default (create table).

**How to apply:** Any time post-merge.sh is edited, verify it includes the `yes "" |` pipe AND `|| true` (so a non-zero exit from `yes` when the pipe closes doesn't abort the script). If a new table is missing after a merge, the rename-detection prompt is the likely culprit — create it manually via SQL as a hotfix, then confirm post-merge.sh has the pipe.
