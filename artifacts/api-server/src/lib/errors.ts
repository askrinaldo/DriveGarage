export const ERRORS = {
  NOT_FOUND: "Ikke funnet",
  UNAUTHORIZED: "Ikke autorisert",
  FORBIDDEN: "Ingen tilgang",
  BAD_REQUEST: "Ugyldig forespørsel",
  VALIDATION_ERROR: "Valideringsfeil",
  CONFLICT: "Ressursen finnes allerede",
  INTERNAL: "En intern feil oppstod. Prøv igjen.",
} as const;

/**
 * Structured application error that carries an HTTP status code.
 * Throw this from route handlers — Express 5 will propagate the rejection
 * to the global error handler automatically.
 *
 * 4xx AppErrors surface their message to the client in all environments.
 * 5xx AppErrors are treated as internal errors (message hidden in production).
 *
 * Optional `meta` is merged into the JSON response body alongside `error`.
 * Use it for structured payloads that need extra fields (e.g. a fair-use
 * limit response that includes `code`, `feature`, `limit`, and `upgradeUrl`).
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ─── DB / driver error detection ─────────────────────────────────────────────

/**
 * Node.js network/OS error codes produced by the pg driver when the database
 * is unreachable, the connection is dropped, or TLS fails.
 */
const NODE_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "ETIMEDOUT",
  "EPIPE",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

/**
 * Known error class names from the pg ecosystem.
 *
 *   - pg-protocol  → DatabaseError
 *   - postgres.js  → PostgresError
 *   - Drizzle      → DrizzleError, NeonDbError
 */
const DB_ERROR_NAMES = new Set([
  "DatabaseError",
  "PostgresError",
  "DrizzleError",
  "NeonDbError",
]);

/**
 * Returns true for any error that originates from the pg/postgres driver,
 * Drizzle ORM, or a network failure while talking to the database.
 *
 * Covers:
 *   1. pg-protocol SQLSTATE errors  (5-char alphanumeric code + severity)
 *   2. Node.js connection errors     (ECONNRESET, ECONNREFUSED, ETIMEDOUT …)
 *   3. Named pg/Drizzle error types  (DatabaseError, PostgresError, …)
 *   4. Full cause-chain traversal    (Drizzle often wraps the original error)
 */
export function isDatabaseError(err: unknown, depth = 0): boolean {
  if (!err || typeof err !== "object" || depth > 5) return false;
  const e = err as Record<string, unknown>;

  if (matchesDbError(e)) return true;

  const cause = e["cause"];
  if (cause) return isDatabaseError(cause, depth + 1);

  return false;
}

function matchesDbError(e: Record<string, unknown>): boolean {
  const name = typeof e["name"] === "string" ? e["name"] : "";
  const code = typeof e["code"] === "string" ? e["code"] : "";

  if (DB_ERROR_NAMES.has(name)) return true;
  if (NODE_NETWORK_CODES.has(code)) return true;

  if (
    /^[0-9A-Z]{5}$/.test(code) &&
    typeof e["severity"] === "string"
  ) return true;

  return false;
}
