---
name: API route path prefix
description: Express routes in api-server must NOT include /api prefix — app.ts mounts the router at /api.
---

The router in `artifacts/api-server/src/routes/index.ts` is mounted at `/api` in `app.ts`:
```
app.use("/api", router);
```

**Rule:** Route definitions inside any route file must NOT include the `/api` prefix.

- Correct: `router.get("/vehicles/:id/reminders", ...)`
- Wrong: `router.get("/api/vehicles/:id/reminders", ...)`

**Why:** Express strips the mount path before matching, so `/api/vehicles/...` defined inside the router becomes `/api/api/vehicles/...` externally — silently 404s with no startup error.

**How to apply:** Every new route file added to `src/routes/` must use paths starting with `/vehicles/`, `/clubs/`, `/stats/`, etc. — never `/api/...`.
