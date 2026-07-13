# DriveGarage × Vipps — Betalingsarkitektur

> **Konfidensielt internt dokument.**
> Sist oppdatert: Juli 2026.
> Status: **Vipps Recurring fullt implementert — klar for produksjonskonfigurasjon.**

---

## Implementasjonsstatus

| Seksjon | Komponent | Status |
|---------|-----------|--------|
| §1 Vipps Recurring API | Auth, Agreements, Charges, Webhooks, spec-korrekt | ✅ Komplett |
| §2 DB-skjema | users, subscriptions, subscription_events, payment_exemptions | ✅ Komplett |
| §3 Abonnements-logikk | getEffectiveSubscription, hasPaidAccess, canAccessFeature | ✅ Komplett |
| §4 Webhook-mottak | POST /billing/webhook (Bearer-token auth mot VIPPS_WEBHOOK_SECRET) | ✅ Komplett |
| §5 Billings-middleware | requirePaidAccess, BILLING_ENFORCEMENT_ENABLED | ✅ Komplett |
| §6 Frontend – billing.tsx | Status, upgrade flow, cancellation, account deletion | ✅ Komplett |
| §7 Fair-use | FAIR_USE_LIMITS (10 kjøretøy, 200 kvitteringer, 50 AI/mnd) | ✅ Komplett |
| §8 Kontosletting | POST /account/request-deletion + /cancel-deletion, 14-dag grace | ✅ Komplett |
| §9 Admin-panel | /admin/subscriptions (Vipps), /admin/billing-stats, /admin/mrr-history | ✅ Komplett |
| §10 Stripe-rydding | Alle Stripe SQL-spørringer fjernet fra admin-ruter | ✅ Komplett |

---

## Arkitekturoversikt

### Flyt: Nytt abonnement

```
Bruker klikker "Start abonnement"
  → POST /api/billing/subscription (oppretter Vipps draft agreement)
  → Bruker sendes til Vipps-betalingsside (vippsConfirmationUrl)
  → Bruker bekrefter i Vipps-appen
  → Vipps sender webhook: recurring.agreement-activated.v1
  → POST /api/billing/webhook → upsertSubscription(userId, "active")
  → Bruker har nå full tilgang
```

### Flyt: Månedlig belastning

```
Vipps initierer månedlig charge (dag 1 i perioden)
  → Webhook: recurring.charge-captured.v1
  → upsertSubscription(..., currentPeriodEndsAt = neste periode)
  → Bruker beholder tilgang

  Dersom betaling feiler:
  → Webhook: recurring.charge-failed.v1
  → Retry x5 over 5 dager (retryDays=5 satt i charge-body)
  → Etter endelig feil: recurring.agreement-stopped.v1
  → Status settes til "payment_failed" → deretter "canceled"
```

### Flyt: Kansellering

```
Bruker klikker "Kanseller abonnement" i billing.tsx
  → PATCH /api/billing/subscription/cancel (cancelAtPeriodEnd=true)
  → Vipps agreement stoppes
  → subscriptionStatus = "canceled", cancelAtPeriodEnd = true
  → Tilgang beholdes til currentPeriodEndsAt
  → Etter perioden: status → "expired", tilgang stenges (hvis enforcement=true)
```

### Flyt: Kontosletting

```
Bruker klikker "Be om sletting av konto" i billing.tsx
  → Bekrefter med frasen "slett kontoen min"
  → POST /api/account/request-deletion
  → Aktiv Vipps-agreement stoppes (best-effort)
  → subscriptionStatus = "deletion_requested", deletionRequestedAt = nå
  → Bruker kan angre via POST /api/account/cancel-deletion innen 14 dager
  → Etter 14 dager: data anonymiseres/slettes (cleanup-jobb, planlagt)
```

---

## Konfigurasjonsvariabler

| Variabel | Verdi (prod) | Beskrivelse |
|----------|-------------|-------------|
| `VIPPS_CLIENT_ID` | Fra Vipps Developer Portal | OAuth client ID |
| `VIPPS_CLIENT_SECRET` | Fra Vipps Developer Portal | OAuth client secret |
| `VIPPS_SUBSCRIPTION_KEY` | Fra Vipps Developer Portal | Ocp-Apim-Subscription-Key |
| `VIPPS_MERCHANT_SERIAL_NUMBER` | Fra Vipps Developer Portal | Merchant Serial Number |
| `VIPPS_BASE_URL` | `https://api.vipps.no` | Produksjons-URL (test: `https://apitest.vipps.no`) |
| `VIPPS_WEBHOOK_SECRET` | Egengenerert secret | Brukes for å verifisere webhook-signaturer |
| `BILLING_ENFORCEMENT_ENABLED` | `true` | Aktiver abonnementskontroll (false = alle har tilgang) |

