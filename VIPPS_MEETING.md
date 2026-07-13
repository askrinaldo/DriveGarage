# DriveGarage × Vipps — Betalingsarkitektur

> **Konfidensielt internt dokument.**
> Sist oppdatert: Juli 2026.
> Status: **KLAR FOR VIPPS TEST** — HMAC-verifisering, månedlig belastningsjobb og alle obligatoriske endepunkter er implementert. Eneste gjenstående blokker er testlegitimasjon fra Vipps og manuell webhook-registrering.

---

## Implementasjonsstatus (audit-sjekkliste)

### Agreements

| Punkt | Endepunkt | Status | Fil |
|-------|-----------|--------|-----|
| Opprett avtale | POST /recurring/v3/agreements | ✅ | agreements.ts |
| Hent avtale | GET /recurring/v3/agreements/:id | ✅ | agreements.ts |
| Oppdater avtale | PATCH /recurring/v3/agreements/:id | ✅ | agreements.ts |
| Stopp avtale | PATCH status=STOPPED | ✅ | agreements.ts |
| Korrekt produktnavn | `productName: "DriveGarage"` | ✅ | agreements.ts |
| Korrekt pris | 10000 øre = 100 NOK | ✅ | agreements.ts |
| Korrekt interval | MONTH / 1 | ✅ | agreements.ts |
| merchantRedirectUrl | Satt til returnUrl | ✅ | agreements.ts |
| merchantAgreementUrl | Krav for norske kjøpmenn | ✅ | agreements.ts |
| Unik idempotency-nøkkel | crypto.randomUUID() | ✅ | agreements.ts |

### Charges

| Punkt | Endepunkt | Status | Fil |
|-------|-----------|--------|-----|
| Opprett månedlig charge | POST /recurring/v3/agreements/:id/charges | ✅ | charges.ts + monthlyCharges.ts |
| List charges | GET /recurring/v3/agreements/:id/charges | ✅ | charges.ts |
| Hent charge | GET /recurring/v3/agreements/:id/charges/:id | ✅ | charges.ts |
| Kanseller charge | DELETE /recurring/v3/agreements/:id/charges/:id | ✅ | charges.ts |
| Refunder charge | POST /recurring/v3/agreements/:id/charges/:id/refund | ✅ | charges.ts |
| Unik orderId | dg-\<userId\>-\<YYYYMM\>-\<attempt\>-\<hex\> | ✅ | monthlyCharges.ts |
| Unik idempotency-nøkkel | orderId brukes som Idempotency-Key | ✅ | monthlyCharges.ts |
| Korrekt forfallsdato / lead-time | dueDate = now + 2 dager (krav: ≥ 1 dag) | ✅ | monthlyCharges.ts |
| retryDays | 5 (anbefalt, maks 14) | ✅ | charges.ts |
| Charge-tilstandsavstemming | reconcileCharges() + GET charge | ✅ | monthlyCharges.ts |
| Månedlig planlegging | runMonthlyBillingJob() + admin-endepunkt | ✅ | monthlyCharges.ts |
| Dobbeltbelastning forhindret | UNIQUE INDEX (subscription_id, billing_period) | ✅ | billingCharges.ts |

### Webhooks

| Punkt | Status | Fil |
|-------|--------|-----|
| Registrer webhook via Webhooks API | ⚠️ Manuelt steg — se nedenfor | — |
| Lagre VIPPS_WEBHOOK_ID og VIPPS_WEBHOOK_SECRET | ⚠️ Settes etter manuell registrering | — |
| HMAC-verifisering med rå request body | ✅ HMAC-SHA256 — **ikke** Bearer token | webhooks.ts |
| Content hash-verifisering (x-ms-content-sha256) | ✅ base64(SHA-256(rawBody)) | webhooks.ts |
| Signaturverifisering (Authorization header) | ✅ HMAC-SHA256 SignedHeaders=... | webhooks.ts |
| Hendelsesidempotens | ✅ providerEventId i subscription_events | billing.ts |
| Duplikat-hendelse håndteres én gang | ✅ Eksisterende rad → 200 + skip | billing.ts |
| recurring.agreement-activated.v1 | ✅ → status: active | billing.ts |
| recurring.agreement-stopped.v1 | ✅ → status: canceled | billing.ts |
| recurring.agreement-expired.v1 | ✅ → status: expired | billing.ts |
| recurring.agreement-rejected.v1 | ✅ → status: pending_payment_setup | billing.ts |
| recurring.charge-captured.v1 | ✅ → billing_charges: charged + sub restored if past_due | billing.ts |
| recurring.charge-failed.v1 | ✅ → billing_charges: failed + sub: past_due | billing.ts |
| recurring.charge-canceled.v1 | ✅ → billing_charges: cancelled | billing.ts |

