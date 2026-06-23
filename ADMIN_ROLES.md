# DriveGarage — Superadmin, Roller og Betalingsunntak
## Sikkerhetsdesign Phase 6

> **Konfidensielt internt dokument.**
> Sist oppdatert: Juni 2026.
>
> **Implementasjonsstatus Phase 6.5 + 7:**
> - ✅ `admin_audit_logs`-tabell live i DB
> - ✅ `logAdminAction`-helper (`artifacts/api-server/src/lib/adminAudit.ts`)
> - ✅ `PATCH /admin/users/:id` logger `user.activate` / `user.deactivate`
> - ✅ `PATCH /admin/users/:id/subscription` logger `billing.tier.change`
> - ✅ `payment_exemptions`-tabell live i DB
> - ✅ `createPaymentExemption / revokePaymentExemption / isUserPaymentExempt` helpers
> - ✅ `GET/POST/DELETE /admin/users/:id/payment-exemption` — superadmin-ruter
> - ✅ Admin-UI: gi/trekke tilbake unntak fra `UserDetailPanel`
> - 🔴 Støtte-tilgang, mellomliggende roller — ikke implementert ennå

---

## 1. Kodeaudit — Nåværende admin/auth-tilstand

### 1.1 Autentisering og rolle-håndhevelse

| Mekanisme | Fil | Status | Vurdering |
|-----------|-----|--------|-----------|
| `parseUserAuth` | `middleware/userAuth.ts` | ✅ Aktiv | Leser `x-user-token` header, verifiserer JWT |
| `requireUser` | `middleware/userAuth.ts` | ✅ Aktiv | Re-sjekker `isActive` mot DB |
| `requireSuperAdmin` | `middleware/userAuth.ts` | ✅ Aktiv | Re-sjekker rolle mot DB — ikke bare JWT-claim |
| Legacy JWT (x-user-token) | `middleware/userAuth.ts` | ⚠️ Legacy | Admin-fallback — ingen Clerk-kobling |
| Clerk-auth | `middleware/clerkUserAuth.ts` | ✅ Primær | JIT-provisjonering, sitter over legacy JWT |

**Viktig:** `requireSuperAdmin` henter rollen fra DB på hver request — en kompromittert JWT kan ikke eskalere til super_admin uten at DB-raden er endret. ✅

### 1.2 Nåværende rolle-enum

```typescript
// lib/db/src/schema/users.ts
role: text("role", { enum: ["user", "super_admin"] }).default("user")
```

**Mangler:** `support_admin` og `billing_admin` finnes ikke. Alt er enten `user` eller `super_admin`.

### 1.3 Eksisterende admin-ruter (`routes/admin.ts`)

| Rute | Tilgang | Hva eksponeres | Audit-logging |
|------|---------|----------------|---------------|
| `GET /admin/users-detailed` | super_admin | Navn, e-post, rolle, isActive, tier, stripeCustomerId, kjøretøy-**antall** | 🔴 Ingen |
| `GET /admin/billing-stats` | super_admin | Aggregerte tall (tier-fordeling, MRR, ARR) | 🔴 Ingen |
| `GET /admin/mrr-history` | super_admin | MRR-historikk fra Stripe-skjema | 🔴 Ingen |
| `GET /admin/invoices` | super_admin | Fakturaer fra Stripe-skjema | 🔴 Ingen |
| `GET /admin/system-health` | super_admin | Systemtall (brukere, kjøretøy, DB-opptid) | 🔴 Ingen |
| `GET /admin/audit-log` | super_admin | Eksisterende klubb-audit-log | 🔴 Ingen |
| `GET /admin/subscriptions` | super_admin | Abonnementsstatus + stripeCustomerId | 🔴 Ingen |
| `PATCH /admin/users/:id` | super_admin | Kan aktivere/deaktivere bruker | 🔴 **Ingen audit-logging** |
| `PATCH /admin/users/:id/subscription` | super_admin | Kan endre tier manuelt | 🔴 **Ingen audit-logging** |

### 1.4 Privatdata-eksponering — hva admin KAN se i dag

