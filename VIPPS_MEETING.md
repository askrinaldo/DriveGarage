# DriveGarage × Vipps — Møteplan og Produktarkitektur

> **Konfidensielt internt dokument.**
> Utarbeidet til forberedelse av leverandørmøte med Vipps.
> Sist oppdatert: Juni 2026.

---

## 1. Kodeaudit — Nåværende betalingsstatus

### Hva finnes i kodebasen

| Komponent | Fil | Status |
|-----------|-----|--------|
| Stripe SDK-klient | `artifacts/api-server/src/lib/stripeClient.ts` | 🔴 Legacy — henter credentials via Replit Connectors |
| Stripe-ruter | `artifacts/api-server/src/routes/billing.ts` | 🔴 Legacy — 4 ruter: subscription, checkout, portal, prices |
| Stripe webhooks | `artifacts/api-server/src/webhookHandlers.ts` | 🔴 Legacy — wrapper over `stripe-replit-sync` |
| Abonnementshooks | `artifacts/vintage-garage/src/hooks/use-subscription.ts` | ⚠️ **Stubb** — returnerer hardkodet `free`-tier, kaller aldri API |
| Billing-side | `artifacts/vintage-garage/src/pages/billing.tsx` | ⚠️ UI finnes, ingen ekte checkout-flyt |
| Prisingsside | `artifacts/vintage-garage/src/pages/pricing.tsx` | ✅ Nyopprettet — placeholder-priser, ingen ekte betaling |

### DB-skjema — `users`-tabellen

Eksisterende felter:

```sql
subscription_tier    text   default 'free'   -- 'free' | 'standard' | 'premium'
subscription_status  text   default 'active' -- fritekst, ingen enum ennå
stripe_customer_id   text   nullable
stripe_subscription_id text nullable
```

**Manglende felter for Vipps (ikke implementert ennå):**

```sql
trial_start_at          timestamptz   nullable
trial_ends_at           timestamptz   nullable
vipps_agreement_id      text          nullable  -- Vipps recurring agreement ID
vipps_charge_id         text          nullable  -- siste charge-ID
payment_provider        text          nullable  -- 'vipps' | null
payment_exempt          boolean       default false
payment_exempt_reason   text          nullable
payment_exempt_by       integer       nullable FK → users.id
payment_exempt_at       timestamptz   nullable
payment_exempt_until    timestamptz   nullable
```

### Hva er AKTIVT vs LEGACY

| Spørsmål | Svar |
|----------|------|
| Behandles noen betaling i dag? | ✅ **Nei** — ingen betaling processet |
| Er Stripe-koden aktiv? | 🔴 Legacy — routes registrert men stub hindrer frontend-kall |
| Finnes feature gating? | 🔴 **Nei** — tier lagres men håndheves ikke |
| Finnes trial-logikk? | 🔴 **Nei** — ingen felt, ingen logikk |
| Finnes admin billing-verktøy? | 🔴 **Nei** |
| Finnes betalingsunntak-system? | 🔴 **Nei** |

---

## 2. Prismodell — Forslag til Vipps-møtet

> **Merk:** Disse prisene er interne arbeidspriser til møteforberedelse.
> Endelig prissetting fastsettes etter Vipps-møtet og juridisk gjennomgang.

### Tier-oversikt

| Tier | Pris | Fornyelse | Målgruppe |
|------|------|-----------|-----------|
| **Gratis** | kr 0 | Alltid | Hobbyister, prøvebrukere |
| **Standard** | kr 69/mnd | Månedlig via Vipps | Aktive entusiaster |
| **Premium** | kr 129/mnd | Månedlig via Vipps | Seriøse samlere, klubbledere |
| *(Årsabonnement)* | *(ca. −17%)* | Årlig via Vipps | Fremtidig fase |

### Funksjonstilgang per tier

