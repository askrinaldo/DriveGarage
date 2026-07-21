/**
 * Integration tests for register, login, and preferences PATCH routes.
 *
 * Tests verify that the `validate()` middleware does NOT block valid payloads,
 * and that the routes produce the correct HTTP status codes end-to-end.
 *
 * Strategy: mount only the userAuth router on a minimal Express app.
 * The DB and bcryptjs modules are mocked so tests run without a real database.
 */

import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// ─── Environment setup ────────────────────────────────────────────────────────
// SESSION_SECRET is required by signUserToken / verifyUserToken.
// Must be set before the router module is imported.
process.env["SESSION_SECRET"] = "test-session-secret-for-vitest-only";

// ─── Mock @workspace/db ───────────────────────────────────────────────────────
// We stub out every table reference and the `db` query builder used by the routes.
const mockDbSelect   = vi.fn();
const mockDbInsert   = vi.fn();
const mockDbUpdate   = vi.fn();

vi.mock("@workspace/db", () => {
  const makeChain = (finalValue: unknown) => {
    const chain: Record<string, unknown> = {};
    const noop = () => chain;
    chain.from       = noop;
    chain.where      = noop;
    chain.returning  = () => Promise.resolve(finalValue);
    chain.values     = () => ({
      returning: () => Promise.resolve(finalValue),
    });
    chain.set        = () => ({
      where: () => ({
        returning: () => Promise.resolve(finalValue),
      }),
    });
    return chain;
  };

  const db = {
    select:  (...args: unknown[]) => mockDbSelect(...args),
    insert:  (...args: unknown[]) => mockDbInsert(...args),
    update:  (...args: unknown[]) => mockDbUpdate(...args),
  };

  return {
    db,
    usersTable:            { id: "id", email: "email", name: "name", role: "role", passwordHash: "passwordHash", isActive: "isActive", themeAccent: "themeAccent", themeMode: "themeMode", updatedAt: "updatedAt" },
    tenantsTable:          { id: "id", name: "name", slug: "slug", isPersonal: "isPersonal", ownerUserId: "ownerUserId" },
    tenantMembershipsTable:{ id: "id", tenantId: "tenantId", userId: "userId", role: "role" },
    clubsTable:            {},
    vehiclesTable:         {},
    forumPostsTable:       {},
    forumCommentsTable:    {},
    eq:  vi.fn((_a: unknown, _b: unknown) => true),
    and: vi.fn((..._args: unknown[]) => true),
    desc: vi.fn((_a: unknown) => _a),
    count: vi.fn(() => ({})),
  };
});

// ─── Mock bcryptjs ────────────────────────────────────────────────────────────
vi.mock("bcryptjs", () => ({
  default: {
    hash:    vi.fn(async (pw: string) => `hashed:${pw}`),
    compare: vi.fn(async (_pw: string, _hash: string) => false), // default: wrong password
  },
}));