| Data | Eksponert til admin? | Vurdering |
|------|---------------------|-----------|
| Navn og e-post | ✅ Ja | Akseptabelt for admin |
| Kjøretøy-antall | ✅ Ja (count only) | Akseptabelt — ikke innhold |
| Subscription tier/status | ✅ Ja | Nødvendig for billing-admin |
| Stripe customer/subscription ID | ✅ Ja | Akseptabelt — ikke betalingsdata |
| Kjøretøy-innhold (registreringsnr, notater, bilder) | 🚫 Ikke eksponert | ✅ Greit |
| Servicerekorder-innhold | 🚫 Ikke eksponert | ✅ Greit |
| Kvitteringer og opplastede filer | 🚫 Ikke eksponert | ✅ Greit |
| Turllogger-innhold | 🚫 Ikke eksponert | ✅ Greit |
| Passord-hash | 🚫 Ikke eksponert | ✅ Greit |

**Konklusjon:** Garasjedata er godt isolert fra admin. Hovedelproblemet er manglende mellomliggende roller og fraværende audit-logging på muterende admin-handlinger.

### 1.5 Eksisterende audit-log — begrensninger

```typescript
// lib/db/src/schema/auditLogs.ts — kun for klubb-handlinger
auditLogsTable: {
  clubId: integer FK → clubs
  actorName: text         // ikke linked til user.id
  action: text
  targetType: text
  targetId: integer
  metadata: text          // fri tekst, ikke strukturert
}
```

**Problemer:**
- Bundet til `club_id` — kan ikke brukes for admin-handlinger
- `actorName` er tekst, ikke FK til `users.id` — ingen garantert kobling
- Ingen IP-adresse, ingen `reason`-felt
- Strukturert metadata mangler

---

## 2. Anbefalt rollemodell

### 2.1 Fire roller

```
user  →  support_admin  →  billing_admin  →  super_admin
```

Rollene er **additive** — hver høyere rolle inkluderer lavere rollers rettigheter.

### 2.2 Rolle-definisjon

#### `user` (eksisterende)
**Kan:**
- Lese og skrive egne kjøretøy, servicerekorder, kvitteringer, turer, påminnelser
- Se egne abonnementsstatus
- Delta i klubber der de er medlem

**Kan ikke:**
- Se andre brukeres data
- Aksessere admin-ruter
- Endre egne tier/role

**Audit-logging:** Nei (for høy volum)

---

#### `support_admin` (ny rolle)
**Kan:**
- `GET /admin/users-detailed` — se bruker-metadata (navn, e-post, rolle, status, tier)
- `GET /admin/audit-log` — se admin audit-log
- Svare på support-tickets (`/api/admin/support/tickets`)
- Starte en **support_access_session** for å se en spesifikk brukers garasjedata — krever skriftlig grunn

**Kan ikke:**
- Endre brukers `isActive`, `role`, eller `subscriptionTier`
- Se garasjedata uten aktiv support_access_session med grunn
- Gi betalingsunntak
- Se Stripe/Vipps-credentials
- Se kvitteringsfiler uten aktiv session

**Audit-logging:** Alle support_access_session-opprettelser, alle filetilganger

---

#### `billing_admin` (ny rolle)
**Kan:**
- Alt `support_admin` kan
- `GET /admin/subscriptions` — se abonnementsoversikt
- `GET /admin/billing-stats` — se revenue-statistikk
- `PATCH /admin/users/:id/subscription` — endre tier manuelt (med obligatorisk grunn)
- `POST /admin/users/:id/exemption` — gi betalingsunntak (med type, grunn, utløpsdato)
- `DELETE /admin/users/:id/exemption/:eid` — trekke tilbake unntak (med grunn)
- `GET /admin/mrr-history` og `GET /admin/invoices`

**Kan ikke:**
- Endre `users.role`
- Aktivere/deaktivere brukere
- Se private garasjedata uten support_access_session

**Audit-logging:** Alle tier-endringer, alle unntak (grant/revoke)

---

#### `super_admin` (eksisterende, innskrenket)
**Kan:**
- Alt `billing_admin` kan
- `PATCH /admin/users/:id` — aktivere/deaktivere brukere (med grunn)
- `PATCH /admin/users/:id/role` — tildele/fjerne `support_admin` og `billing_admin`-roller
- `GET /admin/system-health`
- Starte support_access_sessions uten ytterligere godkjenning

