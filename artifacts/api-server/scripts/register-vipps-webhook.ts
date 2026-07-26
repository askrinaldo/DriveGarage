#!/usr/bin/env tsx
/**
 * One-time script: register the production Vipps webhook.
 *
 * Usage:
 *   WEBHOOK_URL=https://your-domain.replit.app/api/billing/vipps/webhook \
 *   tsx artifacts/api-server/scripts/register-vipps-webhook.ts
 *
 * Required environment variables (all must be set to production values):
 *   VIPPS_CLIENT_ID
 *   VIPPS_CLIENT_SECRET
 *   VIPPS_SUBSCRIPTION_KEY
 *   VIPPS_MERCHANT_SERIAL_NUMBER
 *   VIPPS_ENVIRONMENT   (set to "production")
 *   WEBHOOK_URL         (the public URL Vipps will POST events to)
 *
 * Output:
 *   Webhook ID    — save this if you need to query or delete the registration
 *   Webhook Secret — save to VIPPS_WEBHOOK_SECRET in Replit Secrets immediately
 *   Registered URL — confirm this matches your production domain
 *
 * The secret is shown ONCE. Vipps does not expose it again after this call.
 */

// ── env validation ─────────────────────────────────────────────────────────────

const REQUIRED_ENV = [
  "VIPPS_CLIENT_ID",
  "VIPPS_CLIENT_SECRET",
  "VIPPS_SUBSCRIPTION_KEY",
  "VIPPS_MERCHANT_SERIAL_NUMBER",
  "VIPPS_ENVIRONMENT",
  "WEBHOOK_URL",
] as const;

const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`\n❌  Missing required environment variables:\n  ${missing.join("\n  ")}\n`);
  process.exit(1);
}

const env = process.env.VIPPS_ENVIRONMENT;
if (env !== "production") {
  console.warn(`\n⚠️  VIPPS_ENVIRONMENT is "${env}", not "production".`);
  console.warn("   This script is intended for production registration.\n");
}

const webhookUrl = process.env.WEBHOOK_URL!;

// ── Vipps access token ─────────────────────────────────────────────────────────

const BASE_URL = env === "production"
  ? "https://api.vipps.no"
  : "https://apitest.vipps.no";

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/accesstoken/get`, {
    method: "POST",
    headers: {
      "Content-Type":              "application/json",
      "client_id":                 process.env.VIPPS_CLIENT_ID!,
      "client_secret":             process.env.VIPPS_CLIENT_SECRET!,
      "Ocp-Apim-Subscription-Key": process.env.VIPPS_SUBSCRIPTION_KEY!,
      "Merchant-Serial-Number":    process.env.VIPPS_MERCHANT_SERIAL_NUMBER!,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Token fetch failed (HTTP ${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json() as { access_token?: string };
  if (!data.access_token) {
    throw new Error("No access_token in Vipps token response");
  }
  return data.access_token;
}

// ── Webhook registration ───────────────────────────────────────────────────────

const WEBHOOK_EVENTS = [
  "recurring.agreement-activated.v1",
  "recurring.agreement-stopped.v1",
  "recurring.agreement-expired.v1",
  "recurring.agreement-rejected.v1",
  "recurring.charge-reserved.v1",
  "recurring.charge-captured.v1",
  "recurring.charge-failed.v1",
  "recurring.charge-canceled.v1",
  "recurring.charge-refunded.v1",
];

interface RegisterWebhookResponse {
  id: string;
  secret: string;
}

async function registerWebhook(token: string): Promise<RegisterWebhookResponse> {
  const res = await fetch(`${BASE_URL}/webhooks/v1/webhooks`, {
    method: "POST",
    headers: {
      "Authorization":              `Bearer ${token}`,
      "Ocp-Apim-Subscription-Key":  process.env.VIPPS_SUBSCRIPTION_KEY!,
      "Merchant-Serial-Number":     process.env.VIPPS_MERCHANT_SERIAL_NUMBER!,
      "Content-Type":               "application/json",
      // System identification — required by Vipps spec
      "Vipps-System-Name":          "drivegarage",
      "Vipps-System-Version":       "1.0",
      "Vipps-System-Plugin-Name":   "drivegarage-api",
      "Vipps-System-Plugin-Version": "1.0",
    },
    body: JSON.stringify({
      url:    webhookUrl,
      events: WEBHOOK_EVENTS,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text(); }
    throw new Error(`Webhook registration failed (HTTP ${res.status}): ${JSON.stringify(body).slice(0, 400)}`);
  }

  return res.json() as Promise<RegisterWebhookResponse>;
}

// ── Main ───────────────────────────────────────────────────────────────────────

(async () => {
  console.log(`\n🔗  Registering Vipps webhook...`);
  console.log(`    Environment : ${env}`);
  console.log(`    Base URL    : ${BASE_URL}`);
  console.log(`    Webhook URL : ${webhookUrl}`);
  console.log(`    Events      : ${WEBHOOK_EVENTS.length} event types\n`);

  let token: string;
  try {
    console.log("⏳  Fetching access token...");
    token = await getAccessToken();
    console.log("✅  Access token obtained.\n");
  } catch (err) {
    console.error("❌  Failed to get access token:", (err as Error).message);
    process.exit(1);
  }

  let result: RegisterWebhookResponse;
  try {
    console.log("⏳  Calling POST /webhooks/v1/webhooks...");
    result = await registerWebhook(token);
  } catch (err) {
    console.error("❌  Webhook registration failed:", (err as Error).message);
    process.exit(1);
  }

  console.log("✅  Webhook registered successfully!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Webhook ID     : ${result.id}`);
  console.log(`  Webhook Secret : ${result.secret}`);
  console.log(`  Registered URL : ${webhookUrl}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`
⚠️  IMPORTANT — save the secret now:
   The Webhook Secret above is shown ONLY once.
   Vipps will NOT show it again after this script finishes.

   Add it to Replit Secrets immediately:
     Key  : VIPPS_WEBHOOK_SECRET
     Value: ${result.secret}

   Then restart the API Server workflow.
`);
})();