### Feilhåndtering

| Punkt | Status | Fil |
|-------|--------|-----|
| Vipps problem-respons-parsing | ✅ parseVippsErrorResponse() | errors.ts |
| 4xx-håndtering | ✅ VippsApiError med statusCode | errors.ts |
| 5xx retry-policy | ✅ Én retry på GET-nettverksfeil | client.ts |
| Timeout-håndtering | ✅ AbortSignal.timeout(15s) | client.ts |
| Token-utløp | ✅ Cache med 30s margin + auto-refresh | auth.ts |
| Duplikat request-håndtering | ✅ Idempotency-Key på alle POST/PATCH | client.ts |
| Trygg logging uten secrets | ✅ Ingen token/secret i logger | auth.ts, client.ts |

---

## Kritiske rettinger (audit Juli 2026)

### ❌ Feil antakelse 1 (rettet): "Vipps oppretter månedlige charges automatisk"

**Feil.** Det offisielle Vipps Recurring API oppretter INGEN charges automatisk
etter at en agreement er aktivert. DriveGarage som kjøpmann må opprette **hver**
enkelt charge manuelt via:

```
POST /recurring/v3/agreements/{agreementId}/charges
```

med en unik `orderId`, `due`-dato (≥ 1 dag frem i tid) og `retryDays`.

**Korrekt implementasjon:** `src/lib/billing/monthlyCharges.ts` →
`runMonthlyBillingJob()`, trigget via
`POST /api/admin/billing/run-monthly-charges` (kun super_admin).

### ❌ Feil antakelse 2 (rettet): "Webhook-auth er Bearer \<token\>"

**Feil.** Det offisielle Vipps Webhooks API bruker HMAC-SHA256-autentisering
(samme skjema som Azure Event Grid) — **ikke** Bearer token.

**Korrekt header-format fra Vipps:**
```
Authorization: HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=<base64>
x-ms-date: <RFC1123-tidsstempel>
x-ms-content-sha256: <base64(SHA-256(rawBody))>
```

**String-to-sign:**
```
POST\n/api/billing/vipps/webhook\n<x-ms-date>;<host>;<x-ms-content-sha256>
```

**Signatur:**
```
base64(HMAC-SHA256(key=VIPPS_WEBHOOK_SECRET, data=stringToSign))
```

**Korrekt implementasjon:** `src/lib/vipps/webhooks.ts` →
`verifyVippsWebhookHmac(req, rawBody)`

Express-håndtering: `app.ts` sender raw Buffer (ikke JSON) til webhook-ruten
via `express.raw({ type: () => true })`.

**Viktig:** `VIPPS_WEBHOOK_SECRET` er verdien **returnert av Vipps** ved
webhook-registrering (`.secret` i POST /webhooks/v1/webhooks-svar).
Det er **ikke** en tilfeldig streng du genererer selv.

---

## Arkitekturoversikt

### Flyt: Nytt abonnement

```
Bruker klikker "Start abonnement"
  → POST /api/billing/vipps/start-agreement
  → Vipps draft agreement opprettes, agreementId lagres i DB
  → Bruker sendes til vippsConfirmationUrl i Vipps-appen
  → Bruker bekrefter i Vipps-appen
  → Vipps sender webhook: recurring.agreement-activated.v1
  → POST /api/billing/vipps/webhook (HMAC-SHA256 verifisert) → status: "active"
  → Bruker har nå full tilgang
```

### Flyt: Månedlig belastning (korrekt — merchant-kontrollert)