**Kan ikke:**
- Stille inn sin egen rolle (self-elevation)
- Lese garasjedata uten aktiv support_access_session
- Gjøre endringer uten audit-logging

**Audit-logging:** Alle handlinger

### 2.3 Rolle-lagring

**Anbefalt: Enkelt felt på `users`-tabellen, utvidet enum:**

```sql
-- Oppdater role-kolonnens enum
ALTER TABLE users
  ALTER COLUMN role TYPE text;

-- Legg til constraint for gyldig verdi
ALTER TABLE users
  ADD CONSTRAINT users_role_valid
  CHECK (role IN ('user', 'support_admin', 'billing_admin', 'super_admin'));
```

**Alternativ: Separat `user_roles`-tabell** (bedre for fremtidig fleksibilitet, f.eks. midlertidige roller med utløp):

```sql
CREATE TABLE user_roles (
  id          serial PRIMARY KEY,
  user_id     integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('support_admin', 'billing_admin', 'super_admin')),
  granted_by  integer NOT NULL REFERENCES users(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,    -- null = permanent
  revoked_at  timestamptz,
  revoked_by  integer REFERENCES users(id),
  notes       text,
  UNIQUE (user_id, role)       -- én aktiv rad per rolle per bruker
);
```

**Anbefaling:** Start med enkelt felt (Alternativ A) for nå. Migrer til Alternativ B i Phase 8 når midlertidige roller trengs.

---

## 3. Betalingsunntak-modell

### 3.1 Unntakstyper

| Type | Hvem | Typisk varighet | Eksempel |
|------|------|-----------------|---------|
| `exempt_internal` | DriveGarage-ansatte, testkontoer | Ingen utløp | hello@drivegarage.no |
| `exempt_partner` | Klubbpartnere, forhandlere | 1 år (fornyes manuelt) | Veteranbil-forbundet |
| `exempt_test` | Beta-testere, ambassadører | 90 dager | Inviterte testbrukere |
| `exempt_manual` | Kompensasjon for teknisk problem | 7–30 dager | Bruker mistet data pga bug |

### 3.2 Prinsippregler

1. **Ingen hardkodede e-poster i kildekode** — unntak lagres i DB, ikke i `if`-setninger
2. **Alle unntak krever grunn** — `reason`-feltet er `NOT NULL`
3. **Alle unntak har `granted_by`** — sporbar til en ansvarlig admin
4. **Alle unntak logges i `admin_audit_log`** — ved grant, revoke, og utløp
5. **Automatisk utløpshåndtering** — bakgrunnsjobb sjekker `expires_at` daglig
6. **Ingen stille unntak** — bruker varsles (e-post eller in-app) ved unntak

### 3.3 Foreslått skjema

```sql
CREATE TABLE payment_exemptions (
  id            serial          PRIMARY KEY,
  user_id       integer         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exempt_type   text            NOT NULL
                CHECK (exempt_type IN (
                  'exempt_internal',
                  'exempt_partner',
                  'exempt_test',
                  'exempt_manual'
                )),
  reason        text            NOT NULL,  -- lesbar begrunnelse
  notes         text,                      -- intern kommentar
  granted_by    integer         NOT NULL REFERENCES users(id),
  granted_at    timestamptz     NOT NULL DEFAULT now(),
  expires_at    timestamptz,               -- null = ingen utløp
  revoked_at    timestamptz,
  revoked_by    integer         REFERENCES users(id),
  revoke_reason text
);

CREATE INDEX idx_payment_exemptions_user   ON payment_exemptions(user_id);
CREATE INDEX idx_payment_exemptions_expiry ON payment_exemptions(expires_at)
  WHERE revoked_at IS NULL;
```

### 3.4 Unntak-kontroll-logikk (pseudokode)

```typescript
// Kjøres i requireUser eller på billing-kontrollpunkter
async function isPaymentExempt(userId: number): Promise<boolean> {
  const now = new Date();
  const exemption = await db
    .select()
    .from(paymentExemptionsTable)
    .where(and(
      eq(paymentExemptionsTable.userId, userId),
      isNull(paymentExemptionsTable.revokedAt),
      or(
        isNull(paymentExemptionsTable.expiresAt),
        gt(paymentExemptionsTable.expiresAt, now)
      )
    ))
    .limit(1);
  return exemption.length > 0;
}
```

