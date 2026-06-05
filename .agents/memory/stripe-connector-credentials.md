---
name: Stripe connector credentials
description: How to read Stripe API key from Replit connector API — the settings key name and migration order
---

The Replit Stripe connector returns settings with these keys:
`account_id`, `secret`, `publishable`, `mcp`, `claim_url`

The secret key is at `settings.secret` — NOT `settings.secret_key` (as shown in the skill template).

**Why:** The skill code template uses `secret_key` but the actual Replit connector for Stripe uses `secret`.

**How to apply:** In any stripeClient.ts file, use `settings.secret` when reading the API key from the connector response.

Also important — startup order for stripe-replit-sync:
1. `runMigrations({ databaseUrl })` — must run ONCE to create the `stripe` schema. Idempotent, safe to run every startup.
2. `getStripeSync()` — create the StripeSync instance (credentials fetched fresh)
3. `sync.findOrCreateManagedWebhook(url)` — registers the webhook endpoint with Stripe
4. `sync.syncBackfill()` — syncs existing Stripe data to the database

If migrations haven't run yet, `syncBackfill` fails with `relation "stripe.accounts" does not exist`.
Run migrations manually from bash if needed: `node --input-type=module -e "import { runMigrations } from 'stripe-replit-sync'; await runMigrations({ databaseUrl: process.env.DATABASE_URL });"`
