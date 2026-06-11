---
name: User auth pattern
description: Global user auth (not club auth) — JWT storage, header convention, middleware usage, Clerk dual-auth
---

## Pattern

- Token stored in localStorage under key `user_session` as JSON `{token, id, name, email, role}`.
- Client sends token via `x-user-token` request header for admin JWT users.
- Clerk users send `Authorization: Bearer <clerk-token>` instead.
- Server reads it with `parseUserAuth` middleware (verifies JWT, sets `req.userAuth`).
- `requireUser` / `requireSuperAdmin` — guard middleware, apply after parseUserAuth per-route.

**Why per-route, not global:** parseUserAuth is non-blocking (just sets req.userAuth or not), so it could be global, but we apply it per-route alongside requireUser to keep auth explicit and avoid touching existing club auth routes.

## Hook

`useUserAuth()` in `artifacts/vintage-garage/src/hooks/use-user-auth.ts`
- `register(name, email, password)` → POST /api/users/register
- `login(email, password)` → POST /api/users/login
- `logout()` — clears localStorage
- `isSuperAdmin` — boolean derived from `session.role === "super_admin"`
- `getAuthHeaders()` — async, returns `{"x-user-token": jwt}` for admin users or `{"Authorization": "Bearer <clerk-token>"}` for Clerk users. Wrapped in `useCallback([adminSession, clerkSession])` for stable reference. Use this instead of reading `token` directly.

**Why `getAuthHeaders` not `token`:** Clerk users have `token: null`; only `getAuthHeaders()` handles both auth paths correctly. Using raw `token` in headers causes 401 for all Clerk users.

**useEffect deps:** When `getAuthHeaders` is in a useEffect deps array, ensure it is wrapped in `useCallback` in the hook, otherwise new function reference every render → infinite fetch loop.

## Roles

- `"user"` — default
- `"super_admin"` — access to /admin panel and all /api/admin/* routes

## Seed admin

`seedSuperAdmin()` in `artifacts/api-server/src/lib/seedAdmin.ts`, called after httpServer.listen.
Reads `ADMIN_EMAIL` + `ADMIN_PASSWORD` env vars. Creates or upgrades existing user to super_admin.
