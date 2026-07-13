import { logger } from "./logger";

interface EnvSpec {
  key: string;
  required: boolean;
  redact?: boolean;
  description: string;
}

const ENV_SPEC: EnvSpec[] = [
  { key: "DATABASE_URL",                    required: true,  redact: true,  description: "PostgreSQL connection string" },
  { key: "CLERK_PUBLISHABLE_KEY",           required: true,  redact: false, description: "Clerk publishable key (safe to log prefix)" },
  { key: "CLERK_SECRET_KEY",                required: true,  redact: true,  description: "Clerk secret key" },
  { key: "SESSION_SECRET",                  required: true,  redact: true,  description: "JWT signing secret" },
  { key: "PORT",                            required: false, redact: false, description: "HTTP port (default 8080)" },
  { key: "REPLIT_DOMAINS",                  required: false, redact: false, description: "Comma-separated allowed CORS origins" },

  // ── Vipps integration ────────────────────────────────────────────────────
  // These are optional at startup. The Vipps module throws VippsNotConfiguredError
  // at runtime when any route requires them but they are absent.
  { key: "VIPPS_CLIENT_ID",                 required: false, redact: true,  description: "Vipps OAuth 2.0 client ID" },
  { key: "VIPPS_CLIENT_SECRET",             required: false, redact: true,  description: "Vipps OAuth 2.0 client secret" },
  { key: "VIPPS_SUBSCRIPTION_KEY",          required: false, redact: true,  description: "Vipps Ocp-Apim-Subscription-Key" },
  { key: "VIPPS_MERCHANT_SERIAL_NUMBER",    required: false, redact: false, description: "Vipps merchant serial number (MSN)" },
  { key: "VIPPS_ENVIRONMENT",               required: false, redact: false, description: "'test' or 'production' (default: test)" },
  { key: "VIPPS_CALLBACK_URL",              required: false, redact: false, description: "Backend URL for Vipps webhook deliveries" },
  { key: "VIPPS_RETURN_URL",                required: false, redact: false, description: "Frontend URL after Vipps agreement approval" },
  { key: "VIPPS_WEBHOOK_SECRET",            required: false, redact: true,  description: "Shared secret for webhook Authorization header" },

  // ── Billing enforcement ──────────────────────────────────────────────────
  // Set to 'true' only after Vipps end-to-end testing passes in the test environment.
  // When absent or 'false': subscription UI is shown, but access is never locked.
  { key: "BILLING_ENFORCEMENT_ENABLED",     required: false, redact: false, description: "Set 'true' to enforce paid-only access (go-live switch)" },
];

export function validateEnv(): void {
  const missing: string[] = [];

  for (const spec of ENV_SPEC) {
    const value = process.env[spec.key];
    if (spec.required && !value) {
      missing.push(spec.key);
      logger.error({ envKey: spec.key }, `Required environment variable missing: ${spec.key} — ${spec.description}`);
    } else if (value) {
      const display = spec.redact
        ? `${spec.key}=***`
        : `${spec.key}=${value.slice(0, 12)}${value.length > 12 ? "…" : ""}`;
      logger.info({ envKey: spec.key }, `Env OK: ${display}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Server startup aborted — missing required environment variables: ${missing.join(", ")}. ` +
      "Set them in the Replit Secrets panel before starting.",
    );
  }
}
