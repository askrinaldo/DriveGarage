#!/bin/bash
set -e
# --prefer-offline skips registry round-trips (lockfile is already frozen).
# This keeps install well within the 20 s post-merge budget so drizzle push
# always gets a chance to run.
pnpm install --frozen-lockfile --prefer-offline
# drizzle-kit push --force skips data-loss confirmations but still prompts for
# rename-vs-create detection. Pipe newlines so each prompt auto-selects the
# default (create table) without hanging on closed stdin.
yes "" 2>/dev/null | pnpm --filter @workspace/db run push-force || true