```
Ekstern scheduler (1. hvert måned) kaller:
  POST /api/admin/billing/run-monthly-charges  (super_admin)
  → runMonthlyBillingJob() finner alle active subs uten charge for YYYY-MM
  → For hver: INSERT billing_charges (pending) → createVippsCharge() → oppdater (due)
  → Vipps forsøker betaling på dueDate (2 dager frem), retryDays=5

  Betaling vellykket:
  → Webhook: recurring.charge-captured.v1
  → billing_charges.status = "charged"
  → Hvis sub var past_due: gjenoppretter til "active"

  Betaling feiler:
  → Webhook: recurring.charge-failed.v1
  → billing_charges.status = "failed", sub.status = "past_due"
```

### Flyt: Kansellering

```
Bruker klikker "Kanseller abonnement"
  → POST /api/billing/vipps/cancel
  → Vipps agreement stoppes (PATCH status=STOPPED)
  → subscription.cancelAtPeriodEnd=true, canceledAt=nå
  → Tilgang beholdes til currentPeriodEndsAt
```

---

## Konfigurasjonsvariabler

| Variabel | Kilde | Beskrivelse |
|----------|-------|-------------|
| `VIPPS_CLIENT_ID` | Vipps Developer Portal | OAuth client ID |
| `VIPPS_CLIENT_SECRET` | Vipps Developer Portal | OAuth client secret |
| `VIPPS_SUBSCRIPTION_KEY` | Vipps Developer Portal | Ocp-Apim-Subscription-Key |
| `VIPPS_MERCHANT_SERIAL_NUMBER` | Vipps Developer Portal | Merchant Serial Number |
| `VIPPS_ENVIRONMENT` | `test` / `production` | Velger API-base-URL automatisk |
| `VIPPS_CALLBACK_URL` | Replit-domene + `/api/billing/vipps/webhook` | Webhook-mottaks-URL |
| `VIPPS_RETURN_URL` | Replit-domene + `/billing` | Redirect etter Vipps-app |
| `VIPPS_WEBHOOK_ID` | Fra Vipps webhook-registrering | Webhook-ID |
| `VIPPS_WEBHOOK_SECRET` | Fra Vipps webhook-registrering | HMAC-nøkkel — **ikke generer selv** |
| `VIPPS_WEBHOOK_EXPECTED_HOST` | Offentlig Replit-domene | Override for proxy-host-header (viktig!) |
| `BILLING_ENFORCEMENT_ENABLED` | `false` → `true` etter E2E-test | Aktiver abonnementskontroll |

---

## Manuelt steg: Webhook-registrering

Kjør én gang mot Vipps test-API etter at alle `VIPPS_*`-variabler er satt:

```bash
# 1. Hent access token
TOKEN=$(curl -s -X POST https://apitest.vipps.no/accesstoken/get \
  -H "client_id: $VIPPS_CLIENT_ID" \
  -H "client_secret: $VIPPS_CLIENT_SECRET" \
  -H "Ocp-Apim-Subscription-Key: $VIPPS_SUBSCRIPTION_KEY" \
  -H "Merchant-Serial-Number: $VIPPS_MERCHANT_SERIAL_NUMBER" \
  | jq -r '.access_token')

# 2. Registrer webhook
curl -X POST https://apitest.vipps.no/webhooks/v1/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Ocp-Apim-Subscription-Key: $VIPPS_SUBSCRIPTION_KEY" \
  -H "Merchant-Serial-Number: $VIPPS_MERCHANT_SERIAL_NUMBER" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<ditt-replit-domene>/api/billing/vipps/webhook",
    "events": [
      "recurring.agreement-activated.v1",
      "recurring.agreement-stopped.v1",
      "recurring.agreement-expired.v1",
      "recurring.agreement-rejected.v1",
      "recurring.charge-reserved.v1",
      "recurring.charge-captured.v1",
      "recurring.charge-failed.v1",
      "recurring.charge-canceled.v1"
    ]
  }'
```