**Viktig:** Sett `BILLING_ENFORCEMENT_ENABLED=false` under testperioden. Sett til `true` kun når Vipps er fullstendig konfigurert og testet i produksjon.

---

## DB-skjema

### `users`-tabellen (relevante felter)

```sql
subscription_plan        text       -- "monthly_100" (eneste plan)
subscription_status      text       -- Se SubscriptionStatus enum nedenfor
vipps_agreement_id       text       -- Vipps agreement ID
current_period_ends_at   timestamptz
canceled_at              timestamptz
expires_at               timestamptz
deletion_requested_at    timestamptz -- Satt når bruker ber om sletting

-- Legacy (beholdt for bakoverkompatibilitet, ingen nye writes):
stripe_customer_id       text
stripe_subscription_id   text
subscription_tier        text  default 'free'
```

### `subscriptions`-tabellen

Primærkilde for abonnementsstatus. Brukes fremfor users-tabellen for nye sjekk.
Users-tabellen mirrors kritiske felter for bakoverkompatibilitet.

### `subscription_events`-tabellen

Immutable logg over alle Vipps webhook-hendelser. Brukes for admin-innsikt og
feilsøking. Alle webhooks lagres med `processingStatus` og evt. `error`.

### `payment_exemptions`-tabellen

Manuelt opprettes av super_admin for interne brukere og testkontoer. Gir
`exempt_internal`-status som alltid passerer tilgangskontroll.

---

## Fair-use-grenser

| Feature | Grense | Kode |
|---------|--------|------|
| Kjøretøy | 10 | `FAIR_USE_LIMIT` |
| Kvitteringer | 200 | `FAIR_USE_LIMIT` |
| AI-forespørsler/mnd | 50 | `FAIR_USE_LIMIT` |
| PDF-eksporter/mnd | 25 | `FAIR_USE_LIMIT` |
| Klubbmedlemskap | 10 | `FAIR_USE_LIMIT` |
| Eide klubber | 2 | `FAIR_USE_LIMIT` |

Grensene er interne og ikke eksponert i markedsføring. De er teknisk verngrense mot
misbruk, ikke differensiator mellom planer (det er kun én plan).

---

## SubscriptionStatus-enum

| Status | Beskrivelse |
|--------|-------------|
| `pending_payment_setup` | Ny bruker, ikke satt opp betaling ennå |
| `active` | Aktivt abonnement |
| `past_due` | Betaling forfalt, men innenfor retry-vindu |
| `payment_failed` | Betaling endelig feilet etter alle retries |
| `canceled` | Kansellert, avventer periodeslutt |
| `expired` | Perioden utløpt, ingen tilgang |
| `exempt_internal` | Intern/test-konto, alltid tilgang |
| `deletion_requested` | Bruker har bedt om sletting (14-dagers grace-periode) |
| `deleted` | Konto slettet/anonymisert |

---

## Vipps API-spesifikasjon — viktige detaljer

### Charge-body (korrekt format)

```json
{
  "amount": 10000,
  "description": "DriveGarage — månedlig abonnement",
  "type": "RECURRING",
  "retryDays": 5
}
```

Merk: `currency` er **ikke** med i charge-body (det settes på agreement-nivå).

### Agreement-body (korrekt format)

```json
{
  "pricing": { "type": "LEGACY", "amount": 10000, "currency": "NOK" },
  "interval": { "unit": "MONTH", "count": 1 },
  "merchantRedirectUrl": "...",
  "merchantAgreementUrl": "...",
  "productName": "DriveGarage"
}
```

Merk: `externalId` er **ikke** med i agreement-body.

### Webhook-autentisering

Vipps sender `Authorization: Bearer <secret>` header. Verifiseres mot
`VIPPS_WEBHOOK_SECRET` i miljøvariablene. Ikke HMAC — ren token-sammenligning
med timing-safe compare.

### Cancelled/Stopped-stavemåte

Vipps API bruker `STOPPED` (ikke `CANCELLED`). DB-enum bruker `canceled` (en l,
uten t, norsk/ISO-stil). Mapping skjer i webhook-handler.

---

## Neste steg (ikke implementert)

- **Cleanup-jobb** — Cron som anonymiserer data for brukere der
  `deletion_requested_at + 14 dager < nå`.
- **Vipps Report API** — For nøyaktige MRR/ARR-tall i admin-panelet. Nå
  estimert som `antall aktive × 100 NOK`.
- **E2E-tester** — Automatiserte tester for webhook-flyt, tilgangskontroll og
  kontosletting.
- **Varslings-e-post** — E-post til bruker ved aktivering, kansellering og
  slettingsforespørsel.
