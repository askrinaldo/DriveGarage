---
name: Post-merge DB push
description: drizzle-kit push is interactive and hangs during post-merge; use push-force instead.
---

## Rule
Always use `pnpm --filter @workspace/db run push-force` in `scripts/post-merge.sh`, never `push`.

**Why:** `drizzle-kit push` uses inquirer for confirmation prompts (e.g. "add unique constraint without truncating?"). During post-merge, stdin is closed (`/dev/null`), so the process hangs until the 20 s timeout kills it. The `push-force` script passes `--force` to drizzle-kit, which skips all interactive prompts.

**How to apply:** Any time the post-merge script is edited or created, verify it says `push-force`, not `push`. The `push-force` npm script already exists in `lib/db/package.json`.
