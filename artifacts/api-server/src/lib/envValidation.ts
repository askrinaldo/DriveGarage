import { logger } from "./logger";

interface EnvSpec {
  key: string;
  required: boolean;
  redact?: boolean;
  description: string;
}

const ENV_SPEC: EnvSpec[] = [
  { key: "DATABASE_URL",          required: true,  redact: true,  description: "PostgreSQL connection string" },
  { key: "CLERK_PUBLISHABLE_KEY", required: true,  redact: false, description: "Clerk publishable key (safe to log prefix)" },
  { key: "CLERK_SECRET_KEY",      required: true,  redact: true,  description: "Clerk secret key" },
  { key: "SESSION_SECRET",        required: true,  redact: true,  description: "JWT signing secret" },
  { key: "PORT",                  required: false, redact: false, description: "HTTP port (default 8080)" },
  { key: "REPLIT_DOMAINS",        required: false, redact: false, description: "Comma-separated allowed CORS origins" },
  // Vipps integration — not yet active. Keys will be added here when Vipps is integrated.
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
      "Set them in the Replit Secrets panel before starting."
    );
  }
}
