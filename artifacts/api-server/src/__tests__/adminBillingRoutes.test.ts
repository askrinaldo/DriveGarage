/**
 * Smoke tests for the three admin billing routes:
 *   GET /api/admin/billing-stats
 *   GET /api/admin/mrr-history
 *   GET /api/admin/billing/charges
 *
 * Strategy: mount only the admin router on a minimal Express app; mock
 * @workspace/db so no real database connection is required.  Tests confirm:
 *   - 200 + correct response shape for authenticated super_admin requests
 *   - 401 when the request carries no token
 *   - 403 when the token belongs to a regular user (not super_admin)
 */

import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// ─── Environment setup ────────────────────────────────────────────────────────
process.env["SESSION_SECRET"] = "test-session-secret-for-billing-tests";

// ─── Mock @workspace/db ───────────────────────────────────────────────────────
const mockDbSelect  = vi.fn();
const mockDbExecute = vi.fn();

vi.mock("@workspace/db", () => {
  const db = {
    select:  (...args: unknown[]) => mockDbSelect(...args),
    execute: (...args: unknown[]) => mockDbExecute(...args),
    // Billing-charges route uses a fluent chain: select().from().where().orderBy().limit()
  };

  const tableStub = new Proxy({}, { get: () => "col" });

  return {
    db,
    usersTable:              tableStub,
    vehiclesTable:           tableStub,
    subscriptionsTable:      tableStub,
    subscriptionEventsTable: tableStub,
    billingChargesTable:     tableStub,
    auditLogsTable:          tableStub,
    clubsTable:              tableStub,
    tenantsTable:            tableStub,
    tenantMembershipsTable:  tableStub,
    eq:    vi.fn((_a: unknown, _b: unknown) => true),
    and:   vi.fn((..._a: unknown[]) => true),
    desc:  vi.fn((_a: unknown) => _a),
    count: vi.fn(() => ({})),
    gte:   vi.fn((_a: unknown, _b: unknown) => true),
    sql:   Object.assign(vi.fn((..._a: unknown[]) => ({})), { raw: vi.fn() }),
  };
});

// ─── Mock billing lib ─────────────────────────────────────────────────────────
vi.mock("../lib/billing/monthlyCharges", () => ({
  currentBillingPeriod: () => "2026-07",
  runMonthlyBillingJob: vi.fn(),
  reconcileCharges:     vi.fn(),
}));

// ─── Mock payment-exemptions lib ─────────────────────────────────────────────
vi.mock("../lib/paymentExemptions", () => ({
  getActivePaymentExemptionForUser: vi.fn(),
  createPaymentExemption:           vi.fn(),
  revokePaymentExemption:           vi.fn(),
  NoActiveExemptionError:           class NoActiveExemptionError extends Error {},
}));

// ─── Mock adminAudit ──────────────────────────────────────────────────────────
vi.mock("../lib/adminAudit", () => ({
  logAdminAction: vi.fn(),
}));