// ─── Mock auth-adjacent middlewares that need external services ───────────────
// clerkMiddleware, parseAuth, clerkUserAuth, resolveClubActorFromUser, requirePaidAccess
// are NOT part of what we're testing here and pull in Clerk/env dependencies.
vi.mock("../middleware/clerkUserAuth", () => ({
  clerkUserAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../middleware/auth", () => ({
  parseAuth:                  (_req: unknown, _res: unknown, next: () => void) => next(),
  resolveClubActorFromUser:   (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../middleware/billingAccess", () => ({
  requirePaidAccess: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../middleware/rateLimiter", () => ({
  globalRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  writeRateLimit:  (_req: unknown, _res: unknown, next: () => void) => next(),
  authRateLimit:   (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// ─── Build a minimal test Express app ────────────────────────────────────────
// We do NOT import app.ts — it calls validateEnv() which throws without real secrets.
// Instead we wire up only the pieces needed to test the userAuth router.

async function buildTestApp() {
  const [
    { default: userAuthRouter },
    { parseUserAuth },
  ] = await Promise.all([
    import("../routes/userAuth"),
    import("../middleware/userAuth"),
  ]);

  const app = express();
  app.use(express.json());
  app.use(parseUserAuth);         // populates req.userAuth from x-user-token header
  app.use("/api", userAuthRouter);
  return app;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PERSONAL_TENANT = {
  id:         1,
  name:       "Test User's Garasje",
  slug:       "personal-1",
  isPersonal: true,
};

/**
 * Configure db mocks for a successful "no existing user" registration scenario.
 */
function mockDbForRegister(opts: { existingUser?: boolean } = {}) {
  mockDbSelect.mockImplementation(() => ({
    from: () => ({
      where: () =>
        Promise.resolve(
          opts.existingUser
            ? [{ id: 99 }]   // duplicate e-mail
            : [],             // new user — no conflict
        ),
    }),
  }));

  mockDbInsert.mockImplementation((_table: unknown) => ({
    values: (_values: unknown) => ({
      returning: () =>
        Promise.resolve([
          { id: 1, name: "Test User", email: "test@example.com", role: "user" },
        ]),
    }),
  }));
}

/**
 * Configure db mocks for a login scenario.
 */
function mockDbForLogin(opts: {
  found?: boolean;
  isActive?: boolean;
  hasPasswordHash?: boolean;
  passwordHash?: string;
}) {
  const {
    found           = true,
    isActive        = true,
    hasPasswordHash = true,
    passwordHash    = "hashed:correct-password",
  } = opts;

  let callCount = 0;

  mockDbSelect.mockImplementation(() => ({
    from: () => ({
      where: () => {
        callCount += 1;
        if (callCount === 1) {
          // First call: look up user by email
          if (!found) return Promise.resolve([]);
          return Promise.resolve([
            {
              id:           1,
              name:         "Test User",
              email:        "test@example.com",
              role:         "user",
              isActive,
              passwordHash: hasPasswordHash ? passwordHash : null,
              themeAccent:  null,
              themeMode:    null,
            },
          ]);
        }
        // Second call: getOrCreatePersonalTenant → look up tenant by slug
        return Promise.resolve([PERSONAL_TENANT]);
      },
    }),
  }));

  // No INSERT needed if tenant already exists
  mockDbInsert.mockImplementation((_table: unknown) => ({
    values: (_v: unknown) => ({
      returning: () => Promise.resolve([PERSONAL_TENANT]),
    }),
  }));
}

/**
 * Configure db mocks for a "user found + active" check used by requireUser,
 * plus a tenant lookup for getOrCreatePersonalTenant.
 */
function mockDbForPreferences(userId: number) {
  let selectCallCount = 0;

  mockDbSelect.mockImplementation(() => ({
    from: () => ({
      where: () => {
        selectCallCount += 1;
        if (selectCallCount === 1) {
          // requireUser: isActive check
          return Promise.resolve([{ isActive: true, role: "user" }]);
        }
        // subsequent: tenant lookup (should not be needed here but kept safe)
        return Promise.resolve([PERSONAL_TENANT]);
      },
    }),
  }));

  mockDbUpdate.mockImplementation((_table: unknown) => ({
    set: (_values: unknown) => ({
      where: () => ({
        returning: () =>
          Promise.resolve([{ themeAccent: null, themeMode: "dark" }]),
      }),
    }),
  }));

  // Suppress unused variable warning
  void userId;
}

// ─── signUserToken helper (generates a valid token for auth'd requests) ───────
async function makeToken(userId = 1) {
  const { signUserToken } = await import("../middleware/userAuth");
  return signUserToken({
    userId,
    email:           "test@example.com",
    name:            "Test User",
    role:            "user",
    tenantId:        1,
    tenantName:      "Test User's Garasje",
    tenantRole:      "owner",
    isPersonalTenant: true,
  });
}

// ─── Test suites ──────────────────────────────────────────────────────────────

describe("POST /api/users/register", () => {
  let app: express.Express;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("201 + token for a valid payload", async () => {
    mockDbForRegister();

    const { default: bcrypt } = await import("bcryptjs");
    (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValueOnce("hashed:Secret123");

    const res = await request(app)
      .post("/api/users/register")
      .send({ name: "Test User", email: "test@example.com", password: "Secret123" });

    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.role).toBe("user");
  });

  it("400 when name is missing (validate middleware fires)", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ email: "test@example.com", password: "Secret123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("400 when email is invalid (validate middleware fires)", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ name: "Test User", email: "not-an-email", password: "Secret123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("400 when password is too short (validate middleware fires)", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ name: "Test User", email: "test@example.com", password: "123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("409 when email is already registered", async () => {
    mockDbForRegister({ existingUser: true });

    const res = await request(app)
      .post("/api/users/register")
      .send({ name: "Test User", email: "test@example.com", password: "Secret123" });

    expect(res.status).toBe(409);
  });
});

describe("POST /api/users/login", () => {
  let app: express.Express;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 + token for correct credentials", async () => {
    mockDbForLogin({ passwordHash: "hashed:correct-password" });

    const { default: bcrypt } = await import("bcryptjs");
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "test@example.com", password: "correct-password" });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("401 (not 400) for wrong password — validate middleware does NOT interfere", async () => {
    mockDbForLogin({ passwordHash: "hashed:correct-password" });

    const { default: bcrypt } = await import("bcryptjs");
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "test@example.com", password: "wrong-password" });

    // Critical: must be 401, never 400 (which would indicate validate() blocking a valid-shaped payload)
    expect(res.status).toBe(401);
    expect(res.body.error).not.toBe("validation_error");
  });

  it("401 when user does not exist", async () => {
    mockDbForLogin({ found: false });

    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "nobody@example.com", password: "anything" });

    expect(res.status).toBe(401);
  });

  it("403 when account is deactivated", async () => {
    mockDbForLogin({ isActive: false });

    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "test@example.com", password: "correct-password" });

    expect(res.status).toBe(403);
  });

  it("400 when email is missing (validate middleware fires)", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ password: "Secret123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("400 when password field is missing (validate middleware fires)", async () => {
    const res = await request(app)
      .post("/api/users/login")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });
});

