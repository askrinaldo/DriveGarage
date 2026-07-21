---
name: Post-merge DB push
description: drizzle-kit push is interactive and hangs during post-merge; use push-force + yes pipe + prefer-offline.
---

## Rule
`scripts/post-merge.sh` must use:
```bash
pnpm install --frozen-lockfile --prefer-offline
yes "" 2>/dev/null | pnpm --filter @workspace/db run push-force || true
```

**Why:** Three separate failure modes have been observed:

1. **bare `push` hangs** — `drizzle-kit push` uses inquirer for data-loss confirmations. With stdin closed (`/dev/null`) during post-merge, the process hangs until the 20 s timeout kills it. Fix: use `push-force` (`--force` flag).

2. **rename-detection prompt silently skips new tables** — `drizzle-kit push --force` still shows a "Is X created or renamed from another table?" selector for each new table. With closed stdin it gets EOF and skips the table silently — exits 0 but table is never created. Fix: `yes "" 2>/dev/null |` pipes unlimited newlines so each selector auto-selects the default (create table). Add `|| true` so the pipe's non-zero exit when it closes doesn't abort the script.

3. **pnpm install timeout** — `pnpm install --frozen-lockfile` without `--prefer-offline` does registry round-trips even when the lockfile is up to date, taking ~19.5 s of the 20 s post-merge budget and leaving no time for drizzle push. Fix: add `--prefer-offline` to skip network checks and use the local store.

**How to apply:** Any time post-merge.sh is edited, verify all three flags are present. If a new table is missing after a merge, the rename-detection prompt is the likely culprit — create it manually via SQL as a hotfix, then confirm post-merge.sh has the `yes "" |` pipe.
