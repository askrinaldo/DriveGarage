# DriveGarage — Architecture

> **Status:** Living document. Last updated June 2026.
> Keep this in sync when adding modules, changing auth patterns, or extracting services.

---

## 1. Repository Layout

```
artifacts-monorepo/
├── artifacts/
│   ├── api-server/          # Express 5 REST API (Node.js, TypeScript)
│   └── vintage-garage/      # React + Vite frontend (TypeScript)
├── lib/
│   ├── api-spec/            # OpenAPI contract source (openapi.yaml + orval.config.ts)
│   ├── api-client-react/    # Generated: React Query hooks (from OpenAPI)
│   ├── api-zod/             # Generated: Zod param/body schemas (from OpenAPI)
│   └── db/                  # Drizzle ORM schema + client (@workspace/db)
├── scripts/                 # Utility scripts
├── pnpm-workspace.yaml      # Workspace catalog + package discovery
├── tsconfig.base.json       # Shared strict TS defaults
└── tsconfig.json            # Root solution file (libs only)
```

**Codegen contract:**
```
lib/api-spec/openapi.yaml
  └─► pnpm --filter @workspace/api-spec run codegen
        ├─► lib/api-client-react/src/generated/   (React Query hooks)
        └─► lib/api-zod/src/generated/             (Zod schemas for server validation)
```
Run codegen after every OpenAPI change. Commit generated output.

---

## 2. Current Backend Structure

```
artifacts/api-server/src/
├── app.ts                   # Express app: CORS, middleware stack, error handler
├── index.ts                 # HTTP server entry point
├── socket.ts                # Socket.IO server setup
├── webhookHandlers.ts       # Stripe webhook logic
│
├── lib/
│   ├── audit.ts             # Structured audit log helper
│   ├── envValidation.ts     # Startup env-var validation
│   ├── logger.ts            # Pino logger singleton
│   ├── mailer.ts            # Nodemailer helper (transactional email) ← moved Phase 2
│   ├── seedAdmin.ts         # Dev seed helper
│   ├── stripeClient.ts      # Stripe SDK init                         ← moved Phase 2
│   ├── subscriptionTier.ts  # Tier lookup from DB
│   └── vehicleOwnership.ts  # assertVehicleOwnership() shared helper  ← extracted Phase 2
│
├── middleware/              # Request-level middleware — single folder (merged Phase 2)
│   ├── auth.ts              # Club JWT: parseAuth, requireClubRole, signClubToken
│   ├── clerkProxyMiddleware.ts  # Clerk FAPI proxy               ← moved Phase 2
│   ├── clerkUserAuth.ts     # Clerk → DB user bridge; sets req.userAuth
│   ├── rateLimiter.ts       # express-rate-limit presets
│   └── userAuth.ts          # Legacy JWT + Clerk user gate: parseUserAuth, requireUser
│
└── routes/                  # 23 flat route files — no domain grouping
    ├── [core vehicle domain]
    │   ├── vehicles.ts
    │   ├── serviceRecords.ts
    │   ├── receipts.ts
    │   ├── tripLogs.ts
    │   ├── serviceReminders.ts
    │   ├── stats.ts
    │   └── vehicleTransfers.ts
    ├── [clubs domain]
    │   ├── clubs.ts
    │   ├── clubInvitations.ts
    │   ├── clubGarage.ts
    │   ├── clubDashboard.ts
    │   ├── clubEvents.ts
    │   ├── forum.ts
    │   ├── badges.ts
    │   └── marketplace.ts
    ├── [user/auth domain]
    │   ├── auth.ts
    │   ├── userAuth.ts
    │   └── tenants.ts
    ├── [AI/assistant domain]
    │   ├── maintenanceAdvice.ts
    │   ├── chat.ts
    │   ├── chatHistory.ts
    │   └── financeInsight.ts
    ├── [system/admin domain]
    │   ├── admin.ts
    │   ├── support.ts
    │   ├── projects.ts
    │   ├── billing.ts     (temporarily disabled)
    │   └── health.ts
    └── index.ts            # Router aggregator
```

---

## 3. Current Frontend Structure