describe("PATCH /api/users/me/preferences", () => {
  let app: express.Express;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 with valid themeMode — validate middleware passes through", async () => {
    mockDbForPreferences(1);
    const token = await makeToken(1);

    const res = await request(app)
      .patch("/api/users/me/preferences")
      .set("x-user-token", token)
      .send({ themeMode: "dark" });

    expect(res.status).toBe(200);
    expect(res.body.themeMode).toBe("dark");
  });

  it("200 with valid themeAccent", async () => {
    mockDbForPreferences(1);
    const token = await makeToken(1);

    const res = await request(app)
      .patch("/api/users/me/preferences")
      .set("x-user-token", token)
      .send({ themeAccent: "kobber" });

    expect(res.status).toBe(200);
  });

  it("400 when themeMode has an invalid value (validate middleware fires)", async () => {
    mockDbForPreferences(1);
    const token = await makeToken(1);

    const res = await request(app)
      .patch("/api/users/me/preferences")
      .set("x-user-token", token)
      .send({ themeMode: "rainbow" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("400 when an unknown field is sent (strict schema)", async () => {
    mockDbForPreferences(1);
    const token = await makeToken(1);

    const res = await request(app)
      .patch("/api/users/me/preferences")
      .set("x-user-token", token)
      .send({ unknownField: "value" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("401 without authentication token", async () => {
    const res = await request(app)
      .patch("/api/users/me/preferences")
      .send({ themeMode: "dark" });

    expect(res.status).toBe(401);
  });
});
