#!/bin/bash
set -e
pnpm install --frozen-lockfile
# drizzle-kit push --force skips data-loss confirmations but still prompts for
# rename-vs-create detection. Pipe newlines so each prompt auto-selects the
# default (create table) without hanging on closed stdin.
yes "" 2>/dev/null | pnpm --filter @workspace/db run push-force || true