---

## 4. Superadmin-personverngrenser

### 4.1 Hva super_admin kan se **uten** eksplisitt handling

| Data | Tilgang | Begrunnelse |
|------|---------|-------------|
| Navn, e-post | ✅ Ja | Nødvendig for identifikasjon |
| Brukerrolle og status (`isActive`) | ✅ Ja | Nødvendig for administrasjon |
| Abonnementstier og -status | ✅ Ja | Nødvendig for billing-admin |
| Kjøretøy-antall | ✅ Ja (count) | Nødvendig for skalerings-analyse |
| Registreringsnummer, notater, bilder | 🚫 Nei | Privat garasjedata |
| Servicerekorder-innhold | 🚫 Nei | Privat garasjedata |
| Kvitteringer og opplastede filer | 🚫 **Spesielt begrenset** | Kan inneholde finansiell info |
| Turllogger og GPS-data | 🚫 Nei | Personlig atferdsdata |

### 4.2 `support_access_session` — protokoll for datatilgang

For å se en brukers private garasjedata kreves:

1. Admin klikker **"Start støtte-tilgang"** for en spesifikk bruker
2. Admin oppgir **obligatorisk skriftlig grunn** (f.eks. "Bruker rapporterte manglende servicepost etter import")
3. System oppretter en `support_access_session` rad med:
   - `admin_id`, `target_user_id`, `reason`, `started_at`, `expires_at` (maks 1 time)
4. Alle endepunkter som returnerer privat garasjedata sjekker om aktiv session eksisterer for admin+bruker-paret
5. Hvert endepunkt som aksesseres loggfører handlingen i `access_log`-feltet (JSONB)
6. Når session utløper (1 time) eller admin klikker "Avslutt tilgang", settes `ended_at`
7. Admin **kan ikke laste ned kvitteringsfiler** selv med aktiv session — disse krever separat eskalering

### 4.3 Kvitteringsfiler — ekstra restriksjon

Kvitteringer og opplastede filer er spesielt sensitive (kan inneholde kortopplysninger, personlig finansinfo). Tilgang krever:
- Aktiv `support_access_session`
- I tillegg: En `file_access_request` som logges separat med grunn og godkjenningsstempel

### 4.4 Statiske regler (håndheves i middleware)

```
REGEL 1: super_admin kan ikke endre sin egen rolle
REGEL 2: super_admin kan ikke gi en annen bruker super_admin-rolle via API
          (kun via bootstrap-script eller direkte DB-tilgang av eier)
REGEL 3: Alle muterende admin-handlinger krever et ikke-tomt reason-felt
REGEL 4: Admin-JWT (x-user-token) logger alltid IP-adresse i audit-log
REGEL 5: Ingen admin-rute returnerer password_hash — noensinne
```

---

## 5. Foreslått datamodell

> **Ikke implementert ennå.** Dette er schema-design for Phase 6.

### 5.1 Tabelloversikt

```
users                    (eksisterende — utvides)
  └── role: expand enum → ['user', 'support_admin', 'billing_admin', 'super_admin']

payment_exemptions       (ny tabell)
  ├── user_id FK → users
  ├── granted_by FK → users
  └── revoked_by FK → users

admin_audit_log          (ny tabell — erstatter ikke audit_logs)
  ├── actor_id FK → users
  └── (target_id — løs kobling, ikke FK, fordi target kan slettes)

support_access_sessions  (ny tabell)
  ├── admin_id FK → users
  └── target_user_id FK → users
```

### 5.2 `admin_audit_log`

