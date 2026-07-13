# DriveGarage — Vipps Recurring Sandbox Test Setup Guide

> **Formål:** Steg-for-steg guide for å konfigurere Vipps testmiljø og gjennomføre første
> ende-til-ende test av Vipps Recurring-integrasjonen.
>
> **Forutsetning:** Koden er ferdig implementert og verifisert (se `VIPPS_MEETING.md`).
> Kun eksternt oppsett i Vipps Portal og Replit Secrets gjenstår.

---

## 1. Nåværende implementasjonsstatus

| Komponent | Status |
|---|---|
| Agreement-opprettelse (POST /recurring/v3/agreements) | ✅ Implementert |
| Agreement-polling (GET /recurring/v3/agreements/{id}) | ✅ Implementert |
| Kansellering (PATCH /recurring/v3/agreements/{id}) | ✅ Implementert |
| Månedlig charge-opprettelse (manuelt, ikke automatisk) | ✅ Implementert |
| Charge-henting og listing | ✅ Implementert |
| Charge-kansellering og refundering | ✅ Implementert |
| Webhook HMAC-SHA256-verifisering | ✅ Implementert |
| Replay-beskyttelse (5-minutters tidsstempel-toleranse) | ✅ Implementert |
| Webhook-idempotens (DB-deduplicering) | ✅ Implementert |
| Billing enforcement-middleware | ✅ Implementert (av som standard) |
| Testdekning (24 tester) | ✅ Alle bestått |
| Typecheck | ✅ Ren |

**Blokkert av ekstern konfigurasjon (dette dokumentet løser alle):**

- Vipps testapp-kredentialer ikke opprettet
- Webhook ikke registrert → VIPPS_WEBHOOK_SECRET ikke tilgjengelig
- Public URL-er ikke konfigurert i Replit Secrets

---

## 2. Hvilke Vipps-kredentialer vi trenger

| Secret-navn | Beskrivelse | Kilde |
|---|---|---|
| `VIPPS_CLIENT_ID` | OAuth 2.0 klient-ID for testappen | Vipps Developer Portal → testapp |
| `VIPPS_CLIENT_SECRET` | OAuth 2.0 klient-hemmelighet | Vipps Developer Portal → testapp |
| `VIPPS_SUBSCRIPTION_KEY` | API-abonnementsnøkkel | Vipps Developer Portal → produkt |
| `VIPPS_MERCHANT_SERIAL_NUMBER` | Unikt selgernummer (MSN) | Vipps Developer Portal → salgssted |
| `VIPPS_WEBHOOK_SECRET` | Returnert av Vipps ved webhook-registrering | Steg 5 nedenfor |

**Konfigurerte (ikke secrets i Vipps-portalen):**

