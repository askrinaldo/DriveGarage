---
name: Vipps 409 reconciliation pattern
description: When Vipps returns 409 on create-agreement or local DB has a stale/superseded agreementId, use listVippsAgreements("ACTIVE") not the stored ID.
---

## Rule
Never treat the locally stored `vippsAgreementId` as the source of truth for reconciliation.
Always use `listVippsAgreements("ACTIVE")` to find the actual active agreement.

**Why:** Users who attempted the Vipps flow multiple times end up with several agreements:
- Local DB stores the FIRST attempt's ID (now STOPPED)
- Vipps has a LATER agreement as ACTIVE
- Querying the stored ID returns STOPPED → no reconciliation → billing page stuck on pending

## Three reconciliation touch points

1. **`GET /billing/subscription`**: passive reconciliation on every load if status is `pending_payment_setup`. Calls `listVippsAgreements("ACTIVE")`, finds DriveGarage agreement, updates DB.
2. **`POST /billing/vipps/start-agreement`**: catches both `VippsDuplicateAgreementError` AND `VippsApiError(statusCode=409)`. Lists ACTIVE, reconciles, returns `{ status: "active", recovered: true, message: "..." }`.
3. **`GET /billing/vipps/status`**: if stored agreementId is STOPPED/EXPIRED, falls through to list-based reconciliation.

**How to apply:** Always filter by `productName === "DriveGarage"` when selecting from the list to avoid matching unrelated merchant agreements.

## Frontend handling

`handleStartAgreement` in `billing.tsx`:
- Check `result.recovered === true` BEFORE accessing `result.redirectUrl`
- If recovered: call `invalidate()` and return — do NOT redirect
- Normal flow: use `result.redirectUrl`

On mount in `SubscriptionStatusCard`: if `sub.status === "pending_payment_setup"`, call `invalidate()` once (guarded by a ref) to force a fresh `GET /billing/subscription` which reconciles automatically.

## Error propagation
`VippsApiError(409)` is thrown by `vippsRequest` via `parseVippsErrorResponse`. Express 5 default error handler uses `err.statusCode` — so this reaches the frontend as HTTP 409 if not caught. Always catch `VippsApiError` with `statusCode === 409` alongside `VippsDuplicateAgreementError`.