```sql
CREATE TABLE admin_audit_log (
  id            serial          PRIMARY KEY,
  actor_id      integer         NOT NULL REFERENCES users(id),
  actor_email   text            NOT NULL,   -- snapshot ved loggføring
  actor_role    text            NOT NULL,   -- snapshot ved loggføring
  action        text            NOT NULL,   -- se liste nedenfor
  target_type   text,                       -- 'user' | 'exemption' | 'session' | 'club'
  target_id     integer,                    -- løs kobling (ikke FK — target kan slettes)
  target_email  text,                       -- snapshot av target-brukers e-post
  reason        text,                       -- obligatorisk for muterende handlinger
  metadata      jsonb,                      -- action-spesifikke data
  ip_address    text,
  user_agent    text,
  created_at    timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_log_actor     ON admin_audit_log(actor_id);
CREATE INDEX idx_admin_audit_log_target    ON admin_audit_log(target_id, target_type);
CREATE INDEX idx_admin_audit_log_created   ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_action    ON admin_audit_log(action);
```

**Standard action-koder:**

| Kode | Beskrivelse | Krever `reason` |
|------|-------------|-----------------|
| `user.deactivate` | Deaktiverte brukerkonto | ✅ |
| `user.activate` | Aktiverte brukerkonto | ✅ |
| `user.role.grant` | Tildelte rolle | ✅ |
| `user.role.revoke` | Fjernet rolle | ✅ |
| `billing.tier.change` | Endret abonnementstier manuelt | ✅ |
| `billing.exemption.grant` | Innvilget betalingsunntak | ✅ |
| `billing.exemption.revoke` | Trukket tilbake unntak | ✅ |
| `support.session.start` | Startet støtte-tilgangssesjon | ✅ |
| `support.session.end` | Avsluttet støtte-tilgangssesjon | — |
| `support.data.access` | Aksesserte privat brukerdata under sesjon | — |
| `support.file.access` | Aksesserte kvitterings/opplastningsfil | ✅ |
| `system.bootstrap.admin` | Opprettet første super_admin via bootstrap | — |

### 5.3 `support_access_sessions`

```sql
CREATE TABLE support_access_sessions (
  id              serial          PRIMARY KEY,
  admin_id        integer         NOT NULL REFERENCES users(id),
  target_user_id  integer         NOT NULL REFERENCES users(id),
  reason          text            NOT NULL,
  started_at      timestamptz     NOT NULL DEFAULT now(),
  expires_at      timestamptz     NOT NULL,    -- DEFAULT: now() + interval '1 hour'
  ended_at        timestamptz,
  access_log      jsonb           NOT NULL DEFAULT '[]'::jsonb,
  -- hvert element: { endpoint, method, timestamp }
  audit_log_id    integer         REFERENCES admin_audit_log(id)
);

CREATE INDEX idx_support_sessions_admin    ON support_access_sessions(admin_id);
CREATE INDEX idx_support_sessions_target   ON support_access_sessions(target_user_id);
CREATE INDEX idx_support_sessions_active   ON support_access_sessions(expires_at, ended_at)
  WHERE ended_at IS NULL;
```

### 5.4 Foreslåtte API-endepunkter (ikke implementert ennå)

```
ROLLER
  GET    /api/admin/users/:id/roles             → list active roles
  POST   /api/admin/users/:id/roles             → grant role (super_admin only)
  DELETE /api/admin/users/:id/roles/:role       → revoke role (super_admin only)

BETALINGSUNNTAK
  GET    /api/admin/users/:id/exemptions        → list exemptions
  POST   /api/admin/users/:id/exemptions        → grant exemption (billing_admin+)
  DELETE /api/admin/users/:id/exemptions/:eid   → revoke exemption (billing_admin+)
  GET    /api/admin/exemptions                  → list all active exemptions

STØTTE-TILGANG
  POST   /api/admin/support-access             → start session (all admin roles)
  DELETE /api/admin/support-access/:id         → end session
  GET    /api/admin/support-access             → list sessions (super_admin only)

AUDIT LOG
  GET    /api/admin/admin-audit-log            → query audit log (super_admin only)
    ?actor=<id>&action=<code>&from=<ts>&to=<ts>&limit=100

ALLEREDE EKSISTERER — TRENGER AUDIT-LOGGING
  PATCH  /api/admin/users/:id                  → aktivere/deaktivere (legg til reason + audit)
  PATCH  /api/admin/users/:id/subscription     → endre tier (legg til reason + audit)
```

---

## 6. Admin UI-plan

> Sider som bør eksistere. Noen eksisterer allerede (markert).