| Secret-navn | Verdi for test | Forklaring |
|---|---|---|
| `VIPPS_ENVIRONMENT` | `test` | Bytter base-URL til `https://apitest.vipps.no` |
| `VIPPS_RETURN_URL` | `https://<ditt-replit-domene>/billing` | Redirect etter Vipps-godkjenning |
| `VIPPS_CALLBACK_URL` | `https://<ditt-replit-domene>/api/billing/vipps/webhook` | Webhook-mottak-URL |
| `VIPPS_WEBHOOK_EXPECTED_HOST` | `<ditt-replit-domene>` (uten https://) | Host-header for HMAC-verifisering |
| `BILLING_ENFORCEMENT_ENABLED` | `false` (under testing) | Settes til `true` kun etter vellykket E2E-test |

---

## 3. Hvor du finner hver kredential i Vipps Portal

### 3.1 Logg inn på Vipps Developer Portal

URL: **https://portal.vipps.no**

Bruk din Vipps-forretningskonto. Velg **Testmiljø** øverst til høyre etter innlogging.

---

### 3.2 Opprett en testselger (Merchant)

1. Gå til **Salgssted** → **Legg til salgssted**
2. Velg **Teststeder** (ikke produksjon)
3. Fyll inn et testnavn, f.eks. `DriveGarage Test`
4. Noter **MSN (Merchant Serial Number)** — dette er `VIPPS_MERCHANT_SERIAL_NUMBER`

---

### 3.3 Opprett en testapp og hent OAuth-kredentialer

1. Gå til **Utvikler** → **API-nøkler**
2. Finn din testapp (eller opprett en ny for Recurring-produktet)
3. Under appen finner du:
   - **Client ID** → `VIPPS_CLIENT_ID`
   - **Client Secret** (klikk **Vis**) → `VIPPS_CLIENT_SECRET`

> **Merk:** Klient-hemmeligheten vises kun én gang. Kopier og lagre den umiddelbart.

---

### 3.4 Hent API-abonnementsnøkkel

1. Gå til **Utvikler** → **API-produkter**
2. Finn produktet **Recurring Payments** (eller **Avtale- og avtalegiro**)
3. Klikk **Abonner** hvis ikke allerede abonnert
4. Under abonnementet finner du:
   - **Primary key** → `VIPPS_SUBSCRIPTION_KEY`

> Bruk **Primary key**. Secondary key kan brukes som backup.

---

## 4. Replit Secrets som skal opprettes

Gå til **Replit → Secrets** (hengelåsikonet i venstre sidefelt).

Opprett følgende secrets én for én:

```
VIPPS_CLIENT_ID          = <fra Vipps Portal steg 3.3>
VIPPS_CLIENT_SECRET      = <fra Vipps Portal steg 3.3>
VIPPS_SUBSCRIPTION_KEY   = <fra Vipps Portal steg 3.4>
VIPPS_MERCHANT_SERIAL_NUMBER = <fra Vipps Portal steg 3.2>
VIPPS_ENVIRONMENT        = test
VIPPS_RETURN_URL         = https://<ditt-replit-domene>/billing
VIPPS_CALLBACK_URL       = https://<ditt-replit-domene>/api/billing/vipps/webhook
VIPPS_WEBHOOK_EXPECTED_HOST = <ditt-replit-domene>
BILLING_ENFORCEMENT_ENABLED = false
```

**Finn ditt Replit-domene:**
- Åpne prosjektet → Klikk på "Open in new tab" i preview-panelet
- URL-en er ditt domene: `https://xxxx.replit.app` eller tilsvarende
- Fjern `https://` — bruk kun domenet i `VIPPS_WEBHOOK_EXPECTED_HOST`

> `VIPPS_WEBHOOK_SECRET` legges til **etter** steg 5 (webhook-registrering).

---

## 5. Konfigurer webhook

Webhook-hemmeligheten (`VIPPS_WEBHOOK_SECRET`) returneres av Vipps når du registrerer
webhook-endepunktet. Du kan gjøre dette via:

### Alternativ A — cURL (anbefalt for test)

Hent først et access token:
```bash
curl -X POST https://apitest.vipps.no/accesstoken/get \
  -H "client_id: <VIPPS_CLIENT_ID>" \
  -H "client_secret: <VIPPS_CLIENT_SECRET>" \
  -H "Ocp-Apim-Subscription-Key: <VIPPS_SUBSCRIPTION_KEY>" \
  -H "Merchant-Serial-Number: <VIPPS_MERCHANT_SERIAL_NUMBER>"
```

Bruk `access_token` fra svaret:
```bash
curl -X POST https://apitest.vipps.no/webhooks/v1/webhooks \
  -H "Authorization: Bearer <access_token>" \
  -H "Ocp-Apim-Subscription-Key: <VIPPS_SUBSCRIPTION_KEY>" \
  -H "Merchant-Serial-Number: <VIPPS_MERCHANT_SERIAL_NUMBER>" \
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

**Svar fra Vipps:**
```json
{
  "id": "wh-xxxx",
  "url": "https://<ditt-replit-domene>/api/billing/vipps/webhook",
  "secret": "abc123xyz789..."
}
```

Verdien i `"secret"` → lagre som `VIPPS_WEBHOOK_SECRET` i Replit Secrets.

### Alternativ B — Vipps Portal

Gå til **Utvikler → Webhooks** og registrer endepunktet manuelt med alle `recurring.*`-events.

---

## 6. Konfigurer callback og return URLs

### Return URL (`VIPPS_RETURN_URL`)

Brukeren sendes hit etter godkjenning eller avvisning i Vipps-appen.

```
https://<ditt-replit-domene>/billing
```

Vipps legger automatisk til query-parametre:
- `?agreementId=agr-xxx` ved godkjenning
- `?error=rejected` ved avvisning

DriveGarage-frontend håndterer dette på `/billing`-siden ved å kalle
`GET /api/billing/vipps/status` for å hente avtalestatusen.

### Merchant Agreement URL (`merchantAgreementUrl`)

Brukes av Vipps til "Behandle abonnement"-lenken i Vipps-appen.
I DriveGarage er denne satt lik `VIPPS_RETURN_URL`. Dette er akseptabelt
for test og MVP. I produksjon kan det peke til en dedikert `/account/subscription`-side.

### Webhook URL (`VIPPS_CALLBACK_URL`)

Vipps kaller dette endepunktet ved alle subscription-events:
```
https://<ditt-replit-domene>/api/billing/vipps/webhook
```

**Krav:**
- Må være HTTPS og offentlig tilgjengelig
- Replit-apper er HTTPS som standard — ingen tunnel nødvendig
- Svartid < 10 sekunder (implementasjonen svarer umiddelbart med 200)

---

## 7. Steg-for-steg første E2E-sandkasse-test

### Forberedelse

1. Fullfør steg 3–6 (alle secrets er satt i Replit)
2. Restart API-serveren i Replit (stopp og start workflow)
3. Verifiser at serveren starter uten feil i loggene

### Test 1 — Agreement-opprettelse

1. Logg inn på DriveGarage med en testbruker
2. Gå til **Abonnement** (`/billing`)
3. Klikk **Aktiver abonnement** → DriveGarage oppretter en draft-avtale via Vipps API
4. Du blir videresendt til `https://apitest.vipps.no/...` (Vipps testside)

### Test 2 — Godkjenn i Vipps testklient

**Vipps tilbyr testtelefonnumre for sandkassen:**
- Last ned **Vipps-testappen** (egen app for testmiljøet) — se Vipps Developer Portal
- Alternativt: bruk Vipps Portal → **Test** for å simulere brukerhandlinger

Godkjenn abonnementet i testappen.

### Test 3 — Verifiser agreement-aktivering

Etter godkjenning:

1. Du blir videresendt til `https://<ditt-replit-domene>/billing?agreementId=agr-xxx`
2. Sjekk at siden viser "Abonnement aktivt"
3. Sjekk API-serverloggene for:
   ```
   Vipps webhook received  eventType=recurring.agreement-activated.v1
   Agreement activated — subscription active
   ```
4. Verifiser i DB:
   ```sql
   SELECT status, vipps_agreement_id FROM subscriptions WHERE user_id = <din_test_user_id>;
   -- Forventet: status = 'active', vipps_agreement_id = 'agr-xxx'
   ```

### Test 4 — Opprett første månedlige charge manuelt

```bash
curl -X POST https://<ditt-replit-domene>/api/admin/billing/run-monthly-charges \
  -H "x-user-token: <admin_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"limitToUserId": <test_user_id>}'
```

Forventet svar:
```json
{
  "ok": true,
  "result": {
    "billingPeriod": "2026-07",
    "created": 1,
    "skipped": 0,
    "errors": 0
  }
}
```

### Test 5 — Verifiser charge-opprettelse

```bash
curl -X GET https://<ditt-replit-domene>/api/admin/billing/charges \
  -H "x-user-token: <admin_jwt>"
```

Forventet: en rad med `status: "due"` og et gyldig `vippsChargeId`.

I Vipps Portal → **Test** → Finn chargen og verifiser at den er i `DUE`-status.

### Test 6 — Simuler charge-capture

Vipps sandkasse behandler charger automatisk på forfallsdato. For umiddelbar test:
- Bruk Vipps testapp til å akseptere betalingen
- Eller bruk Vipps Portal → **Test** → **Capture charge**

Etter capture mottar DriveGarage:
```
recurring.charge-captured.v1
```

Sjekk at `billing_charges.status` oppdateres til `charged`:
```sql
SELECT status, charged_at FROM billing_charges WHERE user_id = <test_user_id>;
-- Forventet: status = 'charged', charged_at NOT NULL
```

---

## 8. Verifiser agreements, webhooks og charges

### Hent agreement direkte fra Vipps

```bash
# Hent access token (se steg 5)
curl https://apitest.vipps.no/recurring/v3/agreements/<agreementId> \
  -H "Authorization: Bearer <access_token>" \
  -H "Ocp-Apim-Subscription-Key: <VIPPS_SUBSCRIPTION_KEY>" \
  -H "Merchant-Serial-Number: <VIPPS_MERCHANT_SERIAL_NUMBER>"
```

Forventet `status`: `ACTIVE`

### List alle charges for agreement

```bash
curl https://apitest.vipps.no/recurring/v3/agreements/<agreementId>/charges \
  -H "Authorization: Bearer <access_token>" \
  -H "Ocp-Apim-Subscription-Key: <VIPPS_SUBSCRIPTION_KEY>" \
  -H "Merchant-Serial-Number: <VIPPS_MERCHANT_SERIAL_NUMBER>"
```

### Verifiser webhook-mottak via admin-endepunkter

```bash
# List subscription events (inkl. webhook-hendelser)
curl https://<ditt-replit-domene>/api/admin/invoices \
  -H "x-user-token: <admin_jwt>"
```

Sjekk at `processingStatus: "processed"` for alle events.

### Verifiser at DR YR-run er idempotent

Kjør `run-monthly-charges` en gang til — skal returnere `skipped: 1, created: 0`.

---

## 9. Test kansellering

### 9.1 Kanseller via DriveGarage-UI

1. Gå til **Abonnement** → Klikk **Kanseller abonnement**
2. DriveGarage sender `PATCH /recurring/v3/agreements/{id}` med `{status: "STOPPED"}` til Vipps
3. Lokalt settes `cancel_at_period_end = true` og `status = "canceled"`

### 9.2 Verifiser kansellering i Vipps

```bash
curl https://apitest.vipps.no/recurring/v3/agreements/<agreementId> \
  -H "Authorization: Bearer <access_token>" \
  -H "Ocp-Apim-Subscription-Key: <VIPPS_SUBSCRIPTION_KEY>" \
  -H "Merchant-Serial-Number: <VIPPS_MERCHANT_SERIAL_NUMBER>"
```

Forventet `status`: `STOPPED`

### 9.3 Verifiser at kansellert bruker ikke belastes

Kjør `run-monthly-charges` igjen:
- Status `canceled` ekskluderes fra SQL-spørringen
- Forventet: `processed: 0`

### 9.4 Verifiser at kansellert bruker beholder tilgang til periodeslutt

```bash
curl https://<ditt-replit-domene>/api/billing/subscription \
  -H "Authorization: Bearer <bruker_token>"
```

Forventet:
```json
{
  "status": "canceled",
  "cancelAtPeriodEnd": true,
  "currentPeriodEndsAt": "<dato>"
}
```

Brukeren skal fortsatt ha tilgang til `currentPeriodEndsAt` selv om enforcement er på.

### 9.5 Test webhook ved kansellering

Vipps sender `recurring.agreement-stopped.v1`. Sjekk at:
```sql
SELECT status FROM subscriptions WHERE user_id = <test_user_id>;
-- Forventet: status = 'canceled'
```

---

## 10. Aktiver BILLING_ENFORCEMENT trygt etter vellykket testing

### Sjekkliste før aktivering

- [ ] Agreement-opprettelse fungerer E2E
- [ ] Webhook `agreement-activated` mottas og behandles korrekt
- [ ] Månedlig charge opprettes via `run-monthly-charges`
- [ ] Webhook `charge-captured` mottas og oppdaterer `billing_charges`
- [ ] Kansellering stopper Vipps-avtale og respekterer periodeslutt
- [ ] `run-monthly-charges` er idempotent (andre kjøring returnerer `skipped`)
- [ ] Alle 24 tester bestått
- [ ] Minst én betalt testbruker i DB med `status = active`

### Aktiver enforcement

1. Gå til **Replit → Secrets**
2. Sett `BILLING_ENFORCEMENT_ENABLED = true`
3. Restart API-serveren

### Verifiser at du ikke mister tilgang til din egen konto

Logg inn med admin-kontoen og sjekk at den har `role = super_admin`:
```sql
SELECT id, email, role FROM users WHERE email = '<din_email>';
```

`super_admin`-rollen er alltid unntatt fra enforcement (returnerer `exempt_internal`).

### Hva som skjer når enforcement aktiveres

| Brukertype | Opplevelse |
|---|---|
| `super_admin` | Ingen endring — alltid tilgang |
| Betalt (`active`) | Ingen endring |
| `past_due` | Tilgang med banner ("betalingen feilet") |
| Kansellert (innen periode) | Tilgang frem til `currentPeriodEndsAt` |
| Kansellert (etter periode) | 402-blokkert, vist oppgraderingsside |
| Ny bruker uten abonnement | 402-blokkert, vist oppgraderingsside |

### Rollback hvis noe går galt

1. Sett `BILLING_ENFORCEMENT_ENABLED = false` i Secrets
2. Restart API-serveren
3. Alle brukere får igjen tilgang umiddelbart

---

## 11. Feilsøking — vanlige Vipps-feil

### 401 Unauthorized fra Vipps API

**Symptom:** API-kall til Vipps returnerer 401

**Årsaker og løsninger:**

| Årsak | Løsning |
|---|---|
| Feil `VIPPS_CLIENT_ID` eller `VIPPS_CLIENT_SECRET` | Kopier på nytt fra Vipps Portal → API-nøkler |
| Feil `VIPPS_SUBSCRIPTION_KEY` | Bruk Primary Key fra riktig produkt (Recurring) |
| Access token utløpt | Automatisk håndtert av `getVippsAccessToken()` — restart server |
| `VIPPS_ENVIRONMENT=production` men bruker testnøkler | Sett `VIPPS_ENVIRONMENT=test` |

---

### 401 på Vipps webhook (HMAC-verifisering feiler)

**Symptom:** Webhook-kall fra Vipps blir avvist med 401 i serverloggene

**Sjekk i rekkefølge:**

1. `VIPPS_WEBHOOK_SECRET` er satt til verdien fra webhook-registreringssvaret (ikke generert selv)
2. `VIPPS_WEBHOOK_EXPECTED_HOST` matcher domenet Vipps signerte mot:
   ```
   # Eksempel — uten https://
   VIPPS_WEBHOOK_EXPECTED_HOST = xxxx.replit.app
   ```
3. Serverloggen viser hvilket ledd som feiler:
   - `"VIPPS_WEBHOOK_SECRET not configured"` → Secret mangler
   - `"Vipps webhook missing required HMAC headers"` → Vipps sender ikke riktige headers (sjekk webhook-registrering)
   - `"Vipps webhook content hash mismatch"` → Body endret i transit (sjekk mellomvare)
   - `"Vipps webhook HMAC signature mismatch"` → Feil secret eller feil host
   - `"x-ms-date outside acceptable window"` → Klokkeskjevhet > 5 min (uvanlig i test)

---

### Agreement-status forblir PENDING

**Symptom:** Bruker godkjenner i Vipps-appen, men DriveGarage viser fortsatt "Venter"

**Årsaker:**

1. **Webhook kom ikke frem** — Sjekk at `VIPPS_CALLBACK_URL` er riktig satt og at Replit-appen er kjørende
2. **Webhook ble avvist (401)** — Se webhook-feilsøking ovenfor
3. **Subscriptions-rad mangler `vipps_agreement_id`** — Sjekk loggene for start-agreement-kallet

**Midlertidig fix:** Bruk poll-endepunktet:
```bash
curl "https://<domene>/api/billing/vipps/status" \
  -H "Authorization: Bearer <bruker_token>"
```

---

### `run-monthly-charges` returnerer `errors: N`

**Symptom:** Billing-jobben feiler for noen brukere

**Sjekk:**

```bash
curl -X POST https://<domene>/api/admin/billing/charges \
  -H "x-user-token: <admin_jwt>"
# Se etter rader med status = 'failed' og lastError-melding
```

Vanlige årsaker:
- Agreement er i `STOPPED`-tilstand i Vipps men `active` lokalt → Kjør reconcile
- Vipps API utilgjengelig → Prøv igjen (jobben er idempotent)
- `due`-dato for nær (< 1 dag) → Aldri et problem med 2-dagers margin, men sjekk servertid

---

### Dobbeltbelastning (teoretisk)

**Beskyttelse implementert:** DB UNIQUE INDEX på `(subscription_id, billing_period)` + `onConflictDoNothing()`.
Dersom to prosesser kjører jobben samtidig, vil kun én lykkes med INSERT. Den andre hoppes over.

For å verifisere:
```sql
SELECT subscription_id, billing_period, COUNT(*) 
FROM billing_charges 
GROUP BY subscription_id, billing_period 
HAVING COUNT(*) > 1;
-- Skal returnere 0 rader
```

---

### Reconcile-kjøring etter tapte webhooks

Dersom server var nede og webhooks ikke ble mottatt:

```bash
curl -X POST https://<domene>/api/admin/billing/reconcile-charges \
  -H "x-user-token: <admin_jwt>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Dette synkroniserer alle `pending`/`due`-charger med forfallsdato i fortiden mot Vipps GET-API.

---

## Hva du må gjøre i Vipps Portal FØRST

Gjør disse stegene i Vipps Portal **før du åpner Replit**:

**Steg 1 — Logg inn**
→ https://portal.vipps.no → Velg **Testmiljø**

**Steg 2 — Opprett testselger**
→ Salgssted → Legg til salgssted → noter **MSN**

**Steg 3 — Hent OAuth-kredentialer**
→ Utvikler → API-nøkler → noter **Client ID** + **Client Secret**

**Steg 4 — Hent abonnementsnøkkel**
→ Utvikler → API-produkter → Recurring Payments → noter **Primary Key**

**Steg 5 — Registrer webhook**
→ Kjør cURL-kommandoen fra seksjon 5 med ditt Replit-domene → noter **secret** fra svar

**Steg 6 — Gå til Replit**
→ Opprett alle Secrets fra seksjon 4 (inkl. `VIPPS_WEBHOOK_SECRET` fra steg 5 over)
→ Restart API-serveren
→ Start E2E-testen fra seksjon 7

---

*Sist oppdatert: 13. juli 2026*
*Implementasjonsstatus: Klar for Vipps test-miljø*