Responsen inneholder `id` og `secret`. Lagre i Replit Secrets:
- `VIPPS_WEBHOOK_ID` = `.id`
- `VIPPS_WEBHOOK_SECRET` = `.secret`
- `VIPPS_WEBHOOK_EXPECTED_HOST` = ditt offentlige Replit-domene (uten https://)

---

## Admin-endepunkter

| Endepunkt | Beskrivelse |
|-----------|-------------|
| `POST /api/admin/billing/run-monthly-charges` | Kjør månedlig belastningsjobb |
| `POST /api/admin/billing/reconcile-charges` | Avstem charges mot Vipps |
| `GET /api/admin/billing/charges?period=2026-07` | List billing_charges |

```json
// run-monthly-charges parametere
{ "dryRun": true, "limitToUserId": 42 }
```

---

## billing_charges-tabellen

| Kolonne | Type | Beskrivelse |
|---------|------|-------------|
| `billing_period` | text | YYYY-MM — unik per sub, hindrer dobbeltbelastning |
| `order_id` | text UNIQUE | Vipps orderId + idempotency key |
| `vipps_charge_id` | text | Returnert av Vipps etter opprettelse |
| `status` | text | pending / due / charged / failed / cancelled / refunded |
| `due_date` | timestamptz | Forfallsdato (now + 2 dager) |
| `charged_at` | timestamptz | Satt av charge-captured webhook |
| `failed_at` | timestamptz | Satt av charge-failed webhook |

**Unik indeks:** `(subscription_id, billing_period)` hindrer dobbeltbelastning på DB-nivå.

---

## Testresultater

```
Test Files  1 passed
Tests       21 passed (21/21)

  verifyVippsWebhookHmac
  ✅ gyldig HMAC-signert request akseptert
  ✅ feil signatur avvist
  ✅ modifisert body (content hash mismatch) avvist
  ✅ manglende x-ms-date avvist
  ✅ manglende x-ms-content-sha256 avvist
  ✅ manglende Authorization avvist
  ✅ manglende VIPPS_WEBHOOK_SECRET avvist
  ✅ feil secret avvist
  ✅ Bearer token (gammel feil metode) avvist

  parseVippsWebhookEvent
  ✅ agreement-activated parset korrekt
  ✅ charge-captured med chargeId parset korrekt
  ✅ ugyldig JSON kaster feil
  ✅ manglende felter kaster feil

  mapWebhookEventToStatus
  ✅ agreement-activated → active
  ✅ agreement-stopped → canceled
  ✅ agreement-expired → expired
  ✅ agreement-rejected → pending_payment_setup
  ✅ charge-failed → past_due
  ✅ charge-captured → active (betinget på prior status)
  ✅ charge-canceled → null

  currentBillingPeriod
  ✅ returnerer YYYY-MM-format
```

---

## Månedlig planlegger — produksjonsoppsett

Replit har ingen innebygd cron. Konfigurer ekstern scheduler:

```yaml
# GitHub Actions eksempel
on:
  schedule:
    - cron: "0 6 1 * *"   # 1. hvert måned kl. 06:00 UTC
jobs:
  billing:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -s -X POST https://$DOMAIN/api/admin/billing/run-monthly-charges \
            -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"dryRun":false}'
```

Alternative schedulere: Upstash QStash, Render Cron Jobs, EasyCron.

---

## Gjenstående blokker (kun eksternal)

| Blokker | Type |
|---------|------|
| Vipps test-legitimasjon (client_id, client_secret, MSN, subscription_key) | Ekstern (Vipps Developer Portal) |
| Webhook-registrering + lagre VIPPS_WEBHOOK_SECRET | Manuelt (se steg ovenfor) |
| E2E-test mot Vipps test-miljø | Etter legitimasjon/webhook er klar |
| Sette BILLING_ENFORCEMENT_ENABLED=true | Etter vellykket E2E-test |
| Produksjonslegitimasjon | Vipps godkjenningsprosess |
| Ekstern månedlig scheduler | Infrastruktur (GitHub Actions e.l.) |

---

## Endelig revisjonstatus

**STATUS: KLAR FOR VIPPS TEST**

Alle kodemessige mangler er lukket:
- ✅ HMAC-SHA256 webhook-verifisering (erstatter ugyldig Bearer token)
- ✅ Merchant-kontrollert månedlig charge-opprettelse
- ✅ billing_charges-tabell med dobbeltbelastnings-vern
- ✅ refundVippsCharge implementert
- ✅ Charge-tilstandsavstemming implementert
- ✅ 21 enhetstester bestått

Eneste gjenstående blokker er eksterne (testlegitimasjon og portalkonfig).