### `/admin` — Dashboard *(eksisterer)*
**Vis:**
- Systemhelse (kjøretøy, brukere, opptid)
- Revenue-statistikk (tier-fordeling, MRR, ARR)
- Nylige admin-handlinger (siste 5 audit-log-oppføringer)
- Aktive support-sesjoner (varsling)

**Ikke vis:**
- Individuelle brukeres private data

---

### `/admin/users` — Brukeradministrasjon *(eksisterer)*
**Vis:**
- Tabellvisning: navn, e-post, rolle, isActive, tier, kjøretøy-antall, opprettet
- Søk og filtrering
- Klikk → `/admin/users/:id`

**Handlinger:**
- Deaktiver/aktiver bruker (med obligatorisk grunn-dialog)

---

### `/admin/users/:id` — Brukerdetalj *(planlegges)*
**Seksjon A — Kontometadata (alltid synlig):**
- Navn, e-post, rolle, status, opprettet, siste innlogging
- Abonnementstier og -status
- Eventuelle aktive betalingsunntak

**Seksjon B — Billing (billing_admin+):**
- Endre tier manuelt (med grunn-dialog)
- Gi/trekke tilbake betalingsunntak

**Seksjon C — Støtte-tilgang (support_admin+):**
- Knapp: "Start støtte-tilgangssesjon" → åpner dialog med obligatorisk grunn
- Kun aktiv sesjon vises — ikke historikk av garasjedata

**Seksjon D — Aktivitetslogg (super_admin):**
- Liste av admin_audit_log-oppføringer knyttet til denne brukeren

**Hva som ALDRI vises her:**
- Kjøretøy-innhold, servicerekorder, kvitteringer, turer (bare antall)
- `password_hash`

---

### `/admin/billing` — Billing-oversikt *(planlegges)*
**Vis:**
- Alle brukere med ikke-gratis tier eller aktive unntak
- Søk og filter på tier, status, unntakstype
- MRR-historikk-graf

**Handlinger (billing_admin+):**
- Masseoppdatering av tier (med grunn)
- Eksporter CSV over aktive abonnementer og unntak

---

### `/admin/audit-log` — Revisjonslogg *(planlegges, erstatter eksisterende)*
**Vis:**
- admin_audit_log tabellvisning (nyeste øverst)
- Filter: actor, action-type, target-type, datoperiode
- Kobling til bruker-detalj for actor og target

**Kan ikke:**
- Redigere eller slette loggoppføringer
- Filtrere bort obligatoriske handlinger

---

### `/admin/support-access` — Støtte-sesjoner *(planlegges)*
**Vis:**
- Aktive sesjoner: hvem ser hva, startet når, utløper
- Historikk: avsluttede sesjoner med tilgangsoversikt

**Handlinger:**
- Avslutt aktiv sesjon (nødstopp)

---

## 7. Bootstrap-strategi

### 7.1 Problem

Første super_admin kan ikke opprettes via API (ingen admin-tilgang ennå). Løsningen må:
- Ikke hardkode e-poster i kildekode
- Ikke åpne offentlig registrering til admin
- Fungere én gang og ellers være passiv

### 7.2 Anbefalt bootstrap-flyt

**Steg 1: Miljøvariabel kun for første oppstart**

```bash
# Kun sett under bootstrap — fjernes umiddelbart etter
BOOTSTRAP_SUPER_ADMIN_EMAIL=founder@drivegarage.no
```

**Steg 2: Bootstrap-sjekk ved serveroppstart** (kjøres én gang)

```typescript
// artifacts/api-server/src/lib/bootstrapAdmin.ts
export async function bootstrapSuperAdmin(): Promise<void> {
  const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;
  if (!email) return; // Ikke satt — hopp over

  // Sjekk om super_admin allerede finnes
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "super_admin"))
    .limit(1);

  if (existing) {
    logger.info("Bootstrap: super_admin exists — skipping");
    return;
  }

  // Sjekk om bruker med denne e-posten finnes
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    logger.warn("Bootstrap: BOOTSTRAP_SUPER_ADMIN_EMAIL set but user not found — skipping");
    return;
  }

  await db
    .update(usersTable)
    .set({ role: "super_admin" })
    .where(eq(usersTable.id, user.id));

  // Logg direkte i DB (kan ikke bruke API-admin-log ennå)
  await db.insert(adminAuditLogTable).values({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: "super_admin",
    action: "system.bootstrap.admin",
    reason: "Bootstrap via BOOTSTRAP_SUPER_ADMIN_EMAIL env var",
    metadata: { bootstrapEmail: email },
  });

  logger.info(`Bootstrap: ${email} promoted to super_admin`);
}
```

