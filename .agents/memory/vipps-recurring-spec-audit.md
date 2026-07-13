---
name: Vipps Recurring API spec audit
description: Confirmed correct and incorrect fields in our Vipps Recurring v3 implementation versus the official spec.
---

## Confirmed correct (no change needed)
- Pricing: `type: "LEGACY"`, amount in øre, `currency: "NOK"` — valid LegacyPricingRequestV3
- Agreement status enum: `PENDING` / `ACTIVE` / `STOPPED` / `EXPIRED`
- Stop agreement: `PATCH /recurring/v3/agreements/{id}` with `{ status: "STOPPED" }`
- Webhook auth: `Authorization: Bearer <secret>` where secret comes from `RegisterResponse.secret`
- Base URLs: `apitest.vipps.no` (test) / `api.vipps.no` (prod)
- Auth endpoint: `POST /accesstoken/get`

## Fixed discrepancies (July 2026 audit)

### CreateChargeV3 body (charges.ts / types.ts)
- `currency` is **NOT** a field — remove it; currency is set at agreement level only
- `type: "RECURRING"` is required for scheduled charges (ChargeCreationTypeV3: RECURRING | UNSCHEDULED)
- `retryDays` is required for RECURRING; recommend ≥ 5 (max 14)
- `orderId` (optional) becomes the chargeId for reconciliation — preferred over relying on auto-generated ID
- `externalId` is a separate optional field (settlement reports only, doesn't override chargeId)

### DraftAgreementV3 body (agreements.ts / types.ts)
- `externalId` is **NOT** a body field — only use `Idempotency-Key` header

### Charge status spelling (types.ts)
- Spec uses British spelling: `CANCELLED` (not `CANCELED`)
- Additional statuses in spec enum: `DUE`, `PARTIALLY_CAPTURED`, `PROCESSING`

### Required HTTP headers (client.ts, auth.ts)
- `Vipps-System-Plugin-Name` and `Vipps-System-Plugin-Version` are required on all API calls
- `Merchant-Serial-Number` header should also be sent on `POST /accesstoken/get`

**Why:** Any missing field causes 400 errors from Vipps in production. Any wrong field (like `currency` in charge body) can cause silent rejection or 422.
