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

Two parallel auth systems currently coexist:

### System A — User Auth (Clerk + legacy JWT)
Used for all private user data (vehicles, service records, stats, profile, billing, admin).

```
Request
  └─► clerkMiddleware (from @clerk/express)  → populates req.auth (Clerk session)
  └─► parseUserAuth                          → reads x-user-token header (legacy admin JWT)
  └─► clerkUserAuth                          → Clerk → DB lookup + JIT provisioning
                                               → sets req.userAuth: UserTokenPayload
                                               {userId, email, name, role, tenantId, ...}

Route guards:
  requireUser        — any authenticated user
  requireSuperAdmin  — role = super_admin only
```

### System B — Club Auth (custom JWT)
Used for club-scoped operations (forum, garage, events, marketplace, badges).

```
Request
  └─► parseAuth (middleware/auth.ts)  → reads Authorization: Bearer <club-token>
                                        → sets req.auth: {memberName, clubId, role}

Route guards:
  requireClubRole("member" | "admin" | "owner")
```

> **⚠ Risk:** The two systems are entirely separate. A user can have System A identity
> but no System B token, and vice versa. Club creation/join now requires System A to
> set memberName from req.userAuth — but the club JWT is still issued separately.
> **Phase 6 goal:** unify so club roles are derived from System A (Clerk userId).

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

### Phase 3 — Extract service layer
**Goal:** Routes become thin HTTP adapters. Business logic moves to `services/`.

Steps:
1. Create `services/vehicles.service.ts` — move DB query logic from vehicles.ts
2. Create `services/serviceRecords.service.ts`
3. Create `services/stats.service.ts`
4. Continue for all domains
5. Routes import from services, no direct DB access in route handlers

**Test:** Each service must be testable in isolation (no Express req/res). Add basic Vitest tests.

---

### Phase 4 — Validation and error normalization
**Goal:** Consistent, safe API surface.

Steps:
1. Audit all routes — every route must use Zod schema validation on params + body
2. Add `createApiError(code, message, status)` helper for consistent error shape
3. Replace raw `res.status(400).json({ error: ... })` with the helper everywhere
4. Ensure no DB error messages reach the client in production (global error handler already added)
5. Add Vitest + Supertest test suite with at least one test per domain

---

### Phase 5 — Frontend feature folders
**Goal:** Scale frontend without `pages/` becoming unmaintainable.

Steps:
1. Create `features/vehicles/`, `features/clubs/`, `features/user/`, `features/admin/`
2. Move page files into their feature folders (pure file moves + import path updates)
3. Move feature-specific hooks into feature folders
4. Update `App.tsx` to import from feature routers
5. Keep `components/ui/` untouched

**Test:** `pnpm --filter @workspace/vintage-garage run typecheck` must pass. Visual regression: all routes must render correctly.

---

### Phase 6 — Clubs module redesign
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
| Club JWT auth (`middleware/auth.ts`) | Wait for Phase 6 redesign |
| Generated files in `lib/api-client-react/` and `lib/api-zod/` | Always regenerate via codegen, never edit manually |
| `components/ui/` shadcn primitives | Generated by shadcn CLI — do not modify |
| `lib/api-spec/openapi.yaml` | Only change when adding/changing API endpoints |
| Pre-existing TS errors in `club-event-detail.tsx`, `service-form.tsx`, `receipt-form.tsx`, `vehicle-detail.tsx`, `trip-form.tsx`, `tenant-new.tsx` | Pre-existing, out of scope |

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
| `STRIPE_SECRET_KEY` | optional* | `lib/stripeClient.ts` | Server-side only — *required when billing re-enabled |
| `STRIPE_WEBHOOK_SECRET` | optional* | `webhookHandlers.ts` | *required when billing re-enabled |
| `REPLIT_DOMAINS` | optional | `app.ts` CORS | Comma-separated. In production, restricts CORS origins |
