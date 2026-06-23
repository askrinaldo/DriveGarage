---
name: API client schema duplication
description: lib/api-client-react has its own inlined type definitions separate from lib/api-zod — both must be updated when schema fields change.
---

`lib/api-client-react/src/generated/api.schemas.ts` contains its own inlined copies of all shared types (Club, ClubWithMembers, CreateClubBody, etc.). These are NOT imported from `lib/api-zod` — they are duplicated by Orval's codegen.

**Why:** The api-client-react lib was generated as a self-contained package, so orval inlined all schemas alongside the hooks rather than re-exporting from api-zod.

**How to apply:** Whenever you add a field to a type in `lib/api-zod/src/generated/types/`, you must ALSO add it to the matching interface in `lib/api-client-react/src/generated/api.schemas.ts`. Then run `pnpm run typecheck:libs --force` to force a full rebuild.

The vintage-garage artifact resolves `ClubWithMembers` through api-client-react, NOT api-zod, because its tsconfig only references `lib/api-client-react`.