```
artifacts/vintage-garage/src/
├── App.tsx                  # Single router: imports ~35 pages directly ← TODO: feature-split
├── main.tsx
├── index.css
│
├── pages/                   # 39 flat page files — no domain grouping
│   ├── [auth]               landing, login, register, sign-in, sign-up
│   ├── [vehicles]           vehicle-list, vehicle-detail, vehicle-form, vehicle-print,
│   │                        vehicle-ai-advice, vehicle-reminders, vehicle-transfer,
│   │                        public-garage, service-form, receipt-form, trip-form
│   ├── [clubs]              clubs-list, club-detail, club-form, club-dashboard,
│   │                        club-events, club-event-detail, club-event-form,
│   │                        club-forum, club-forum-post, club-garage,
│   │                        club-marketplace, club-audit-log, club-invite
│   ├── [user]               profile, membership-card, dashboard
│   ├── [org]                tenant-settings, tenant-invite, tenant-new
│   └── [system]             admin, billing (disabled), help, not-found
│
├── components/
│   ├── ui/                  ~40 shadcn/ui primitives (do not modify)
│   ├── layout.tsx           App shell: sidebar navigation, tenant switcher
│   ├── ai-chat-widget.tsx
│   ├── language-switcher.tsx
│   ├── theme-panel.tsx
│   └── ui-states.tsx        Loading/empty/error state wrappers
│
├── hooks/
│   ├── use-club-auth.ts     Club JWT management
│   ├── use-club-socket.ts   Socket.IO for real-time club updates
│   ├── use-user-auth.ts     Clerk + legacy JWT unified hook; getAuthHeaders()
│   ├── use-subscription.ts  Subscription tier (currently stubbed — billing disabled)
│   ├── use-mobile.tsx       Responsive breakpoint
│   └── use-toast.ts         Toast notifications
│
├── contexts/
│   └── theme.tsx            ThemeProvider + applyTheme()
│
├── i18n/
│   ├── index.ts             react-i18next setup
│   └── translations/        no.ts, sv.ts, da.ts, en.ts
│
└── lib/
    └── utils.ts             cn() and other small helpers
```

---

## 4. Shared Libraries

| Package | Role |
|---------|------|
| `@workspace/db` | Drizzle schema + pg client. Only imported by api-server. |
| `@workspace/api-spec` | OpenAPI YAML source. Not imported — only used by codegen. |
| `@workspace/api-client-react` | Generated React Query hooks. Imported by vintage-garage. |
| `@workspace/api-zod` | Generated Zod schemas. Imported by api-server for validation. |

---

## 5. Authentication System

### 5.1 Auth Landscape (Phase 3 Audit — June 2026)

Two parallel auth systems coexist. A third (local email/password) exists in the backend
but is exposed to no regular user and is classified as an admin-only fallback.

---

#### System A — User Auth (Clerk primary + admin JWT fallback)

Used for all private user data: vehicles, service records, stats, profile, billing, admin.

```
Request
  └─► clerkMiddleware (@clerk/express)    → validates Clerk session cookie
  └─► parseUserAuth (middleware/userAuth) → reads x-user-token header (admin JWT only)
  └─► clerkUserAuth (middleware/clerkUserAuth)
        ├─ If req.userAuth already set by parseUserAuth → skip (admin JWT takes priority)
        ├─ Look up usersTable by replitUserId (Clerk userId)
        ├─ JIT provision: if not found, create user row (passwordHash = null) + personal tenant
        └─ Sets req.userAuth: { userId, email, name, role, tenantId, tenantName, tenantRole }

Route guards:
  requireUser        — any authenticated user (Clerk or admin JWT)
  requireSuperAdmin  — role = super_admin only
```

**Frontend flow:**
```
Landing (/) → /sign-in → Clerk SignIn component → /api/auth/user (bridge) → /dashboard
             → /sign-up → Clerk SignUp component → JIT provision on first request → /dashboard
```

**Active OAuth providers:** Google ✅ (enabled in Clerk dashboard)  
**Microsoft login:** ⬜ Not yet enabled — see Section 5.4 below.

---

#### System B — Club Auth (custom JWT, stateless)

Used for club-scoped operations: forum, garage, events, marketplace, badges.

```
Request
  └─► parseAuth (middleware/auth.ts)  → reads Authorization: Bearer <club-token>
                                        → sets req.auth: { memberName, clubId, role }

Club token issued by: POST /api/auth/club-session (exchange memberName + clubId → JWT, 7d)

Route guards:
  requireClubRole("member" | "admin" | "owner")
```

> **⚠ Risk:** Systems A and B are entirely separate. Phase 7 goal: unify club roles on
> System A (Clerk userId) so club membership is linked to verified user identity.

---

