---
name: Post-merge DB push
description: post-merge.sh must skip pnpm install and use push-force + yes pipe.
---

## Rule
`scripts/post-merge.sh` must contain ONLY:
```bash
#!/bin/bash
set -e
yes "" 2>/dev/null | pnpm --filter @workspace/db run push-force || true
```
Do NOT include `pnpm install` in this script.

**Why — three failure modes:**

1. **`pnpm install` times out** — even with `--frozen-lockfile --prefer-offline`, pnpm takes 20–44 s in this environment when nothing needs installing (workspace overhead). The post-merge budget is 20 s, so install consumes the entire budget before drizzle push can run. The merge process already runs pnpm install before invoking post-merge.sh, making a second install redundant.

2. **bare `push` hangs** — `drizzle-kit push` uses inquirer for data-loss confirmations. With stdin closed during post-merge, the process hangs. Fix: use `push-force` (`--force` flag skips those prompts).

3. **rename-detection prompt silently skips new tables** — `drizzle-kit push --force` still shows a "Is X created or renamed from another table?" selector for each new table. With closed stdin it gets EOF and skips the table silently (exits 0 but table is never created). Fix: `yes "" 2>/dev/null |` auto-selects the default (create table). Add `|| true` so the pipe's non-zero exit doesn't abort the script.

**If a new table is missing after a merge:** create it manually via raw SQL as a hotfix, then confirm post-merge.sh has no `pnpm install` and has the `yes "" |` pipe.
