---
name: Vipps webhook field aliases
description: Vipps test environment sends different field names than production spec; parser must accept both. Also: prod DB is separate from dev DB.
---

## Rule
`parseVippsWebhookEvent` must accept both field name variants:
- `occurred` OR `timestamp` for the event timestamp
- `agreementId` OR `reference` as the agreement identifier

The Vipps test environment sends `{ agreementId, agreementUUID, eventType, occurred, msn }`.
The spec documents `{ reference, timestamp, eventType, ... }`.

**Why:** Production logs showed every webhook rejected with "Malformed webhook payload — missing fields. Got: agreementId, agreementUUID, eventType, occurred, msn" — blocking all subscription activations.

**How to apply:** In `parseVippsWebhookEvent` (webhooks.ts):
```typescript
const reference  = (b.reference ?? b.agreementId) as string | undefined;
const timestamp  = (b.timestamp ?? b.occurred) as string | undefined;
const agreementId = (b.agreementId ?? b.reference) as string | undefined;
```

## Reconciliation pattern
Webhooks can fail even after HMAC is correct (parse errors, network, timing).
Always implement a reconciliation path in `GET /billing/vipps/status`:
- Accept optional `?agreementId=` query param from the Vipps redirect URL
- If Vipps returns ACTIVE but local subscription is not active → call `getOrCreateSubscriptionRow` + `updateSubscriptionStatus` to active immediately
- Frontend polls this endpoint for up to 30s after returning from Vipps redirect

## Prod vs Dev DB
Replit production deployment uses a **separate database** from development.
- Dev `executeSql` / Drizzle queries hit the dev DB (may be empty)
- Production server writes to the production DB
- Use `fetch_deployment_logs` to see what the production server actually did
- Users created in production (e.g. userId=16) do not appear in the dev DB