#### System C — Local email/password (admin fallback only)

```
Backend routes:  POST /api/users/register  (bcryptjs, 12 rounds, creates passwordHash)
                 POST /api/users/login     (validates passwordHash, returns 30-day JWT)

Frontend hook:   useUserAuth().login()     — calls /api/users/login
                 useUserAuth().register()  — calls /api/users/register

JWT storage:     localStorage["user_session"]
JWT transport:   x-user-token request header
JWT priority:    takes priority over Clerk session (admin can override Clerk user)
```

**Status: Dead code path for regular users.**  
- `login.tsx` and `register.tsx` are pure redirectors → Clerk (`/sign-in`, `/sign-up`).
- No frontend form or UI calls `login()` or `register()` from the hook.
- The `login()` / `register()` functions in `use-user-auth.ts` exist only to support
  the super_admin manual-access workflow via direct API calls + localStorage.
- `usersTable.password_hash` column: nullable — Clerk-provisioned users have `null`.
- **Do not expose this system to end users. Do not add UI for it.**
- **Do not delete the DB column or routes yet** — needed for admin fallback.
- **Safe to remove:** only after super_admin workflow is migrated to Clerk admin console.

---

### 5.2 Data Ownership & User Isolation

| Check | Status |
|-------|--------|
| userId trusted from request body | ✅ None found — all routes use `req.userAuth.userId` |
| Clerk JIT provisioning on first sign-in | ✅ `clerkUserAuth.ts` — creates user + personal tenant |
| Super_admin cannot impersonate via Clerk token | ✅ Role comes from `usersTable.role`, not Clerk claims |
| Inactive users blocked | ✅ `requireUser` checks `isActive === true` |
| `assertVehicleOwnership()` on all sub-resources | ✅ Shared helper in `lib/vehicleOwnership.ts` |
| New user sees empty dashboard (no demo data) | ✅ Dashboard shows 0s, has "add first vehicle" empty state |

---

### 5.3 Onboarding Gaps

| Gap | Severity | Notes |
|-----|----------|-------|
| Landing page stats (12 000+ vehicles, etc.) are hardcoded | Low | Marketing copy — not real DB counts |
| No "welcome" modal or onboarding flow after first sign-in | Low | Empty state + "Add vehicle" button is sufficient |
| Profile page uses Clerk name/email/avatar correctly | ✅ | `clerkUser?.fullName`, `primaryEmailAddress`, `imageUrl` |
| Logout clears both Clerk session and admin JWT | ✅ | `useUserAuth().logout()` handles both paths |
| Account settings via Clerk `<UserButton>` | ✅ | Clerk handles password change, OAuth linking, etc. |

---

### 5.4 Microsoft Login — Enable in Clerk Dashboard

Microsoft OAuth is **not configured in any code file** and requires no code changes.
To enable, a project owner must perform the following steps in Clerk:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → your DriveGarage application
2. Navigate to **User & Authentication → Social connections**
3. Find **Microsoft** and toggle it on
4. Choose **"Use Clerk's credentials"** (fastest) or provide your own Azure AD credentials
5. Save — Microsoft appears on the Clerk sign-in/sign-up widget automatically

> **No backend or frontend code changes needed.** Clerk handles the OAuth flow,
> token exchange, and email linking. The JIT provisioning in `clerkUserAuth.ts`
> will work identically for Microsoft-authenticated users.

---

### 5.5 Recommended Auth Strategy

| Decision | Recommendation |
|----------|---------------|
| Single source of truth | **Clerk** — all user auth goes through Clerk |
| Google login | ✅ Already enabled in Clerk dashboard |
| Microsoft login | ⬜ Enable in Clerk dashboard (no code changes needed) |
| Email/password for users | 🚫 Keep disabled for regular users — Clerk handles email via magic link/OTP |
| Magic link / Passkey | ⬜ Consider in a future phase — Clerk supports both, enable in dashboard |
| Local auth (System C) | Keep as-is (admin fallback only) — plan removal after admin console migration |
| Club auth (System B) | Keep as-is — plan unification in Phase 7 |

---

### 5.6 Manual Verification Checklist

Run this checklist before each significant release:

