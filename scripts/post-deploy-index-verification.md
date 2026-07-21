# Post-Deploy Index Verification

## Context

Three performance indexes were added to the Drizzle schema in the forum/RSVP/ownership-history feature work. They are defined in the schema source of truth and applied to the development database. Replit's Publish flow diffs dev vs production and applies them automatically on the next deploy.

## Indexes to Verify

| Index name | Table | Column |
|---|---|---|
| `idx_vehicle_ownership_history_vehicle_id` | `vehicle_ownership_history` | `vehicle_id` |
| `idx_club_event_rsvps_event_id` | `club_event_rsvps` | `event_id` |
| `idx_forum_likes_post_id` | `forum_likes` | `post_id` |

## Schema Source of Truth

The indexes are declared in:

- `lib/db/src/schema/vehicleOwnershipHistory.ts` — `index("idx_vehicle_ownership_history_vehicle_id").on(t.vehicleId)`
- `lib/db/src/schema/clubEventRsvps.ts` — `index("idx_club_event_rsvps_event_id").on(t.eventId)`
- `lib/db/src/schema/forumLikes.ts` — `index("idx_forum_likes_post_id").on(t.postId)`

## Dev DB Status (verified 2026-07-21)

All three indexes are present in the development database:

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname IN (
  'idx_vehicle_ownership_history_vehicle_id',
  'idx_club_event_rsvps_event_id',
  'idx_forum_likes_post_id'
)
ORDER BY tablename, indexname;
```

Result in dev:
```
indexname                                  | tablename
-------------------------------------------+----------------------------
idx_club_event_rsvps_event_id              | club_event_rsvps
idx_forum_likes_post_id                    | forum_likes
idx_vehicle_ownership_history_vehicle_id   | vehicle_ownership_history
```

## Production DB Status (as of 2026-07-21, pre-deploy)

All three indexes are absent from production. They will be applied automatically by Replit's Publish flow on the next deploy (Replit diffs dev vs prod schema and applies the delta SQL as `CREATE INDEX IF NOT EXISTS ...`).

## Post-Deploy Verification Steps

After the next Publish, run the query above against production to confirm all three rows are returned. Using the Replit database skill:

```javascript
const result = await executeSql({
  sqlQuery: `
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE indexname IN (
      'idx_vehicle_ownership_history_vehicle_id',
      'idx_club_event_rsvps_event_id',
      'idx_forum_likes_post_id'
    )
    ORDER BY tablename, indexname
  `,
  environment: "production"
});
console.log(result.output);
```

Expected output (3 rows):
```
indexname                                  | tablename
-------------------------------------------+----------------------------
idx_club_event_rsvps_event_id              | club_event_rsvps
idx_forum_likes_post_id                    | forum_likes
idx_vehicle_ownership_history_vehicle_id   | vehicle_ownership_history
```

If any row is missing after publish, the Drizzle schema diff was not applied. In that case, re-publish from the Replit UI — do not attempt to run DDL directly against production.