| Funksjon | Gratis | Standard | Premium |
|----------|--------|----------|---------|
| Kjøretøy | 3 stk | Ubegrenset | Ubegrenset |
| Vedlikeholdslogg | ✅ (10/kjøretøy) | ✅ Ubegrenset | ✅ Ubegrenset |
| Kvitteringsarkiv | ✅ (5/kjøretøy) | ✅ Ubegrenset | ✅ Ubegrenset |
| Turllogg | ✅ | ✅ | ✅ |
| Servicereminders | — | ✅ | ✅ |
| AI-vedlikeholdsråd | — | ✅ | ✅ |
| PDF/CSV-eksport | — | ✅ | ✅ |
| Klubbfunksjoner | — | — | ✅ |
| Markedsplass | — | — | ✅ |
| Offentlig garasje-profil | — | — | ✅ |
| Kjøretøyoverføring | — | — | ✅ |
| Prioritert support | — | — | ✅ |

### Prøveperiode

- **7 dager full tilgang** (Standard-nivå) uten at betalingsinformasjon innhentes
- Brukeren må godkjenne Vipps recurring agreement **før** prøveperioden utløper
- Hvis avtale IKKE godkjennes → konto nedgraderes til Gratis
- **Ingen overraskelsesbelastning** — ingen betaling trekkes uten eksplisitt Vipps-godkjenning

---

## 3. Abonnementsstatus-maskin

Foreslåtte statuser for `subscription_status`-feltet:

| Status | Hva det betyr | Tilgang |
|--------|---------------|---------|
| `trialing` | Innen 7-dagers prøveperiode, ingen Vipps-avtale ennå | Full Standard-tilgang |
| `pending_vipps_agreement` | Prøveperiode utløpt, venter på Vipps-godkjenning | Begrenset / Gratis |
| `active` | Vipps-avtale godkjent, betaling aktiv | Full tier-tilgang |
| `past_due` | Betaling feilet, venter på retry | Full tilgang i X dager |
| `payment_failed` | Betaling feilet etter retries | Nedgradert til Gratis |
| `canceled` | Bruker sa opp abonnementet | Tilgang til periodens slutt, deretter Gratis |
| `expired` | Abonnement utløpt (ingen fornyelse) | Gratis-tilgang |
| `exempt_internal` | Manuelt unntak (admin/test/partner) | Full tier-tilgang uavhengig av betaling |

### Overganger

```
[Ny bruker]
    │
    ▼
trialing (7 dager)
    ├── Godkjenner Vipps-avtale ──────────► active
    └── Godkjenner ikke / utløper ────────► pending_vipps_agreement ──► expired
                                                                              │
                                                                              ▼
                                                                        (Gratis-tilgang)

active
    ├── Betaling vellykket ───────────────► active (fornyes)
    ├── Betaling feiler ──────────────────► past_due
    │   ├── Retry vellykket ──────────────► active
    │   └── Max retries nådd ─────────────► payment_failed ──► expired
    └── Bruker avbestiller ───────────────► canceled ──► expired (ved periodeslutt)

[Super_admin setter exempt] ─────────────► exempt_internal (med utløpsdato)
```

---

## 4. Superadmin og betalingsunntak

> **Ikke implementert ennå.** Plan for fremtidig fase.

### Prinsipper

1. **Ingen hardkodet e-post-basert tilgang** — admin-status styres av `users.role = 'super_admin'` i DB
2. **Eksplisitt unntak-rad** — hvert unntak lagres med årsak, hvem som opprettet det og utløpsdato
3. **Revisjonsspor** — alle endringer på unntak logges i `audit_logs`-tabellen
4. **Prinsipp om minste privilegium** — super_admin ser ikke private brukerdata uten en aktiv support-handling som begrunner tilgangen

### Foreslått unntak-skjema

```sql
-- Alternativ A: Unntak-felt på users-tabellen (enklest)
payment_exempt          boolean       default false
payment_exempt_reason   text          nullable   -- 'internal_admin' | 'beta_tester' | 'partner' | 'support_action'
payment_exempt_by       integer       FK → users.id  -- hvem ga unntaket
payment_exempt_at       timestamptz   not null
payment_exempt_until    timestamptz   nullable   -- null = ingen utløpsdato

-- Alternativ B: Separat payment_exemptions-tabell (mer fleksibel)
CREATE TABLE payment_exemptions (
  id            serial PRIMARY KEY,
  user_id       integer NOT NULL REFERENCES users(id),
  reason        text NOT NULL,
  notes         text,
  granted_by    integer NOT NULL REFERENCES users(id),
  granted_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz,
  revoked_at    timestamptz,
  revoked_by    integer REFERENCES users(id)
);
```

