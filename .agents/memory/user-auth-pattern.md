---
name: User auth pattern
description: Global user auth (not club auth) — JWT storage, header convention, middleware usage
---

## Pattern

- Token stored in localStorage under key `user_session` as JSON `{token, id, name, email, role}`.
- Client sends token via `x-user-token` request header.
- Server reads it with `parseUserAuth` middleware (verifies JWT, sets `req.userAuth`).
- `requireUser` / `requireSuperAdmin` — guard middleware, apply after parseUserAuth per-route.

**Why per-route, not global:** parseUserAuth is non-blocking (just sets req.userAuth or not), so it could be global, but we apply it per-route alongside requireUser to keep auth explicit and avoid touching existing club auth routes.

## Hook

`useUserAuth()` in `artifacts/vintage-garage/src/hooks/use-user-auth.ts`
- `register(name, email, password)` → POST /api/users/register
- `login(email, password)` → POST /api/users/login
- `logout()` — clears localStorage
- `isSuperAdmin` — boolean derived from `session.role === "super_admin"`
- `token` — raw JWT string for attaching to fetch headers

## Roles

- `"user"` — default
- `"super_admin"` — access to /admin panel and all /api/admin/* routes

## Seed admin

`seedSuperAdmin()` in `artifacts/api-server/src/lib/seedAdmin.ts`, called after httpServer.listen.
Reads `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars. Creates or upgrades existing user to super_admin.
