/**
 * Integration tests for the global error handler in src/app.ts.
 *
 * These tests import the REAL app from app.ts so any future refactor of the
 * error handler will be caught immediately if it breaks the Norwegian-message
 * contract or re-opens a DB-detail leak.
 *
 * Strategy:
 *   - Set required env vars before any module loads (validateEnv reads them).
 *   - vi.mock hoisting registers all mocks before imports run.
 *   - ../routes is mocked with a single test endpoint whose throw behaviour is
 *     controlled by a module-scope `let _throwFn`. The route handler closes
 *     over the *binding* (not the value), so reassigning _throwFn between tests
 *     is seen by the handler immediately.
 *   - All external middleware (Clerk, DB-touching layers, rate limiter) are
 *     replaced with passthrough stubs so the app boots without real secrets.
 *
 * Scenarios covered:
 *   DB errors → 500 + exact { error: "En intern feil oppstod. Prøv igjen." }
 *     1. pg SQLSTATE error  (5-char code + severity)
 *     2. Node network error (ECONNRESET code)
 *     3. Named DatabaseError class (pg-protocol)
 *     4. Drizzle-wrapped cause chain
 *     5. Raw pg message MUST NOT appear in the response body
 *
 *   AppError 4xx → correct status + exact message passed through
 *     6. AppError(400) → ERRORS.BAD_REQUEST
 *     7. AppError(404) → ERRORS.NOT_FOUND
 *     8. AppError(403) → ERRORS.FORBIDDEN
 *     9. AppError(401) → ERRORS.UNAUTHORIZED
 *    10. AppError(409) → ERRORS.CONFLICT
 *    11. AppError(404, custom Norwegian string) → custom string verbatim
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";

// ─── Env stub — must be set before app.ts is imported ────────────────────────
// validateEnv() checks these four keys; setting stubs here satisfies it even
// though we also mock validateEnv below (belt-and-suspenders).
process.env["SESSION_SECRET"] = "test-session-secret-32chars-long!";
process.env["DATABASE_URL"] = "postgres://localhost/test_db";
process.env["CLERK_PUBLISHABLE_KEY"] = "pk_test_placeholder";
process.env["CLERK_SECRET_KEY"] = "sk_test_placeholder";

// ─── Throw-function controller ────────────────────────────────────────────────
// The mocked ../routes handler closes over this binding. Reassigning it per
// test causes the handler to throw a different error each time.
let _throwFn: (() => never) | null = null;

// ─── Mocks (hoisted by Vitest transformer before imports) ────────────────────

// Make validateEnv() a no-op so app.ts boots in any environment.
vi.mock("../lib/envValidation", () => ({ validateEnv: () => {} }));

// Clerk middleware — passthrough (no real Clerk session in tests).
vi.mock("@clerk/express", () => ({
  clerkMiddleware:
    () =>
    (_req: unknown, _res: unknown, next: () => void) =>
      next(),
}));

// Clerk proxy middleware — passthrough (prod-only feature, irrelevant here).
vi.mock("../middleware/clerkProxyMiddleware", () => ({
  CLERK_PROXY_PATH: "/api/__clerk_test",
  clerkProxyMiddleware:
    () =>
    (_req: unknown, _res: unknown, next: () => void) =>
      next(),
}));

// Club JWT auth middleware — passthrough.
vi.mock("../middleware/auth", () => ({
  parseAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  resolveClubActorFromUser: (_req: unknown, _res: unknown, next: () => void) =>
    next(),
}));

// User JWT auth middleware — passthrough.
vi.mock("../middleware/userAuth", () => ({
  parseUserAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Clerk → user provisioning middleware — passthrough (needs real Clerk + DB).
vi.mock("../middleware/clerkUserAuth", () => ({
  clerkUserAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Rate limiters — passthrough (skipping limits keeps tests fast & deterministic).
vi.mock("../middleware/rateLimiter", () => ({
  globalRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  writeRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Billing access gate — passthrough (no subscriptions table in test).
vi.mock("../middleware/billingAccess", () => ({
  requirePaidAccess: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Routes — replace the full router with a single test endpoint.
// The handler closes over `_throwFn` by reference; reassigning it between
// tests is reflected immediately without reloading the module.
vi.mock("../routes", async () => {
  const { default: express } = await import("express");
  const router = express.Router();

  router.get(
    "/test-error",
    (
      _req: unknown,
      res: { status: (n: number) => { json: (b: unknown) => void } },
      next: (err?: unknown) => void,
    ) => {
      if (_throwFn === null) {
        res.status(200).json({ ok: true });
        return;
      }
      try {
        _throwFn();
      } catch (err) {
        next(err);
      }
    },
  );

  return { default: router };
});

// ─── Import real app (after all mocks are registered) ─────────────────────────

let app: Express;

beforeAll(async () => {
  const { default: realApp } = await import("../app");
  app = realApp;
});

beforeEach(() => {
  _throwFn = null;
});

// ─── Error factories ──────────────────────────────────────────────────────────

function pgSqlstateError() {
  const err = new Error(
    "duplicate key value violates unique constraint",
  ) as Error & { code: string; severity: string };
  err.code = "23505"; // 5-char SQLSTATE — unique violation
  err.severity = "ERROR";
  return err;
}

function nodeNetworkError() {
  const err = new Error("connect ECONNRESET") as Error & { code: string };
  err.code = "ECONNRESET";
  return err;
}

function namedDatabaseError() {
  const err = new Error("column users.foo does not exist");
  err.name = "DatabaseError"; // pg-protocol class name
  return err;
}

function drizzleWrappedError() {
  const inner = pgSqlstateError();
  const outer = new Error("Drizzle query failed") as Error & {
    cause: unknown;
  };
  outer.name = "DrizzleError";
  outer.cause = inner;
  return outer;
}

// ─── Test suites ──────────────────────────────────────────────────────────────

describe("Global error handler — database errors → ERRORS.INTERNAL", () => {
  it("pg SQLSTATE error (5-char code + severity) returns 500 with safe Norwegian message", async () => {
    _throwFn = () => {
      throw pgSqlstateError();
    };
    const res = await request(app).get("/api/test-error");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "En intern feil oppstod. Prøv igjen." });
  });

  it("Node network error (ECONNRESET) returns 500 with safe Norwegian message", async () => {
    _throwFn = () => {
      throw nodeNetworkError();
    };
    const res = await request(app).get("/api/test-error");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "En intern feil oppstod. Prøv igjen." });
  });

  it("named DatabaseError class returns 500 with safe Norwegian message", async () => {
    _throwFn = () => {
      throw namedDatabaseError();
    };
    const res = await request(app).get("/api/test-error");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "En intern feil oppstod. Prøv igjen." });
  });

  it("Drizzle-wrapped pg error (cause chain) returns 500 with safe Norwegian message", async () => {
    _throwFn = () => {
      throw drizzleWrappedError();
    };
    const res = await request(app).get("/api/test-error");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "En intern feil oppstod. Prøv igjen." });
  });

  it("database error body does NOT contain the raw pg error message or code", async () => {
    _throwFn = () => {
      throw pgSqlstateError();
    };
    const res = await request(app).get("/api/test-error");

    const body = JSON.stringify(res.body);
    expect(body).not.toContain("duplicate key");
    expect(body).not.toContain("23505");
    expect(body).not.toContain("unique constraint");
  });
});

describe("Global error handler — AppError 4xx → message passed through", () => {
  it("AppError(400) returns 400 with ERRORS.BAD_REQUEST", async () => {
    const { AppError, ERRORS } = await import("../lib/errors");
    _throwFn = () => {
      throw new AppError(400, ERRORS.BAD_REQUEST);
    };
    const res = await request(app).get("/api/test-error");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Ugyldig forespørsel");
  });

  it("AppError(404) returns 404 with ERRORS.NOT_FOUND", async () => {
    const { AppError, ERRORS } = await import("../lib/errors");
    _throwFn = () => {
      throw new AppError(404, ERRORS.NOT_FOUND);
    };
    const res = await request(app).get("/api/test-error");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Ikke funnet");
  });

  it("AppError(403) returns 403 with ERRORS.FORBIDDEN", async () => {
    const { AppError, ERRORS } = await import("../lib/errors");
    _throwFn = () => {
      throw new AppError(403, ERRORS.FORBIDDEN);
    };
    const res = await request(app).get("/api/test-error");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Ingen tilgang");
  });

  it("AppError(401) returns 401 with ERRORS.UNAUTHORIZED", async () => {
    const { AppError, ERRORS } = await import("../lib/errors");
    _throwFn = () => {
      throw new AppError(401, ERRORS.UNAUTHORIZED);
    };
    const res = await request(app).get("/api/test-error");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Ikke autorisert");
  });

  it("AppError(409) returns 409 with ERRORS.CONFLICT", async () => {
    const { AppError, ERRORS } = await import("../lib/errors");
    _throwFn = () => {
      throw new AppError(409, ERRORS.CONFLICT);
    };
    const res = await request(app).get("/api/test-error");

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Ressursen finnes allerede");
  });

  it("AppError 4xx with a custom Norwegian message surfaces that exact string", async () => {
    const { AppError } = await import("../lib/errors");
    const customMsg = "Kjøretøyet ble ikke funnet";
    _throwFn = () => {
      throw new AppError(404, customMsg);
    };
    const res = await request(app).get("/api/test-error");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe(customMsg);
  });
});
