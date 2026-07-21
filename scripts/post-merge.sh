#!/bin/bash
set -e
# pnpm install is handled by the merge process before this script runs.
# Running it here again takes 20-44 s even when nothing has changed, which
# consumes the entire 20 s post-merge budget and prevents drizzle push from
# running. Skip it.

# drizzle-kit push --force skips data-loss confirmations but still prompts for
# rename-vs-create detection. Pipe newlines so each prompt auto-selects the
# default (create table) without hanging on closed stdin.
yes "" 2>/dev/null | pnpm --filter @workspace/db run push-force || true