**Steg 3: Kall i `index.ts` ved oppstart**

```typescript
// artifacts/api-server/src/index.ts
import { bootstrapSuperAdmin } from "./lib/bootstrapAdmin";

// Kjør én gang ved oppstart, etter DB-tilkobling
await bootstrapSuperAdmin();
```

**Steg 4: Fjern miljøvariabelen etter bruk**

Etter at super_admin er bekreftet i DB, slett `BOOTSTRAP_SUPER_ADMIN_EMAIL` fra secrets-panelet. Bootstrap-sjekken er passiv (gjør ingenting hvis super_admin allerede finnes).

### 7.3 Produksjon — ekstra sikkerhet

| Miljø | Anbefalt bootstrap-metode |
|-------|--------------------------|
| Dev/Staging | Env var (`BOOTSTRAP_SUPER_ADMIN_EMAIL`) |
| Produksjon (primær) | Direkte DB-kjøring via admin-script: `pnpm --filter @workspace/scripts run promote-admin --email=x` |
| Produksjon (backup) | Env var satt kun under én deploy, fjernes umiddelbart |

**Script-alternativ (sikrere for prod):**

```typescript
// scripts/src/promote-admin.ts
const email = process.argv[2];
if (!email) throw new Error("Usage: promote-admin <email>");

// Kjør promote + audit-log insert
// Ingen HTTP-kall — direkte DB-tilgang
```

### 7.4 Sekundær super_admin

Etter at første super_admin er opprettet:
- Tildel `support_admin` eller `billing_admin` via API (`POST /api/admin/users/:id/roles`)
- Tildel `super_admin` **kun via direkte DB eller bootstrap-script** — ikke via API
- Denne regelen håndheves i middleware: API kan ikke sette `super_admin`-rollen

---

## 8. Hva som IKKE skal implementeres ennå

| Hva | Avhenger av |
|-----|-------------|
| `payment_exemptions`-tabell og API | DB-migrasjon + Vipps-avklaring |
| `admin_audit_log`-tabell | DB-migrasjon |
| `support_access_sessions`-tabell | DB-migrasjon |
| `support_admin` og `billing_admin` i `users.role` | DB-migrasjon |
| Middleware for `support_access_session`-sjekk | Ny tabell |
| `/admin/users/:id` utvidet side | Ny tabell + nye API-endepunkter |
| `/admin/billing` side | `payment_exemptions` + audit-log |
| `/admin/support-access` side | `support_access_sessions` |
| Audit-logging på eksisterende `PATCH /admin/users/:id` | `admin_audit_log`-tabell |
| Rolleadministrasjon via API | `user_roles`-tabell eller enum-utvidelse |
| Bootstrap-script | Kan implementeres nå — lav risiko |
| Automatisk unntak-utløp (cron) | `payment_exemptions`-tabell |

---

## 9. Sikker implementasjonsrekkefølge

Når Phase 6 implementeres, følg denne rekkefølgen:

```
Steg 1: DB-migrasjon
  └── Legg til admin_audit_log, payment_exemptions, support_access_sessions
  └── Utvid users.role-enum

Steg 2: Backend-infrastruktur
  └── Admin audit-log middleware (loggfør alle admin-mutasjoner)
  └── Oppdater PATCH /admin/users/:id og /subscription med audit-logging
  └── Nye endepunkter: /exemptions, /support-access, /admin-audit-log

Steg 3: Bootstrap
  └── bootstrapAdmin.ts + promote-admin script

Steg 4: Mellomliggende roller
  └── requireSupportAdmin, requireBillingAdmin middleware
  └── Tilpasset tilgang per rute

Steg 5: Frontend
  └── Oppdater /admin med rollebasert visning
  └── Legg til /admin/users/:id med seksjonsoversikten over
  └── Legg til /admin/billing og /admin/support-access
```

---