**Anbefaling:** Start med Alternativ A (unntak-felt på `users`). Migrer til Alternativ B når fler-unntak per bruker blir nødvendig.

### Super_admin-tilgangsaudit

- Alle super_admin-handlinger som berører private brukerdata logges i `audit_logs` med `action`, `targetUserId`, `reason`
- Super_admin-dashbordet viser eksplisitt hvilke brukere som har unntak og hvem som innvilget dem
- Unntak-utløp håndteres automatisk av en bakgrunnsjobb som sjekker `payment_exempt_until`

### Unntakstyper

| Kode | Hvem | Varighet |
|------|------|---------|
| `internal_admin` | Interne DriveGarage-ansatte og testkontoer | Ingen utløp |
| `beta_tester` | Utvalgte beta-testere | Tidsbegrenset (f.eks. 90 dager) |
| `partner` | Samarbeidspartnere (klubber, forhandlere) | Tidsbegrenset med opsjon fornyelse |
| `support_action` | Kompensasjon for teknisk problem | Kortvarig (f.eks. 7–30 dager) |

---

## 5. Vipps Recurring — Teknisk arkitektur

> **Ikke implementert ennå.** Plan for fremtidig fase.

### Produkt: Vipps Recurring Payments

Riktig Vipps-produkt for DriveGarage: **Vipps Recurring Payments (eFaktura)**
- API: `POST /recurring/v3/agreements`
- Gir bruker mulighet til å godkjenne en løpende betalingsavtale i Vipps-appen
- Etter godkjenning kan merchant sende charges uten ny brukerinteraksjon
- Støtter trial-perioder med `initialCharge = 0`

### Flyt

```
[Frontend]                     [Backend]                      [Vipps API]
    │                               │                               │
    │  POST /api/billing/vipps/     │                               │
    │  start-agreement              │                               │
    │─────────────────────────────► │                               │
    │                               │  POST /recurring/v3/         │
    │                               │  agreements                  │
    │                               │─────────────────────────────►│
    │                               │◄─────────────────────────────│
    │                               │  { agreementId, vippsUrl }   │
    │◄─────────────────────────────  │                               │
    │  { redirectUrl }              │  Lagre agreementId i DB       │
    │                               │                               │
    │  [Bruker godkjenner i Vipps]  │                               │
    │                               │◄─────────────────────────────│
    │                               │  Webhook: ACTIVE/REJECTED     │
    │                               │  Oppdater subscription_status │
    │                               │                               │
    │  GET /api/billing/vipps/      │                               │
    │  status (polling eller WS)    │                               │
    │─────────────────────────────► │                               │
    │◄─────────────────────────────  │                               │
    │  { status: "active" }         │                               │
```

### Sikkerhetsregler

- **Backend-only API-kall** — Vipps-nøkler eksponeres aldri til frontend
- `vipps_agreement_id` lagres kryptert (eller i env-isolert kolonne) — aldri i API-respons til frontend
- Frontend mottar kun: `{ status, redirectUrl }` — aldri credentials
- Alle Vipps-nøkler leses fra miljøvariabler (aldri hardkodet)
- Webhook-signatur verifiseres på backend før status oppdateres

### Faktureringssyklus (etter godkjenning)

```
Dag 0    → Bruker godkjenner Vipps-avtale (initialCharge = 0 i trial)
Dag 7    → Trial utløper
Dag 8    → Backend sender POST /recurring/v3/agreements/{id}/charges
           amount = 6900 (kr 69 × 100 øre), description = "DriveGarage Standard"
Dag 10   → Vipps trekker beløpet (2 dagers lead time standard for Vipps Recurring)
Mnd 2+   → Gjentakende charge sendes automatisk 2 dager før fornyelsesdato
```

---

## 6. Prøveperiodeflyt — Detaljert

