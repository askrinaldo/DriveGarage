# Vipps Produksjonsoppsett — DriveGarage

Steg-for-steg-guide for å sette DriveGarage i produksjon med ekte Vipps-betalinger.

---

## Forutsetninger

- [ ] Godkjent Vipps Recurring-tilgang for produksjonssalgsenheten (sjekk i [portal.vipps.no](https://portal.vipps.no))
- [ ] Kjent produksjons-URL (eksempel: `https://drivegarage.replit.app`)
- [ ] GitHub-repo med Actions aktivert (for månedlig billing-scheduler)

---

## Steg 1 — Hent produksjonsnøkler fra Vipps Portal

1. Logg inn på [portal.vipps.no](https://portal.vipps.no)
2. Gå til **Salgsenheter → din DriveGarage-enhet → API-nøkler**
3. Last ned og noter:
   - `client_id`
   - `client_secret`
   - `Ocp-Apim-Subscription-Key` (subscription key)
   - `Merchant-Serial-Number` (MSN)

---

## Steg 2 — Registrer produksjons-webhook

I **Vipps Portal**: Salgsenheter → din enhet → **Webhooks** → Legg til webhook.

- **URL**: `https://<din-produksjonsdomain>/api/billing/vipps/webhook`
- **Events** (velg alle):
  - `recurring.agreement-activated.v1`
  - `recurring.agreement-stopped.v1`
  - `recurring.agreement-expired.v1`
  - `recurring.agreement-rejected.v1`
  - `recurring.charge-captured.v1`
  - `recurring.charge-failed.v1`
  - `recurring.charge-canceled.v1`

> ⚠️ **Vipps viser webhook-secrecten kun én gang.** Kopier og lagre den umiddelbart i Replit Secrets.

---

## Steg 3 — Sett miljøvariabler i Replit Secrets (production)

Gå til **Replit → Secrets → velg environment: production** og sett:

| Variabel | Verdi |
|---|---|
| `VIPPS_ENVIRONMENT` | `production` |
| `VIPPS_CLIENT_ID` | (fra steg 1) |
| `VIPPS_CLIENT_SECRET` | (fra steg 1) |
| `VIPPS_SUBSCRIPTION_KEY` | (fra steg 1) |
| `VIPPS_MERCHANT_SERIAL_NUMBER` | (fra steg 1) |
| `VIPPS_CALLBACK_URL` | `https://<din-produksjonsdomain>/api/billing/vipps/webhook` |
| `VIPPS_RETURN_URL` | `https://<din-produksjonsdomain>/billing` |
| `VIPPS_WEBHOOK_SECRET` | (fra steg 2) |
| `VIPPS_WEBHOOK_EXPECTED_HOST` | `<din-produksjonsdomain>` (**uten** `https://`) |
| `BILLING_ENFORCEMENT_ENABLED` | `false` (sett til `true` etter e2e-test) |

---

## Steg 4 — Sett opp GitHub Actions-scheduler

Månedlige fakturaer kjøres ikke automatisk — du trenger en ekstern scheduler.

### GitHub Actions (`.github/workflows/monthly-billing.yml` er allerede lagt inn)

Sett disse i GitHub repo **Settings → Secrets and variables → Actions**:

| Type | Navn | Verdi |
|---|---|---|
| Secret | `DRIVEGARAGE_ADMIN_TOKEN` | JWT-token for super_admin-bruker (se under) |
| Variable | `DRIVEGARAGE_PRODUCTION_URL` | `https://<din-produksjonsdomain>` |

#### Slik genererer du admin-token

Logg inn som super_admin i DriveGarage-appen og hent tokenet fra localStorage/cookies,
eller kall API-et direkte:

```bash
curl -X POST https://<din-produksjonsdomain>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<super_admin_email>","password":"<password>"}'
```

Tokenet i response-en er din `DRIVEGARAGE_ADMIN_TOKEN`. Det varer i 30 dager — husk å fornye det.

### Alternativ: cron-job.org

Gratis tjeneste, ingen GitHub-repo nødvendig.
- URL: `https://<din-produksjonsdomain>/api/admin/billing/run-monthly-charges`
- Metode: `POST`
- Headers: `x-user-token: <admin-token>` og `Content-Type: application/json`
- Body: `{}`
- Frekvens: Månedlig (1. dag i måneden)

---

## Steg 5 — Publiser og e2e-test

1. Publiser ny build (med `BILLING_ENFORCEMENT_ENABLED=false`)
2. Test med en ekte Vipps-konto:
   - Start abonnement i DriveGarage
   - Bekreft i Vipps-appen
   - Sjekk at webhook mottas og DB-status settes til `active`
3. Se API-loggene — skal se `Vipps webhook received` og `Agreement activated — subscription active`

---

## Steg 6 — Slå på billing enforcement

Etter godkjent e2e-test:
1. Sett `BILLING_ENFORCEMENT_ENABLED=true` i Replit production secrets
2. Publiser

---

## Steg 7 — Kjør første månedsfaktura

```bash
# Dry-run (sjekk hvilke brukere som treffer):
curl -X POST https://<din-produksjonsdomain>/api/admin/billing/run-monthly-charges \
  -H "x-user-token: <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'

# Kjør live (faktiske Vipps-avgifter):
curl -X POST https://<din-produksjonsdomain>/api/admin/billing/run-monthly-charges \
  -H "x-user-token: <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Sjekkliste

### Vipps Portal
- [ ] Vipps Recurring aktivert for produksjonssalgsenheten
- [ ] Produksjonsnøkler lastet ned
- [ ] Produksjons-webhook registrert med alle event-typer
- [ ] Webhook-secret lagret i Replit Secrets

### Replit Secrets (production)
- [ ] `VIPPS_ENVIRONMENT=production`
- [ ] `VIPPS_CLIENT_ID` (prod)
- [ ] `VIPPS_CLIENT_SECRET` (prod)
- [ ] `VIPPS_SUBSCRIPTION_KEY` (prod)
- [ ] `VIPPS_MERCHANT_SERIAL_NUMBER` (prod MSN)
- [ ] `VIPPS_CALLBACK_URL` → produksjons-webhook-URL
- [ ] `VIPPS_RETURN_URL` → produksjonsfrontend `/billing`
- [ ] `VIPPS_WEBHOOK_SECRET` → fra webhook-registrering
- [ ] `VIPPS_WEBHOOK_EXPECTED_HOST` → produksjonsdomenet uten `https://`
- [ ] `BILLING_ENFORCEMENT_ENABLED=false` (til e2e er godkjent)

### GitHub Actions
- [ ] `DRIVEGARAGE_ADMIN_TOKEN` satt som repo secret
- [ ] `DRIVEGARAGE_PRODUCTION_URL` satt som repo variable
- [ ] Workflow kjørt manuelt med `dryRun=true` og verifisert

### Etter e2e-test
- [ ] Webhook HMAC-verifisering passerer (ingen feil i logg)
- [ ] Abonnement aktiveres korrekt i DB
- [ ] `BILLING_ENFORCEMENT_ENABLED=true` aktivert
- [ ] Første månedsfaktura kjørt (dry-run → live)

---

## Feilsøking

### Webhook avvises med 401
- Sjekk `VIPPS_WEBHOOK_EXPECTED_HOST` — må matche nøyaktig det domenet Vipps sender til
- Sjekk `VIPPS_WEBHOOK_SECRET` — kopiér fra Vipps Portal på nytt om usikker
- Se API-logger for `Vipps webhook HMAC signature mismatch`

### `POST /billing/vipps/start-agreement` returnerer 503
- En eller flere Vipps-miljøvariabler mangler — sjekk at alle er satt i Replit production secrets
- Restart production deployment etter å ha endret secrets

### Månedsfaktura feiler for noen brukere
- Sjekk `GET /api/admin/billing/charges?period=YYYY-MM` for feilmeldinger
- Kall `POST /api/admin/billing/reconcile-charges` for å synkronisere status mot Vipps
