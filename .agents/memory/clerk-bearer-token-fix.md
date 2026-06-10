---
name: Clerk Bearer Token Fix for Replit Dev Proxy
description: How to fix Clerk auth in Replit dev environment where cookie-based session validation fails
---

## Problem
In Replit dev-proxy environment, `getAuth(req)` in `@clerk/express` always returns `userId: null` even when Clerk cookies (`__session`, `__clerk_db_jwt`, `__client_uat`) are present in the request.

**Root cause**: In dev mode, `@clerk/backend` v3.5 requires `__clerk_db_jwt` (devBrowserToken) via `getSuffixedOrUnSuffixedCookie`. The cookie IS sent but Clerk's `usesSuffixedCookies()` logic may pick wrong variant. Also requires `__client_uat` alongside `__session`. The Replit proxy sets `host: localhost` which breaks Clerk's domain validation.

**Confirmed error reason**: `dev-browser-missing` → Clerk can't find `devBrowserToken` in cookies.

## Solution: Bearer Token approach

Bearer tokens bypass ALL cookie validation logic in Clerk's `authenticateRequestWithTokenInCookie`. When `tokenInHeader` is present, it goes directly to `verifyToken()`.

### Frontend (`App.tsx`)
```tsx
import { useSession } from "@clerk/react";
import { setClerkTokenGetter } from "@workspace/api-client-react";

function ClerkTokenInjector() {
  const { session } = useSession();
  // Synchronous registration on every render — no race condition
  if (session) {
    setClerkTokenGetter(() => session.getToken());
  } else {
    setClerkTokenGetter(null);
  }
  return null;
}
// Mount inside <ClerkProvider>
```

### `use-user-auth.ts` — direct fetch of `/api/auth/user`
```ts
const { session: clerkSession } = useSession();
useEffect(() => {
  if (!authLoaded || !isSignedIn || !clerkSession) { setDbProfile(null); return; }
  clerkSession.getToken().then((token) => {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch("/api/auth/user", { credentials: "include", headers });
  }).then(...);
}, [isSignedIn, authLoaded, clerkSession]);
```

### `lib/api-client-react/src/custom-fetch.ts`
Added `setClerkTokenGetter()` — registered getter is called before every API request, injects `Authorization: Bearer <token>` before `_authTokenGetter` (club JWT).

## Why Bearer Token Works
`@clerk/backend` v3.5 `authenticateRequestWithTokenInHeader()` is called when `tokenInHeader` is set, which calls `verifyToken()` directly — no cookie/devBrowser logic at all.

**Why:** Replit dev proxy rewrites `host` header to `localhost`, breaking Clerk's cookie domain validation. Bearer tokens are domain-agnostic.

**How to apply:** Always use this pattern for Replit-hosted Clerk apps in dev mode. In production, Clerk proxying handles it differently (proxy rewrites `host` correctly).