```
1. Bruker registrerer seg (Clerk sign-up)
   └── JIT provisioning oppretter users-rad med:
       subscription_tier   = 'free'
       subscription_status = 'active'

2. Bruker aktiverer prøveperiode (klikker "Start 7-dagers prøveperiode")
   └── Backend oppretter/oppdaterer users-rad:
       subscription_tier   = 'standard'
       subscription_status = 'trialing'
       trial_start_at      = NOW()
       trial_ends_at       = NOW() + INTERVAL '7 days'

3. Under prøveperioden
   └── Frontend viser TrialBanner med "X dager igjen"
   └── Bruker oppfordres til å godkjenne Vipps-avtale

4a. Bruker godkjenner Vipps-avtale (innen dag 7)
    └── Backend mottar Vipps-webhook: agreement ACTIVE
    └── Oppdaterer: subscription_status = 'active', vipps_agreement_id = '...'
    └── TrialBanner forsvinner

4b. Bruker godkjenner IKKE (dag 7 utløper)
    └── Bakgrunnsjobb (cron, sjekker daily):
        WHERE trial_ends_at < NOW() AND subscription_status = 'trialing'
    └── Oppdaterer: subscription_tier = 'free', subscription_status = 'expired'
    └── UI viser "Prøveperioden er avsluttet — oppgrader for å fortsette"

5. Aktiv betaling (etter dag 7)
   └── Backend sender Vipps charge 2 dager før neste fornyelse
   └── Ved vellykket betaling: subscription_status forblir 'active'
   └── Ved feilet betaling: subscription_status = 'past_due' → retry × 3 → 'payment_failed'
```

**UI-kommunikasjon:**

| Tilstand | Hva brukeren ser |
|----------|-----------------|
| `trialing` | Amber banner: "Din gratis prøveperiode — X dager igjen. Godkjenn Vipps-avtale." |
| `pending_vipps_agreement` | Billing-side: "Prøveperioden er over — godkjenn Vipps for å fortsette" |
| `active` | Grønn badge "Aktiv" i billing-siden |
| `past_due` | Amber banner: "Betaling feilet — vi prøver igjen" |
| `payment_failed` | Rød banner: "Abonnementet ditt er avsluttet" |
| `canceled` | Billing-side: "Kansellert — tilgang til [dato]" |
| `exempt_internal` | Ingen banner (admin/interne kontoer) |

---

## 7. Nødvendige Vipps miljøvariabler

> **Ikke krevet ved oppstart ennå** — legges til `envValidation.ts` når Vipps-implementasjon starter.

| Variabel | Beskrivelse | Eksempel |
|----------|-------------|---------|
| `VIPPS_CLIENT_ID` | OAuth 2.0 client ID fra Vipps Portal | `fb492...` |
| `VIPPS_CLIENT_SECRET` | OAuth 2.0 client secret fra Vipps Portal | `Y8Kne9...` |
| `VIPPS_SUBSCRIPTION_KEY` | Ocp-Apim-Subscription-Key fra Vipps | `0f14eb...` |
| `VIPPS_MERCHANT_SERIAL_NUMBER` | MSN — selgers unike ID | `123456` |
| `VIPPS_ENVIRONMENT` | `test` eller `production` | `test` |
| `VIPPS_CALLBACK_URL` | Backend-URL for webhooks fra Vipps | `https://drivegarage.no/api/billing/vipps/webhook` |
| `VIPPS_RETURN_URL` | Frontend-URL etter Vipps-godkjenning | `https://drivegarage.no/billing?vipps=ok` |

**Eksisterende legacy-variabler (fjernes etter Vipps er verifisert):**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

---

## 8. Møtejekkliste for Vipps

### Produkt og rettigheter

- [ ] Hvilket Vipps-produkt anbefales for 7-dagers trial + løpende månedsbetaling?
  - Er **Vipps Recurring (eFaktura)** riktig valg, eller finnes et bedre alternativ?
- [ ] Støtter Vipps Recurring `initialCharge = 0` (gratis trial uten kortregistrering)?
- [ ] Hva er minimums- og maksimumsbeløp per recurring charge?
- [ ] Kan vi kjøre trial uten at brukeren registrerer betalingsmetode (dvs. ren free trial)?
- [ ] Støttes månedlig OG årlig intervall i samme merchant-setup?