// ─── Mock middleware that drags in external services ─────────────────────────
vi.mock("../middleware/clerkUserAuth", () => ({
  clerkUserAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../middleware/auth", () => ({
  parseAuth:                (_req: unknown, _res: unknown, next: () => void) => next(),
  resolveClubActorFromUser: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../middleware/billingAccess", () => ({
  requirePaidAccess: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../middleware/rateLimiter", () => ({
  globalRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  writeRateLimit:  (_req: unknown, _res: unknown, next: () => void) => next(),
  authRateLimit:   (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// ─── Fluent chain builder for db.select() ────────────────────────────────────
/**
 * Returns a chainable object that resolves to `value` at .from().where()
 * and also supports the longer chain used by billing/charges:
 *   .from().where().orderBy().limit()  → Promise<value>
 */
function makeSelectChain(value: unknown) {
  const chain: Record<string, unknown> = {};
  const terminal = () => Promise.resolve(value);
  chain.from    = () => chain;
  chain.where   = () => chain;
  chain.orderBy = () => chain;
  chain.limit   = terminal;
  // Also support .from().where() resolving directly (billing-stats uses this)
  Object.defineProperty(chain, "then", {
    get() {
      return (resolve: (v: unknown) => unknown) => resolve(value);
    },
  });
  return chain;
}

// ─── Build a minimal test app ─────────────────────────────────────────────────
async function buildTestApp() {
  const [{ default: adminRouter }, { parseUserAuth }] = await Promise.all([
    import("../routes/admin"),
    import("../middleware/userAuth"),
  ]);

  const app = express();
  app.use(express.json());
  app.use(parseUserAuth);
  app.use("/api", adminRouter);
  return app;
}

// ─── Token helpers ────────────────────────────────────────────────────────────
async function makeSuperAdminToken() {
  const { signUserToken } = await import("../middleware/userAuth");
  return signUserToken({
    userId:           99,
    email:            "admin@example.com",
    name:             "Super Admin",
    role:             "super_admin",
    tenantId:         1,
    tenantName:       "Admin's Garasje",
    tenantRole:       "owner",
    isPersonalTenant: true,
  });
}

async function makeUserToken() {
  const { signUserToken } = await import("../middleware/userAuth");
  return signUserToken({
    userId:           1,
    email:            "user@example.com",
    name:             "Regular User",
    role:             "user",
    tenantId:         2,
    tenantName:       "User's Garasje",
    tenantRole:       "owner",
    isPersonalTenant: true,
  });
}

// ─── DB mock helpers ──────────────────────────────────────────────────────────

/**
 * Set up db.select so that requireSuperAdmin's "check DB role" resolves to
 * super_admin, and subsequent select calls (e.g. in the route body) also work.
 */
function mockDbAsSuperAdmin(selectResults: unknown[] = []) {
  let callCount = 0;
  mockDbSelect.mockImplementation(() => {
    callCount += 1;
    // First call: requireSuperAdmin checks isActive + role
    if (callCount === 1) {
      return makeSelectChain([{ isActive: true, role: "super_admin" }]);
    }
    // Subsequent calls: route-specific data
    return makeSelectChain(selectResults);
  });
}

/**
 * Set up db.select so that requireSuperAdmin's DB check returns "user" role,
 * causing a 403.
 */
function mockDbAsRegularUser() {
  mockDbSelect.mockImplementation(() =>
    makeSelectChain([{ isActive: true, role: "user" }]),
  );
}

// ─── Test suites ──────────────────────────────────────────────────────────────

describe("GET /api/admin/billing-stats", () => {
  let app: express.Express;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 with correct response shape for super_admin", async () => {
    // requireSuperAdmin DB check (call 1), then newUsersRow (call 2)
    let selectCall = 0;
    mockDbSelect.mockImplementation(() => {
      selectCall += 1;
      if (selectCall === 1) return makeSelectChain([{ isActive: true, role: "super_admin" }]);
      // newUsersRow
      return makeSelectChain([{ cnt: 3 }]);
    });

    // billing-stats uses db.execute for statusCounts and userGrowth
    let executeCall = 0;
    mockDbExecute.mockImplementation(() => {
      executeCall += 1;
      if (executeCall === 1) {
        // statusCounts query
        return Promise.resolve({ rows: [{ status: "active", cnt: 5 }, { status: "stopped", cnt: 2 }] });
      }
      // userGrowth query
      return Promise.resolve({ rows: [{ month: "Jun 26", month_date: new Date(), cnt: 8 }] });
    });

    const token = await makeSuperAdminToken();
    const res = await request(app)
      .get("/api/admin/billing-stats")
      .set("x-user-token", token);

    expect(res.status).toBe(200);
    // provider is always "vipps"
    expect(res.body.provider).toBe("vipps");
    // numeric aggregates
    expect(typeof res.body.newUsersThisMonth).toBe("number");
    expect(res.body.newUsersThisMonth).toBe(3);
    expect(typeof res.body.activeSubscriptions).toBe("number");
    expect(res.body.activeSubscriptions).toBe(5);
    expect(typeof res.body.mrr).toBe("number");
    expect(res.body.mrr).toBe(500); // 5 subs × 100 NOK
    expect(typeof res.body.arr).toBe("number");
    expect(res.body.arr).toBe(6000); // mrr × 12
    // statusCounts is an object
    expect(typeof res.body.statusCounts).toBe("object");
    expect(res.body.statusCounts.active).toBe(5);
    expect(res.body.statusCounts.stopped).toBe(2);
    // userGrowth is an array of { month, count }
    expect(Array.isArray(res.body.userGrowth)).toBe(true);
    expect(res.body.userGrowth[0]).toMatchObject({ month: expect.any(String), count: expect.any(Number) });
    // note field present
    expect(typeof res.body.note).toBe("string");
  });

  it("401 when no token is provided", async () => {
    const res = await request(app).get("/api/admin/billing-stats");
    expect(res.status).toBe(401);
  });

  it("403 when authenticated as regular user", async () => {
    mockDbAsRegularUser();
    const token = await makeUserToken();
    const res = await request(app)
      .get("/api/admin/billing-stats")
      .set("x-user-token", token);
    expect(res.status).toBe(403);
  });
});

describe("GET /api/admin/mrr-history", () => {
  let app: express.Express;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 with a 12-entry array for super_admin (all months filled)", async () => {
    mockDbAsSuperAdmin();
    // db.execute for the subscription_events query
    mockDbExecute.mockResolvedValue({ rows: [] }); // empty → all 12 months filled with zeroes

    const token = await makeSuperAdminToken();
    const res = await request(app)
      .get("/api/admin/mrr-history")
      .set("x-user-token", token);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Always returns exactly 12 months
    expect(res.body).toHaveLength(12);
    // Each entry has the required fields
    const entry = res.body[0];
    expect(typeof entry.month).toBe("string");
    expect(typeof entry.mrr).toBe("number");
    expect(typeof entry.newSubs).toBe("number");
    expect(typeof entry.churned).toBe("number");
  });

  it("200 and maps event rows to the correct month entries", async () => {
    mockDbAsSuperAdmin();
    // Return one real row that matches the current month
    const now = new Date();
    const label = now.toLocaleDateString("nb-NO", { month: "short", year: "2-digit" });
    mockDbExecute.mockResolvedValue({
      rows: [
        {
          month:      label,
          month_date: now,
          new_subs:   4,
          churned:    1,
        },
      ],
    });

    const token = await makeSuperAdminToken();
    const res = await request(app)
      .get("/api/admin/mrr-history")
      .set("x-user-token", token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(12);
    // The current month entry should reflect the seeded counts
    const currentEntry = res.body[res.body.length - 1];
    expect(currentEntry.newSubs).toBe(4);
    expect(currentEntry.churned).toBe(1);
  });

  it("query targets received_at (not created_at) — regression for column-name bug", async () => {
    mockDbAsSuperAdmin();

    let capturedQuery = "";
    mockDbExecute.mockImplementation((queryExpr: unknown) => {
      // The Drizzle sql tag produces an object; capture its string representation
      capturedQuery = JSON.stringify(queryExpr);
      return Promise.resolve({ rows: [] });
    });

    const token = await makeSuperAdminToken();
    await request(app)
      .get("/api/admin/mrr-history")
      .set("x-user-token", token);

    // The raw SQL passed to db.execute must reference received_at, never created_at
    expect(capturedQuery).not.toMatch(/created_at/);
    // Verify received_at IS referenced — the sql tag chunks contain the column name
    expect(capturedQuery).toMatch(/received_at/);
  });

  it("401 when no token is provided", async () => {
    const res = await request(app).get("/api/admin/mrr-history");
    expect(res.status).toBe(401);
  });

  it("403 when authenticated as regular user", async () => {
    mockDbAsRegularUser();
    const token = await makeUserToken();
    const res = await request(app)
      .get("/api/admin/mrr-history")
      .set("x-user-token", token);
    expect(res.status).toBe(403);
  });
});

describe("GET /api/admin/billing/charges", () => {
  let app: express.Express;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("200 with correct response shape (empty charges) for super_admin", async () => {
    // requireSuperAdmin DB call (call 1), charges select chain (call 2)
    let selectCall = 0;
    mockDbSelect.mockImplementation(() => {
      selectCall += 1;
      if (selectCall === 1) return makeSelectChain([{ isActive: true, role: "super_admin" }]);
      return makeSelectChain([]);
    });

    const token = await makeSuperAdminToken();
    const res = await request(app)
      .get("/api/admin/billing/charges")
      .set("x-user-token", token);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.charges)).toBe(true);
    expect(typeof res.body.count).toBe("number");
    expect(typeof res.body.currentPeriod).toBe("string");
    // currentBillingPeriod is mocked to return "2026-07"
    expect(res.body.currentPeriod).toBe("2026-07");
    expect(res.body.count).toBe(0);
  });

  it("200 with charge rows when billing_charges has data", async () => {
    const fakeCharge = {
      id:             1,
      subscriptionId: 10,
      userId:         2,
      billingPeriod:  "2026-07",
      orderId:        "dg-2-202607-1-abcd",
      vippsChargeId:  "chr_abc123",
      amountNok:      100,
      status:         "charged",
      dueDate:        new Date().toISOString(),
      chargedAt:      new Date().toISOString(),
      failedAt:       null,
      retryCount:     0,
      lastError:      null,
      createdAt:      new Date().toISOString(),
    };

    let selectCall = 0;
    mockDbSelect.mockImplementation(() => {
      selectCall += 1;
      if (selectCall === 1) return makeSelectChain([{ isActive: true, role: "super_admin" }]);
      return makeSelectChain([fakeCharge]);
    });

    const token = await makeSuperAdminToken();
    const res = await request(app)
      .get("/api/admin/billing/charges")
      .set("x-user-token", token);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.charges).toHaveLength(1);
    const charge = res.body.charges[0];
    expect(charge.billingPeriod).toBe("2026-07");
    expect(charge.status).toBe("charged");
    expect(charge.amountNok).toBe(100);
  });

  it("limit param is clamped to 1–200 range", async () => {
    let selectCall = 0;
    mockDbSelect.mockImplementation(() => {
      selectCall += 1;
      if (selectCall === 1) return makeSelectChain([{ isActive: true, role: "super_admin" }]);
      return makeSelectChain([]);
    });

    const token = await makeSuperAdminToken();
    // limit=9999 should be clamped to 200 — route must not error
    const res = await request(app)
      .get("/api/admin/billing/charges?limit=9999")
      .set("x-user-token", token);

    expect(res.status).toBe(200);
  });

  it("401 when no token is provided", async () => {
    const res = await request(app).get("/api/admin/billing/charges");
    expect(res.status).toBe(401);
  });

  it("403 when authenticated as regular user", async () => {
    mockDbAsRegularUser();
    const token = await makeUserToken();
    const res = await request(app)
      .get("/api/admin/billing/charges")
      .set("x-user-token", token);
    expect(res.status).toBe(403);
  });
});