```
AUTH FLOWS
  [ ] New Google signup → lands on /dashboard → sees empty state (no demo data)
  [ ] New Microsoft signup → same as above (after Clerk dashboard enablement)
  [ ] Returning login (existing Clerk user) → lands on /dashboard
  [ ] Logout → lands on / (landing page) → session fully cleared
  [ ] Expired session → redirected to /sign-in (not a blank/broken page)

USER ISOLATION
  [ ] User A cannot see User B's vehicles (direct URL /vehicles/:id → 404)
  [ ] User A cannot access User B's service records or receipts
  [ ] User A cannot see User B's dashboard stats

NEW USER ONBOARDING
  [ ] Empty dashboard shows "Legg til kjøretøy" empty state (no 0-count errors)
  [ ] "Legg til kjøretøy" button navigates correctly to /vehicles/new
  [ ] Adding first vehicle → vehicle appears in dashboard immediately
  [ ] Profile page shows correct name/email/avatar from Clerk
  [ ] Account settings (change email, password, connected accounts) accessible via Clerk widget

ADMIN
  [ ] super_admin can log in via admin JWT fallback (x-user-token header)
  [ ] super_admin sees admin panel; regular user gets 403
```

---

## 6. Data Ownership Model

| Data class | Isolation mechanism | Tables |
|-----------|---------------------|--------|
| Private user data | `tenantId` (primary) or `userId` (fallback) | vehicles, service_records, receipts, trip_logs, service_reminders |
| Tenant/org | `tenantId` | tenants, tenant_memberships, tenant_invitations |
| Club shared | `clubId` + membership check | clubs, club_members, club_events, forum_posts, club_garage, marketplace |
| Club admin | `clubId` + role ≥ admin | audit_logs, club_invitations |
| System | super_admin role | users, support_tickets, suggestions, monthly_projects |

**All private routes enforce:**  
`parseUserAuth → requireUser → ownershipClause(tenantId, userId)` in every WHERE clause.  
Sub-resources (service records, receipts, trip logs) use `assertVehicleOwnership()` from `lib/vehicleOwnership.ts` to verify the parent vehicle before any DB access.

---

## 7. Identified Structure Risks

### Critical (fix in Phase 2–3)

| # | Risk | Location | Fix |
|---|------|----------|-----|
| R1 | ~~Duplicate auth-folder~~ | ~~`middleware/` vs `middlewares/`~~ | ✅ Fixed Phase 2 |
| R2 | ~~`assertVehicleOwnership` copy-pasted × 3~~ | ~~serviceRecords, receipts, tripLogs~~ | ✅ Fixed Phase 2 |
| R3 | Routes contain full DB query logic | All route files | Extract to `services/` layer |
| R4 | ~~`stripeClient.ts` + `mailer.ts` at root~~ | ~~api-server/src/~~ | ✅ Fixed Phase 2 |
| R5 | `App.tsx` imports 35+ page components | vintage-garage | Split into feature routers |
| R6 | Club auth (JWT) entirely separate from user auth | middleware/auth.ts | Phase 6: unify on Clerk userId |

### Medium (fix in Phase 4–5)