### Merchant-oppsett

- [ ] Hva kreves for å registrere DriveGarage AS som Vipps-merchant?
  - Organisasjonsnummer, bankkontonummer, kontaktperson?
- [ ] Kreves det separat Sales Unit per produkt/tier, eller holder én?
- [ ] Hva er lead time fra søknad til aktiv produksjonskonto?
- [ ] Kan vi bruke testmiljø (MT) mens produksjonsgodkjenning pågår?

### Teknisk integrasjon

- [ ] Hvilken API-versjon anbefales: Recurring v3 eller nyere?
  - Dokumentasjon: `https://developer.vippsmobilepay.com/docs/APIs/recurring-api/`
- [ ] Hva er webhook/callback-krav? (HTTPS, signaturverifisering, retry-logikk?)
- [ ] Krever Vipps at vi varsler bruker X dager før første belastning?
- [ ] Hva er standard lead time mellom `POST /charges` og faktisk trekk?
- [ ] Finnes SDK for Node.js, eller brukes REST direkte?
- [ ] Hvem er ansvarlig for retry-logikk ved feilet betaling — Vipps eller merchant?

### Brukeropplevelse og regulatorisk

- [ ] Er det krav til spesifikk tekst/disclosure i godkjenningsdialogen i Vipps-appen?
- [ ] Hva krever norsk angrerettlov for digitale abonnementer via Vipps?
- [ ] Kansellering: kan bruker kansellere direkte i Vipps-appen, og mottar vi webhook?
- [ ] Refusjon: hva er Vipps' API for refusjon av enkeltcharge?
- [ ] GDPR: er Vipps databehandler, og kreves separat DPA (databehandleravtale)?

### Økonomi

- [ ] Hva koster Vipps Recurring per transaksjon / per måned?
- [ ] Er det setup-avgift?
- [ ] Hva er utbetalingsfrekvens og -betingelser?
- [ ] Hva skjer ved chargebacks — hvem dekker?

### Go-live

- [ ] Hva er Vipps' go-live-sjekkliste for recurring payments?
- [ ] Kreves det manuell gjennomgang av merchant-oppsett av Vipps?
- [ ] Hva er estimert tid fra ferdig integrasjon til produksjonstillatelse?

---

## 9. Hva skal IKKE implementeres nå

| Hva | Hvorfor vente |
|-----|---------------|
| Vipps API-integrasjon | Trenger merchant-credentials og avklart produktvalg fra Vipps-møtet |
| DB-skjema-endringer (trial-felter, vipps_agreement_id) | Endringer krever migrering og koordinert produksjons-deploy |
| Feature gating (håndheve tier-grenser) | Trenger avklart tier-modell og Vipps-status som kilde |
| Trial-bakgrunnsjobb (cron) | Avhenger av Vipps-avtalelogikk |
| Betalingsunntak-system | Avhenger av Vipps-implementasjon |
| Stripe-kode-sletting | Slettes kun etter Vipps er verifisert i produksjon |
| Vipps-knapp som faktisk starter betaling | Ingen merchant-credentials ennå |

---

## 10. Filer endret / opprettet

| Fil | Endring |
|-----|---------|
| `artifacts/vintage-garage/src/pages/pricing.tsx` | Ny — offentlig prisingsside med placeholder-priser |
| `artifacts/vintage-garage/src/components/trial-banner.tsx` | Ny — TrialBanner-komponent (inaktiv inntil Vipps impl.) |
| `artifacts/vintage-garage/src/App.tsx` | Lagt til `/pricing`-rute (standalone) |
| `artifacts/vintage-garage/src/pages/billing.tsx` | Erstatt loading-spinner med Vipps-placeholder CTA |
| `ARCHITECTURE.md` seksjon 12 | Payment provider status og Vipps roadmap |
| `VIPPS_MEETING.md` | Denne filen |

---

*Dokument utarbeidet som forberedelse til Vipps-møtet. Alle priser, statuser og arkitekturvalg er arbeidsutkast og må valideres med juridisk rådgiver og Vipps-representant.*
