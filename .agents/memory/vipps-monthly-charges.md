---
name: Vipps monthly charge creation
description: Merchant must create every monthly charge manually — Vipps does NOT auto-create them.
---

# Vipps monthly charge creation

## The rule
Vipps Recurring API does NOT create charges automatically after agreement activation.
DriveGarage must call POST /recurring/v3/agreements/{agreementId}/charges for every month.

## Implementation
`src/lib/billing/monthlyCharges.ts`:
- `runMonthlyBillingJob()` — finds active subs without a charge for current YYYY-MM
- `reconcileCharges()` — syncs stale pending/due charge rows with Vipps GET charge API
- `currentBillingPeriod()` — returns YYYY-MM string

Admin endpoint: `POST /api/admin/billing/run-monthly-charges` (super_admin only)
Params: `{ dryRun?: boolean, limitToUserId?: number }`

## Double-charge prevention
`billing_charges` table has UNIQUE INDEX on `(subscription_id, billing_period)`.
Row is inserted as "pending" BEFORE calling Vipps API. If Vipps call fails, row is
marked "failed" so it can be retried; if Vipps call succeeds, updated to "due".
`onConflictDoNothing()` handles race conditions.

## Charge status flow (from webhooks)
- due → charged: recurring.charge-captured.v1
- due → failed: recurring.charge-failed.v1 (also sets sub to past_due)
- charged → captured only restores sub to "active" if it was "past_due"
- due → cancelled: recurring.charge-canceled.v1

## Due date
dueDate = now + 2 days (Vipps requires ≥ 1 day, 2 days gives margin for midnight edge cases).

**Why:** Vipps Recurring spec explicitly states charges are merchant-initiated. Active
agreement ≠ paid — only a CHARGED charge proves payment occurred.
