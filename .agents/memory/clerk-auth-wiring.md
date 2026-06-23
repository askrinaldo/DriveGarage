---
name: Clerk auth wiring
description: How Replit-managed Clerk is wired into the API server and frontend, and key operational lessons.
---

## Wiring

- `clerkMiddleware({ publishableKey, secretKey })` in `app.ts` — pass env vars directly (no `publishableKeyFromHost` on server side; that function does NOT exist in `@clerk/shared@2.22.1`).
- `clerkUserAuth.ts` bridges Clerk session → `req.userAuth` with JIT DB provisioning.
- Frontend: `publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)` from `@clerk/react/internal` — this DOES work on the client side.
- Bearer token injected via `setClerkTokenGetter` + `useSession().getToken()` — required because Replit dev-proxy breaks Clerk cookie auth (dev-browser-missing error).

## JIT Race Condition Fix

Concurrent parallel API requests on a new user's first login all try to INSERT simultaneously → PostgreSQL `23505` unique constraint error → some requests get 401. Fix: wrap INSERT in try/catch, on `23505` re-select the user that won the race. Applied in `clerkUserAuth.ts`.

## Re-provisioning

If the Auth pane says "Replit Auth is not configured" (e.g. after accidental Clerk app deletion):
- Call `setupClerkWhitelabelAuth()` via code_execution — this re-provisions and updates all 3 secrets automatically.
- Restart both workflows after.
- Existing users relink automatically via email on next login (JIT email-match fallback).
- The underlying Clerk instance may survive an Auth pane deletion — JWKS still responds and users can still sign in even when Auth pane shows "not configured".

**Why:** The Auth pane's "Delete Clerk app" removes the UI binding but may not destroy the underlying Clerk backend. `setupClerkWhitelabelAuth()` is the canonical restore path.
