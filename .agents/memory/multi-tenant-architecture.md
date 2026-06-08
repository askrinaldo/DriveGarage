---
name: Multi-tenant architecture
description: How the Vintage Garage multi-tenancy system works — tables, JWT, vehicle filtering, migration pattern.
---

## Tables
- `tenants` — `id`, `name`, `slug`, `isPersonal`, `ownerUserId`
- `tenant_memberships` — `tenantId`, `userId`, `role` (owner/admin/member)
- `tenant_invitations` — `tenantId`, `email`, `code`, `role`, `expiresAt`, `acceptedAt`
- `vehicles.tenantId` — nullable FK to tenants (was nullable for backfill; all rows now populated)

## JWT payload fields added
`tenantId`, `tenantName`, `tenantRole`, `isPersonalTenant` — signed by `signUserToken` in `middleware/userAuth.ts`.

## Personal tenant pattern
Each user gets a personal tenant auto-created on register/login (`slug: personal-{userId}`). Org tenants use `isPersonal: false`.

## Vehicle filtering
`GET /api/vehicles` filters by `req.userAuth.tenantId`. All other per-vehicle routes still verify `vehicle.userId === userId` as well.

## Backfill approach
Do NOT rely on the `scripts/migrate-to-tenants.ts` script — it fails because `drizzle-orm` is not installed in `scripts/`. Instead run raw SQL:
```sql
INSERT INTO tenants (name, slug, is_personal, owner_user_id, created_at, updated_at)
SELECT u.name || '''s Garasje', 'personal-' || u.id, true, u.id, NOW(), NOW()
FROM users u WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.slug = 'personal-' || u.id::text);
-- then insert memberships + UPDATE vehicles SET tenant_id
```

**Why:** Scripts package does not have `drizzle-orm` as a direct dep; workspace resolution fails at runtime because `drizzle-orm` is a transitive dep inside `lib/db`.

## Frontend
- `use-user-auth.ts` — session now stores tenantId/tenantName/tenantRole/isPersonalTenant; `switchTenant()` calls `POST /api/auth/switch-tenant`
- `layout.tsx` — sidebar has tenant switcher dropdown (calls `GET /api/tenants/mine`)
- Pages: `/org/settings` (TenantSettings), `/tenant-new` (TenantNew), `/tenant-invite/:code` (TenantInvite)