| # | Risk | Location | Fix |
|---|------|----------|-----|
| R7 | No service layer — business logic in route handlers | routes/*.ts | Extract `services/*.ts` |
| R8 | Frontend has no feature folder boundaries | pages/ | Reorganize into `features/` |
| R9 | `clubs.ownerName` is a string, not a FK to users | db schema | Phase 6: add ownerUserId FK |
| R10 | Club memberName is a string, not linked to userId | db schema | Phase 6: add userId FK |

### Low (document, fix later)

| # | Risk | Fix |
|---|------|-----|
| R11 | No DB indexes on userId/tenantId/vehicleId | Add in a schema migration |
| R12 | File uploads have no server-side MIME/size validation | Add when upload routes are added |
| R13 | No automated API tests | Add Vitest + Supertest in Phase 4 |

---

## 8. Target Architecture (Goal State)

### Backend

```
artifacts/api-server/src/
├── app.ts
├── index.ts
├── socket.ts
│
├── lib/
│   ├── audit.ts
│   ├── envValidation.ts
│   ├── logger.ts
│   ├── mailer.ts             ← move from root
│   ├── stripeClient.ts       ← move from root
│   ├── vehicleOwnership.ts   ← extract from 3 route files (R2)
│   └── subscriptionTier.ts
│
├── middleware/               ← single folder (merge middlewares/ into this)
│   ├── auth.ts
│   ├── clerkProxyMiddleware.ts   ← move from middlewares/
│   ├── clerkUserAuth.ts
│   ├── rateLimiter.ts
│   └── userAuth.ts
│
├── services/                 ← NEW: business logic extracted from routes
│   ├── vehicles.service.ts
│   ├── serviceRecords.service.ts
│   ├── receipts.service.ts
│   ├── tripLogs.service.ts
│   ├── stats.service.ts
│   ├── clubs.service.ts
│   ├── clubInvitations.service.ts
│   └── webhookHandlers.service.ts   ← move from root
│
└── routes/
    ├── index.ts              ← domain-grouped imports
    ├── vehicles/
    │   ├── index.ts
    │   ├── vehicles.ts
    │   ├── serviceRecords.ts
    │   ├── receipts.ts
    │   ├── tripLogs.ts
    │   ├── serviceReminders.ts
    │   ├── stats.ts
    │   └── vehicleTransfers.ts
    ├── clubs/
    │   ├── index.ts
    │   ├── clubs.ts
    │   ├── clubInvitations.ts
    │   ├── clubGarage.ts
    │   ├── clubDashboard.ts
    │   ├── clubEvents.ts
    │   ├── forum.ts
    │   ├── badges.ts
    │   └── marketplace.ts
    ├── users/
    │   ├── auth.ts
    │   ├── userAuth.ts
    │   └── tenants.ts
    ├── assistant/
    │   ├── maintenanceAdvice.ts
    │   ├── chat.ts
    │   ├── chatHistory.ts
    │   └── financeInsight.ts
    └── system/
        ├── admin.ts
        ├── billing.ts
        ├── support.ts
        ├── projects.ts
        └── health.ts
```

### Frontend

```
artifacts/vintage-garage/src/
├── App.tsx                   ← thin: only imports feature routers
├── main.tsx
├── index.css
│
├── features/                 ← NEW: domain-grouped feature modules
│   ├── vehicles/
│   │   ├── pages/            vehicle-list, vehicle-detail, vehicle-form, ...
│   │   ├── components/       VehicleCard, ServiceTimeline, ...
│   │   └── hooks/            use-vehicles.ts, use-service-records.ts
│   ├── clubs/
│   │   ├── pages/            clubs-list, club-detail, club-form, ...
│   │   ├── components/       ClubCard, MemberList, ForumThread, ...
│   │   └── hooks/            use-club-auth.ts, use-club-socket.ts
│   ├── user/
│   │   ├── pages/            profile, membership-card, dashboard
│   │   └── hooks/            use-user-auth.ts, use-subscription.ts
│   └── admin/
│       └── pages/            admin
│
├── components/               ← shared/global UI only
│   ├── ui/                   shadcn primitives (unchanged)
│   ├── layout.tsx
│   ├── ai-chat-widget.tsx
│   ├── language-switcher.tsx
│   ├── theme-panel.tsx
│   └── ui-states.tsx
│
├── hooks/                    ← global hooks only (feature hooks move to features/)
├── contexts/
├── i18n/
└── lib/
```

---

## 9. Migration Phases

### Phase 1 — Architecture documentation ✅
- [x] Map current structure
- [x] Identify risks
- [x] Propose target architecture
- [x] Add domain grouping comments to `routes/index.ts`
- [x] Create `services/` placeholder

**Done. No behavior change.**

---

### Phase 2 — Centralize middleware and shared helpers ✅
**Goal:** Eliminate duplication and the split middleware folders.

- [x] Moved `middlewares/clerkProxyMiddleware.ts` → `middleware/clerkProxyMiddleware.ts`
- [x] Updated `app.ts` import path
- [x] Moved `mailer.ts` → `lib/mailer.ts`; updated `routes/clubInvitations.ts`
- [x] Moved `stripeClient.ts` → `lib/stripeClient.ts`; updated `routes/billing.ts`, `webhookHandlers.ts`, `index.ts`
- [x] Extracted `assertVehicleOwnership` to `lib/vehicleOwnership.ts` (R2 fixed)
- [x] Updated `serviceRecords.ts`, `receipts.ts`, `tripLogs.ts` to import from shared helper
- [x] Deleted empty `middlewares/` folder
- [x] Removed now-unused `vehiclesTable` imports from the 3 route files

**No behavior change. All existing route behavior and auth preserved.**

---

### Phase 3 — Auth & onboarding audit ✅
**Goal:** Audit all auth methods, lock down the login flow, document onboarding gaps.

- [x] Audited all auth systems (Clerk, local email/password, club JWT)
- [x] Confirmed local auth (System C) is dead code for regular users — no UI exposes it
- [x] Confirmed no route trusts `userId` from request body
- [x] Confirmed `assertVehicleOwnership()` enforced on all vehicle sub-resources
- [x] Confirmed new user gets empty dashboard with correct empty state (no demo data)
- [x] Confirmed profile uses Clerk name/email/avatar
- [x] Landing page links updated: `/login` → `/sign-in`, `/register` → `/sign-up` (removes redirect hop)
- [x] Microsoft login path documented: enable in Clerk dashboard, zero code changes needed
- [x] Recommended auth strategy documented in Section 5.5
- [x] Manual verification checklist written in Section 5.6

**No behavior change for end users. No DB schema changes. No Clerk config changes.**

---

### Phase 4 — Extract service layer
**Goal:** Routes become thin HTTP adapters. Business logic moves to `services/`.

Steps:
1. Create `services/vehicles.service.ts` — move DB query logic from vehicles.ts
2. Create `services/serviceRecords.service.ts`
3. Create `services/stats.service.ts`
4. Continue for all domains
5. Routes import from services, no direct DB access in route handlers

**Test:** Each service must be testable in isolation (no Express req/res). Add basic Vitest tests.

---

### Phase 5 — Validation and error normalization
**Goal:** Consistent, safe API surface.

Steps:
1. Audit all routes — every route must use Zod schema validation on params + body
2. Add `createApiError(code, message, status)` helper for consistent error shape
3. Replace raw `res.status(400).json({ error: ... })` with the helper everywhere
4. Ensure no DB error messages reach the client in production (global error handler already added)
5. Add Vitest + Supertest test suite with at least one test per domain

---

### Phase 6 — Frontend feature folders
**Goal:** Scale frontend without `pages/` becoming unmaintainable.

Steps:
1. Create `features/vehicles/`, `features/clubs/`, `features/user/`, `features/admin/`
2. Move page files into their feature folders (pure file moves + import path updates)
3. Move feature-specific hooks into feature folders
4. Update `App.tsx` to import from feature routers
5. Keep `components/ui/` untouched

**Test:** `pnpm --filter @workspace/vintage-garage run typecheck` must pass. Visual regression: all routes must render correctly.

---

### Phase 7 — Clubs module redesign
**Goal:** Link clubs to real user identities (Clerk userId), deprecate string-based ownership.

Steps (requires schema migration — coordinate with production deploy):
1. Add `ownerUserId` (FK → users.id) to `clubs` table
2. Add `userId` (FK → users.id) to `club_members` table
3. Backfill where possible, mark unresolvable rows as nullable
4. Update `requireClubRole` to resolve `req.auth` from System A (Clerk userId) instead of club JWT
5. Deprecate the separate club JWT system
6. Add email invite flow with `crypto.randomBytes(32)` tokens + 72h expiry

**Test:** Full club lifecycle integration test. Verify cross-user isolation (User A cannot see private club content of a club they are not a member of).

---

## 10. What NOT to Touch Yet

| Area | Reason |
|------|--------|
| DB schema | Any schema change needs a migration + production deploy plan |
| `usersTable.password_hash` column | Admin fallback (System C) still depends on it — remove only when admin console migration is done |
| `POST /api/users/register` + `POST /api/users/login` | Same as above — backend of System C admin fallback |
| `useUserAuth().login()` / `.register()` in the hook | Remove after System C retirement |
| Club JWT auth (`middleware/auth.ts`) | Wait for Phase 7 redesign |
| Clerk dashboard configuration | Enable Microsoft in dashboard — no code changes required |
| Generated files in `lib/api-client-react/` and `lib/api-zod/` | Always regenerate via codegen, never edit manually |
| `components/ui/` shadcn primitives | Generated by shadcn CLI — do not modify |
| `lib/api-spec/openapi.yaml` | Only change when adding/changing API endpoints |

---

## 11. Environment Variables

See `artifacts/api-server/src/lib/envValidation.ts` for the full spec and startup validation.

| Variable | Required | Where used | Notes |
|----------|----------|-----------|-------|
| `DATABASE_URL` | ✅ | `lib/db` | PostgreSQL connection string — server-side only |
| `CLERK_PUBLISHABLE_KEY` | ✅ | `app.ts`, frontend | Public key — safe to expose to browser |
| `CLERK_SECRET_KEY` | ✅ | `app.ts` | Secret — server-side only, never in frontend bundle |
| `SESSION_SECRET` | ✅ | `middleware/userAuth.ts` | JWT signing secret — server-side only |
| `PORT` | optional | `index.ts` | Default 8080 |
| `STRIPE_SECRET_KEY` | legacy* | `lib/stripeClient.ts` | Server-side only — *legacy, see Section 12 |
| `STRIPE_WEBHOOK_SECRET` | legacy* | `webhookHandlers.ts` | *legacy, see Section 12 |
| `REPLIT_DOMAINS` | optional | `app.ts` CORS | Comma-separated. In production, restricts CORS origins |

---

## 12. Payment Provider — Status and Roadmap

> **Updated June 2026.**

### Current status

| Item | Status |
|------|--------|
| Billing module (frontend `billing.tsx`) | ⚠️ Renders with placeholder prices — no real payment flow |
| Stripe integration (`lib/stripeClient.ts`, `webhookHandlers.ts`, `routes/billing.ts`) | 🔴 **Legacy / not planned** — see below |
| Vipps integration | ⬜ **Intended future provider** — not implemented |
| Any payment taken from users | ✅ **None** — no payment is processed at this time |

---

### Stripe — legacy code, not the chosen provider

Stripe code was scaffolded in an earlier phase but **Stripe is not the chosen payment provider for DriveGarage**. The following files contain Stripe-specific code that should be removed once Vipps is implemented and verified:

| File | What to remove |
|------|----------------|
| `artifacts/api-server/src/lib/stripeClient.ts` | Entire file — Stripe SDK init |
| `artifacts/api-server/src/webhookHandlers.ts` | Entire file — Stripe webhook logic |
| `artifacts/api-server/src/routes/billing.ts` | Stripe-specific routes (currently disabled) |
| `artifacts/vintage-garage/src/hooks/use-subscription.ts` | `useStripePrices`, `useCreateCheckout`, `useCustomerPortal` hooks |
| `artifacts/vintage-garage/src/pages/billing.tsx` | Stripe-specific UI and hook calls — replace with Vipps flow |
| `STRIPE_SECRET_KEY` env var | Remove from secrets after Stripe code is deleted |
| `STRIPE_WEBHOOK_SECRET` env var | Remove from secrets after Stripe code is deleted |

**⚠️ Do NOT remove Stripe code until Vipps is implemented and verified in production.**

---

### Vipps — intended payment provider

**Planned model:**
- 7-day free trial (no payment information collected during trial)
- Recurring Vipps payment after explicit user approval of a Vipps payment agreement
- No payment is charged without the user clearly approving a Vipps recurring agreement

**Requirements before implementation:**
- [ ] Register as a Vipps merchant at [vipps.no/developer](https://developer.vippsmobilepay.com/)
- [ ] Obtain Vipps API credentials: `VIPPS_CLIENT_ID`, `VIPPS_CLIENT_SECRET`, `VIPPS_SUBSCRIPTION_KEY`, `VIPPS_MSN` (merchant serial number)
- [ ] Choose Vipps product: **Recurring** (for subscriptions) — `POST /recurring/v3/agreements`
- [ ] Implement backend: create agreement → redirect to Vipps approval → webhook for status updates
- [ ] Update legal pages (`/privacy`, `/terms`, `/cookies`) with Vipps as data processor
- [ ] Sign Vipps data processor agreement (DPA)
- [ ] Legal review of updated payment terms before go-live

**Relevant Vipps API docs:**
- Recurring API: `https://developer.vippsmobilepay.com/docs/APIs/recurring-api/`
- Agreements: `POST /recurring/v3/agreements` → charge model
- Webhooks: `POST /recurring/v3/agreements/{agreementId}/charges` for status updates

**Recommended implementation phase:** After Phase 5 (validation + error normalization) — ensures clean API surface before adding payment integration.

---

### Legal pages — payment wording

The following legal pages already reflect the "Vipps planned, not yet active" state:

| Page | Status |
|------|--------|
| `/privacy` (§3.6, §5 tredjeparter) | ✅ Updated — Vipps planned, no Stripe |
| `/terms` (§5 abonnement og betaling) | ✅ Updated — Vipps model documented |
| `/cookies` (tredjeparter) | ✅ Updated — Vipps placeholder, no Stripe |
| `/billing` (UI notice banner) | ✅ Banner: "Betalingsløsning er ikke aktivert ennå" |

All public-facing payment wording correctly states no payment is active and Vipps is the planned provider.