## 10. Kritiske sikkerhetskrav (oppsummert)

```
✅ requireSuperAdmin re-sjekker DB — JWT-claim alene er ikke nok
✅ Admin-ruter eksponerer ikke privat garasjeinnhold i dag
✅ password_hash eksponeres ikke i noen admin-rute
✅ [Phase 6.5] admin_audit_logs-tabell opprettet i DB
✅ [Phase 6.5] PATCH /admin/users/:id logger user.activate / user.deactivate
✅ [Phase 6.5] PATCH /admin/users/:id/subscription logger billing.tier.change
✅ [Phase 6.5] Audit-helper redakterer tokens/secrets fra metadata
✅ [Phase 6.5] Audit-helper logger IP-adresse og user-agent

✅ [Phase 7] payment_exemptions-tabell opprettet i DB
✅ [Phase 7] GET/POST/DELETE /admin/users/:id/payment-exemption
✅ [Phase 7] Admin-UI: gi/trekke tilbake unntak i UserDetailPanel (med reason-krav)
✅ [Phase 7] billing.exemption.grant + billing.exemption.revoke audit-logges
✅ [Phase 7] isUserPaymentExempt() helper klar for billing-enforcement

🔴 MANGLER: billing-enforcement (feature gating basert på tier/unntak)
🔴 MANGLER: mellomliggende roller (support_admin, billing_admin)
🔴 MANGLER: support_access_session-protokoll for datatilgang
🔴 MANGLER: kvitteringsfilrestriksjoner i admin-kontekst
🔴 MANGLER: admin audit-log eksponert i frontend (/admin/audit-log bør vise admin_audit_logs, ikke kun klub-logg)

⚠️  x-user-token legacy JWT: ingen Clerk-kobling, ingen MFA, lang levetid (30d)
     → Plan: Fjern etter Clerk-admin-konsoll er konfigurert for intern tilgang
```

## 11. Phase 6.5 — Implementert (Juni 2026)

### Filer endret

| Fil | Endring |
|-----|---------|
| `lib/db/src/schema/adminAuditLogs.ts` | Ny — `admin_audit_logs`-skjema |
| `lib/db/src/schema/index.ts` | La til `export * from "./adminAuditLogs"` |
| `artifacts/api-server/src/lib/adminAudit.ts` | Ny — `logAdminAction`-helper |
| `artifacts/api-server/src/routes/admin.ts` | Audit-logging på to PATCH-ruter |

### Loggede handlinger (Phase 6.5)

| Action-kode | Trigger | Felter logget |
|-------------|---------|---------------|
| `user.activate` | `PATCH /admin/users/:id` med `isActive: true` | before/after `isActive`, targetEmail, reason (valgfri) |
| `user.deactivate` | `PATCH /admin/users/:id` med `isActive: false` | before/after `isActive`, targetEmail, reason (valgfri) |
| `billing.tier.change` | `PATCH /admin/users/:id/subscription` | before/after `subscriptionTier`, targetEmail, reason (valgfri) |

### Planlagte handlinger (Phase 7+)

| Action-kode | Avhenger av |
|-------------|-------------|
| `user.role.grant` / `user.role.revoke` | Rolle-utvidelse i `users.role` |
| `billing.exemption.grant` / `.revoke` | `payment_exemptions`-tabell |
| `support.session.start` / `.end` | `support_access_sessions`-tabell |
| `support.data.access` | `support_access_sessions`-middleware |
| `support.file.access` | Kvitteringsfil-restriksjoner |

### Sikkerhetspolicy for audit-helper

- **Fail-open:** Feil ved skriving til `admin_audit_logs` logger en feil men blokkerer ikke den underliggende admin-handlingen
- **Redaksjon:** Følgende nøkler redigeres alltid til `[REDACTED]` i metadata: `password`, `passwordHash`, `token`, `secret`, `stripeCustomerId`, `stripeSubscriptionId`, `vippsAgreementId`
- **IP-logging:** Leser `x-forwarded-for`-header (proxy-aware), faller tilbake til `socket.remoteAddress`

---

*Dokument utarbeidet som grunnlag for Phase 6-implementasjon. Alle skjema og API-spesifikasjoner er designutkast — ikke implementert ennå.*
