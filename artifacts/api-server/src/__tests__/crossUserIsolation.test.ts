/**
 * Cross-user isolation tests for vehicle and service-record endpoints.
 *
 * WHY THESE TESTS MATTER
 * ───────────────────────
 * Auth guards only confirm unauthenticated users are rejected.  There are no
 * other tests confirming that a logged-in User B cannot reach User A's data by
 * guessing a vehicle or service-record ID.  A future change that accidentally
 * removes or bypasses an ownership check would silently expose private data.
 *
 * HOW THE MOCKING WORKS — predicate inspection
 * ─────────────────────────────────────────────
 * Routes import `eq` and `and` from `drizzle-orm`.  We replace those with
 * descriptor-returning versions so the db mock can INSPECT the actual ownership
 * predicates passed to WHERE, instead of relying on call order.
 *
 *   eq(vehiclesTable.tenantId, 1) → { _col: VT.tenantId_sym, _val: 1 }
 *   and(eqId, eqTenantId)         → { _and: [eqId, eqTenantId] }
 *
 * db.select().from(vehiclesTable).where(pred) calls resolveVehicleOwnership(pred),
 * which walks the descriptor tree to find the tenantId and matches it against
 * VEHICLE_STORE — exactly like real SQL filtering.
 *
 * SECURITY INVARIANT
 * ──────────────────
 * Removing ownershipClause from a vehicle route causes the WHERE clause to
 * contain only `id = 42` (no tenantId predicate).  resolveVehicleOwnership
 * returns null when no tenantId is found → User A's "200" test fails instead
 * of passing → the regression is caught.
 *
 * For service-record routes, assertVehicleOwnership is mocked as a real
 * ownership function.  Removing its call from a route causes service-record
 * data to reach User B → User B's "404" test fails → regression caught.
 *
 * Covered endpoints:
 *   vehicles.ts (inline ownershipClause in SQL WHERE):
 *     GET    /api/vehicles/:id
 *     PATCH  /api/vehicles/:id
 *     DELETE /api/vehicles/:id
 *
 *   serviceRecords.ts (assertVehicleOwnership guard):
 *     GET    /api/vehicles/:vehicleId/service-records
 *     POST   /api/vehicles/:vehicleId/service-records
 *     GET    /api/vehicles/:vehicleId/service-records/:id
 *     PATCH  /api/vehicles/:vehicleId/service-records/:id
 *     DELETE /api/vehicles/:vehicleId/service-records/:id
 */

import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// SESSION_SECRET must be set before any module that uses JWT.
process.env["SESSION_SECRET"] = "test-session-secret-for-vitest-only";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VEHICLE_ID         = 42;
const SERVICE_RECORD_ID  = 99;
const USER_A_ID          = 1;
const USER_A_TENANT      = 1;
const USER_B_ID          = 2;
const USER_B_TENANT      = 2;

const vehicleA = {
  id: VEHICLE_ID,
  make: "Ford", model: "Mustang", year: 1967, type: "car",
  userId: USER_A_ID, tenantId: USER_A_TENANT,
  color: "Red", mileage: "50000",
  registrationNumber: "AB12345",
  finnUrl: null, notes: null, imageUrl: null,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

const serviceRecordA = {
  id: SERVICE_RECORD_ID, vehicleId: VEHICLE_ID,
  title: "Oljeskift", description: null,
  serviceDate: "2025-01-01", mileageAtService: null, cost: null,
  performedBy: null, category: "oil_change",
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

// ─── Predicate-descriptor system ─────────────────────────────────────────────
//
// We replace drizzle-orm's eq/and with lightweight descriptor constructors.
// The db mock can then INSPECT the predicate tree to simulate real SQL ownership
// filtering without ever talking to a real database.
//
// Column identity: each table column is a Symbol. eq(col, val) stores { _col, _val }.
// and(...) stores { _and: [...children] }. findVal() traverses the tree.

type EqNode  = { _col: symbol; _val: unknown };
type AndNode = { _and: Predicate[] };
type Predicate = EqNode | AndNode | unknown;

function isEq(p: Predicate): p is EqNode {
  return !!p && typeof p === "object" && "_col" in (p as object);
}
function isAnd(p: Predicate): p is AndNode {
  return !!p && typeof p === "object" && "_and" in (p as object);
}

/** Walk the predicate tree to find the value associated with a specific column. */
function findVal(pred: Predicate, col: symbol): unknown {
  if (isEq(pred) && pred._col === col) return pred._val;
  if (isAnd(pred)) {
    for (const child of pred._and) {
      const v = findVal(child, col);
      if (v !== undefined) return v;
    }
  }
  return undefined;
}

// Column symbols for vehiclesTable columns used in ownership predicates.
const VT = {
  id:       Symbol("vehicles.id"),
  tenantId: Symbol("vehicles.tenantId"),
  userId:   Symbol("vehicles.userId"),
} as const;

// Column symbols for serviceRecordsTable (needed so eq() calls don't fall through).
const SRT = {
  id:        Symbol("serviceRecords.id"),
  vehicleId: Symbol("serviceRecords.vehicleId"),
} as const;

// In-memory vehicle store — the source of truth for ownership.
// Vehicle #42 belongs to tenantId=1 / userId=1.
const VEHICLE_STORE: Record<number, { tenantId: number; userId: number }> = {
  [VEHICLE_ID]: { tenantId: USER_A_TENANT, userId: USER_A_ID },
};

/**
 * Simulates the SQL ownership WHERE clause.
 *
 * Returns the vehicle row when BOTH:
 *   • the id predicate matches the stored vehicle id, AND
 *   • the tenantId (or userId) predicate matches the stored owner.
 *
 * Returns null when either predicate is absent or mismatches — this means
 * that removing ownershipClause from a route causes User A's "200" test to
 * fail (no tenantId predicate → null → 404), catching the regression.
 */
function resolveVehicleOwnership(pred: Predicate): typeof vehicleA | null {
  const id       = findVal(pred, VT.id)       as number | undefined;
  const tenantId = findVal(pred, VT.tenantId) as number | undefined;
  const userId   = findVal(pred, VT.userId)   as number | undefined;

  if (id === undefined) return null;
  const owner = VEHICLE_STORE[id];
  if (!owner) return null;

  if (tenantId !== undefined) {
    return tenantId === owner.tenantId ? vehicleA : null;
  }
  if (userId !== undefined) {
    return userId === owner.userId ? vehicleA : null;
  }
  // No ownership predicate → ownership check was removed from this route.
  return null;
}

// ─── Chainable promise helper ─────────────────────────────────────────────────
//
// Returns a thenable that also exposes .where() and .orderBy() for chaining.

type Chain = {
  then: (resolve: (v: unknown[]) => void, reject?: (e: unknown) => void) => Promise<unknown>;
  where: (pred?: Predicate) => Chain;
  orderBy: (...args: unknown[]) => Chain;
  returning: () => Promise<unknown[]>;
};

function makeChain(rows: unknown[]): Chain {
  const self: Chain = {
    then:      (resolve, reject) => Promise.resolve(rows).then(resolve, reject),
    where:     (_pred?: Predicate) => makeChain(rows),
    orderBy:   () => makeChain(rows),
    returning: () => Promise.resolve(rows),
  };
  return self;
}

// ─── Drizzle-orm mock — descriptor-returning eq/and ──────────────────────────
//
// Routes import { eq, and } from "drizzle-orm".  We replace both with functions
// that return descriptor objects instead of SQL template objects.  This lets
// the db mock inspect the actual ownership values that the route passed in.

vi.mock("drizzle-orm", () => ({
  eq:   (col: symbol, val: unknown): EqNode  => ({ _col: col, _val: val }),
  and:  (...args: Predicate[]): AndNode => ({ _and: args }),
  sql:  Object.assign(
    (parts: TemplateStringsArray, ...vals: unknown[]) =>
      parts.reduce((acc, p, i) => acc + p + (vals[i] ?? ""), ""),
    { raw: (s: string) => s }
  ),
  count:  () => ({}),
  desc:   (a: unknown) => a,
  asc:    (a: unknown) => a,
  or:     (...args: unknown[]) => ({ _or: args }),
  ilike:  (col: unknown, val: unknown) => ({ _ilike: { col, val } }),
  gte:    (col: unknown, val: unknown) => ({ _gte: { col, val } }),
  lte:    (col: unknown, val: unknown) => ({ _lte: { col, val } }),
  isNull: (col: unknown) => ({ _isNull: col }),
  not:    (expr: unknown) => ({ _not: expr }),
  inArray:(col: unknown, vals: unknown[]) => ({ _in: { col, vals } }),
}));

// ─── @workspace/db mock ───────────────────────────────────────────────────────
//
// Table objects use the column symbols from VT/SRT so that eq(vehiclesTable.tenantId, x)
// produces { _col: VT.tenantId, _val: x }, which resolveVehicleOwnership can inspect.

const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();

vi.mock("@workspace/db", () => {
  // Table definitions — columns are the Symbol identities used by findVal.
  const vehiclesTable = {
    _table: "vehicles",
    id: VT.id, tenantId: VT.tenantId, userId: VT.userId,
    make: Symbol("vt.make"), model: Symbol("vt.model"), year: Symbol("vt.year"),
    type: Symbol("vt.type"), color: Symbol("vt.color"), mileage: Symbol("vt.mileage"),
    registrationNumber: Symbol("vt.reg"), finnUrl: Symbol("vt.finn"),
    notes: Symbol("vt.notes"), imageUrl: Symbol("vt.img"),
    createdAt: Symbol("vt.createdAt"),
  };
  const usersTable = {
    _table: "users",
    id: Symbol("ut.id"), isActive: Symbol("ut.isActive"), role: Symbol("ut.role"),
    email: Symbol("ut.email"), name: Symbol("ut.name"),
    passwordHash: Symbol("ut.pw"), themeAccent: Symbol("ut.accent"), themeMode: Symbol("ut.theme"),
    updatedAt: Symbol("ut.updatedAt"),
  };
  const serviceRecordsTable = {
    _table: "serviceRecords",
    id: SRT.id, vehicleId: SRT.vehicleId,
    title: Symbol("sr.title"), serviceDate: Symbol("sr.date"),
    category: Symbol("sr.cat"), cost: Symbol("sr.cost"),
    description: Symbol("sr.desc"), mileageAtService: Symbol("sr.mi"),
    performedBy: Symbol("sr.by"), createdAt: Symbol("sr.createdAt"),
  };
  const receiptsTable      = { _table: "receipts" };
  const tripLogsTable      = { _table: "tripLogs" };
  const tenantsTable       = { _table: "tenants" };
  const tenantMemberships  = { _table: "tenantMemberships" };

  function buildSelectChain(_selected: unknown) {
    return {
      from(table: { _table: string }) {
        if (table._table === "users") {
          return {
            where(_pred: Predicate) {
              // requireUser: always return an active user for these tests.
              return makeChain([{ isActive: true, role: "user" }]);
            },
          };
        }

        if (table._table === "vehicles") {
          return {
            where(pred: Predicate) {
              const row = resolveVehicleOwnership(pred);
              // Narrow to { id } if the select projection was { id: col }.
              const data = _selected && typeof _selected === "object" && "id" in (_selected as object)
                ? (row ? { id: (row as typeof vehicleA).id } : null)
                : row;
              return makeChain(data ? [data] : []);
            },
            orderBy() { return makeChain([]); },
          };
        }

        if (table._table === "serviceRecords") {
          return {
            where(_pred: Predicate) {
              return makeChain([serviceRecordA]);
            },
            orderBy() { return makeChain([serviceRecordA]); },
          };
        }

        // Fallback for other tables (e.g. tenants, memberships).
        return {
          where() { return makeChain([]); },
          orderBy() { return makeChain([]); },
        };
      },
    };
  }

  const db = {
    select: (...args: unknown[]) => buildSelectChain(args[0]),
    insert: () => ({
      values: () => ({
        returning: () => Promise.resolve([serviceRecordA]),
      }),
    }),
    update: (...args: unknown[]) => mockDbUpdate(...args),
    delete: (...args: unknown[]) => mockDbDelete(...args),
  };

  return {
    db,
    vehiclesTable,
    usersTable,
    serviceRecordsTable,
    receiptsTable,
    tripLogsTable,
    tenantsTable,
    tenantMembershipsTable: tenantMemberships,
    // These are also imported from @workspace/db in some route files.
    eq:   (col: symbol, val: unknown): EqNode  => ({ _col: col, _val: val }),
    and:  (...args: Predicate[]): AndNode => ({ _and: args }),
    sql:  Object.assign(
      (parts: TemplateStringsArray, ...vals: unknown[]) =>
        parts.reduce((acc, p, i) => acc + p + (vals[i] ?? ""), ""),
      { raw: (s: string) => s }
    ),
    count: () => ({}),
    desc:  (a: unknown) => a,
    asc:   (a: unknown) => a,
  };
});

// ─── assertVehicleOwnership mock ─────────────────────────────────────────────
//
// Service-record routes call assertVehicleOwnership() before touching any record.
// We supply a real ownership implementation backed by VEHICLE_STORE.
//
// Crucially: if a route removes the assertVehicleOwnership call, service records
// are returned directly to User B (200 instead of expected 404) → test FAILS.

vi.mock("../lib/vehicleOwnership", () => ({
  assertVehicleOwnership: async (
    vehicleId: number,
    tenantId: number | null | undefined,
    userId: number,
  ): Promise<boolean> => {
    const owner = VEHICLE_STORE[vehicleId];
    if (!owner) return false;
    if (tenantId != null) return owner.tenantId === tenantId;
    return owner.userId === userId;
  },
}));

// ─── Stub infrastructure middleware ───────────────────────────────────────────

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

// ─── Token helpers ────────────────────────────────────────────────────────────

async function makeTokenForUser(userId: number, tenantId: number): Promise<string> {
  const { signUserToken } = await import("../middleware/userAuth");
  return signUserToken({
    userId,
    email:            `user${userId}@example.com`,
    name:             `User ${userId}`,
    role:             "user",
    tenantId,
    tenantName:       `Garasje ${userId}`,
    tenantRole:       "owner",
    isPersonalTenant: true,
  });
}

// ─── Minimal Express app ──────────────────────────────────────────────────────

async function buildApp() {
  const [{ default: vehiclesRouter }, { default: serviceRecordsRouter }] =
    await Promise.all([
      import("../routes/vehicles"),
      import("../routes/serviceRecords"),
    ]);

  const app = express();
  app.use(express.json());
  app.use("/api", vehiclesRouter);
  app.use("/api", serviceRecordsRouter);

  // Minimal error handler — converts AppError to { error: message } JSON.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err && typeof err === "object" && "status" in err && "message" in err) {
      const e = err as { status: number; message: string };
      res.status(e.status).json({ error: e.message });
    } else {
      res.status(500).json({ error: "Intern feil" });
    }
  });

  return app;
}

// ─── Shared state ─────────────────────────────────────────────────────────────

let app: express.Express;
let tokenA: string;
let tokenB: string;

// ─── Vehicle route tests ──────────────────────────────────────────────────────

describe("Cross-user isolation — Vehicle routes (inline ownershipClause)", () => {
  beforeAll(async () => {
    app    = await buildApp();
    tokenA = await makeTokenForUser(USER_A_ID, USER_A_TENANT);
    tokenB = await makeTokenForUser(USER_B_ID, USER_B_TENANT);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── GET /api/vehicles/:id ─────────────────────────────────────────────────

  describe("GET /api/vehicles/:id", () => {
    it("200 — User A can read their own vehicle (ownershipClause matches tenantId=1)", async () => {
      // Confirms the ownership check is present and correct for the owner.
      // If ownershipClause is removed, no tenantId predicate → resolveVehicleOwnership
      // returns null → this test gets 404 instead of 200 → regression detected.
      const res = await request(app)
        .get(`/api/vehicles/${VEHICLE_ID}`)
        .set("x-user-token", tokenA);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(VEHICLE_ID);
      expect(res.body.tenantId).toBe(USER_A_TENANT);
    });

    it("404 — User B cannot read User A's vehicle; response leaks no private data", async () => {
      // ownershipClause passes tenantId=2 → resolveVehicleOwnership finds mismatch → null.
      const res = await request(app)
        .get(`/api/vehicles/${VEHICLE_ID}`)
        .set("x-user-token", tokenB);

      expect(res.status).toBe(404);
      expect(res.body).not.toHaveProperty("registrationNumber");
      expect(res.body).not.toHaveProperty("finnUrl");
      expect(res.body).not.toHaveProperty("tenantId");
    });

    it("401 — unauthenticated request is rejected before ownership check", async () => {
      const res = await request(app).get(`/api/vehicles/${VEHICLE_ID}`);
      expect(res.status).toBe(401);
    });
  });

  // ── PATCH /api/vehicles/:id ───────────────────────────────────────────────

  describe("PATCH /api/vehicles/:id", () => {
    it("200 — User A can update their own vehicle (ownershipClause in UPDATE WHERE)", async () => {
      mockDbUpdate.mockImplementation(() => ({
        set: () => ({
          where: (pred: Predicate) => {
            const row = resolveVehicleOwnership(pred);
            return { returning: () => Promise.resolve(row ? [{ ...row, mileage: "55000" }] : []) };
          },
        }),
      }));

      const res = await request(app)
        .patch(`/api/vehicles/${VEHICLE_ID}`)
        .set("x-user-token", tokenA)
        .send({ mileage: 55000 });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(VEHICLE_ID);
    });

    it("404 — User B cannot update User A's vehicle", async () => {
      mockDbUpdate.mockImplementation(() => ({
        set: () => ({
          where: (pred: Predicate) => {
            const row = resolveVehicleOwnership(pred);
            return { returning: () => Promise.resolve(row ? [row] : []) };
          },
        }),
      }));

      const res = await request(app)
        .patch(`/api/vehicles/${VEHICLE_ID}`)
        .set("x-user-token", tokenB)
        .send({ mileage: 55000 });

      expect(res.status).toBe(404);
    });

    it("401 — unauthenticated request is rejected", async () => {
      const res = await request(app)
        .patch(`/api/vehicles/${VEHICLE_ID}`)
        .send({ mileage: 55000 });
      expect(res.status).toBe(401);
    });
  });

  // ── DELETE /api/vehicles/:id ──────────────────────────────────────────────

  describe("DELETE /api/vehicles/:id", () => {
    it("204 — User A can delete their own vehicle (ownershipClause in DELETE WHERE)", async () => {
      mockDbDelete.mockImplementation(() => ({
        where: (pred: Predicate) => {
          const row = resolveVehicleOwnership(pred);
          return { returning: () => Promise.resolve(row ? [row] : []) };
        },
      }));

      const res = await request(app)
        .delete(`/api/vehicles/${VEHICLE_ID}`)
        .set("x-user-token", tokenA);

      expect(res.status).toBe(204);
    });

    it("404 — User B cannot delete User A's vehicle", async () => {
      mockDbDelete.mockImplementation(() => ({
        where: (pred: Predicate) => {
          const row = resolveVehicleOwnership(pred);
          return { returning: () => Promise.resolve(row ? [row] : []) };
        },
      }));

      const res = await request(app)
        .delete(`/api/vehicles/${VEHICLE_ID}`)
        .set("x-user-token", tokenB);

      expect(res.status).toBe(404);
    });

    it("401 — unauthenticated request is rejected", async () => {
      const res = await request(app).delete(`/api/vehicles/${VEHICLE_ID}`);
      expect(res.status).toBe(401);
    });
  });
});

// ─── Service-record route tests ───────────────────────────────────────────────

describe("Cross-user isolation — Service-record routes (assertVehicleOwnership guard)", () => {
  beforeAll(async () => {
    app    = await buildApp();
    tokenA = await makeTokenForUser(USER_A_ID, USER_A_TENANT);
    tokenB = await makeTokenForUser(USER_B_ID, USER_B_TENANT);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── GET /api/vehicles/:vehicleId/service-records ──────────────────────────

  describe("GET /api/vehicles/:vehicleId/service-records", () => {
    it("200 — User A can list service records for their vehicle", async () => {
      // assertVehicleOwnership mock returns true for tenantId=1.
      const res = await request(app)
        .get(`/api/vehicles/${VEHICLE_ID}/service-records`)
        .set("x-user-token", tokenA);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("404 — User B cannot list service records for User A's vehicle", async () => {
      // assertVehicleOwnership mock returns false for tenantId=2 → 404.
      // If assertVehicleOwnership is REMOVED from the route, service records
      // are returned directly → res.status === 200 → this test FAILS (catches regression).
      const res = await request(app)
        .get(`/api/vehicles/${VEHICLE_ID}/service-records`)
        .set("x-user-token", tokenB);

      expect(res.status).toBe(404);
      expect(Array.isArray(res.body)).toBe(false);
    });

    it("401 — unauthenticated request is rejected", async () => {
      const res = await request(app).get(`/api/vehicles/${VEHICLE_ID}/service-records`);
      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/vehicles/:vehicleId/service-records ─────────────────────────

  describe("POST /api/vehicles/:vehicleId/service-records", () => {
    const validPayload = {
      title:       "Oljeskift",
      serviceDate: "2025-06-01",
      category:    "oil_change",
    };

    it("201 — User A can create a service record on their vehicle", async () => {
      const res = await request(app)
        .post(`/api/vehicles/${VEHICLE_ID}/service-records`)
        .set("x-user-token", tokenA)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.vehicleId).toBe(VEHICLE_ID);
    });

    it("404 — User B cannot add a service record to User A's vehicle", async () => {
      const res = await request(app)
        .post(`/api/vehicles/${VEHICLE_ID}/service-records`)
        .set("x-user-token", tokenB)
        .send(validPayload);

      expect(res.status).toBe(404);
    });

    it("401 — unauthenticated request is rejected", async () => {
      const res = await request(app)
        .post(`/api/vehicles/${VEHICLE_ID}/service-records`)
        .send(validPayload);
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/vehicles/:vehicleId/service-records/:id ─────────────────────

  describe("GET /api/vehicles/:vehicleId/service-records/:id", () => {
    it("200 — User A can read a specific service record", async () => {
      const res = await request(app)
        .get(`/api/vehicles/${VEHICLE_ID}/service-records/${SERVICE_RECORD_ID}`)
        .set("x-user-token", tokenA);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(SERVICE_RECORD_ID);
    });

    it("404 — User B cannot read User A's service record; no private data leaks", async () => {
      const res = await request(app)
        .get(`/api/vehicles/${VEHICLE_ID}/service-records/${SERVICE_RECORD_ID}`)
        .set("x-user-token", tokenB);

      expect(res.status).toBe(404);
      expect(res.body).not.toHaveProperty("title");
      expect(res.body).not.toHaveProperty("cost");
      expect(res.body).not.toHaveProperty("performedBy");
    });

    it("401 — unauthenticated request is rejected", async () => {
      const res = await request(app).get(
        `/api/vehicles/${VEHICLE_ID}/service-records/${SERVICE_RECORD_ID}`
      );
      expect(res.status).toBe(401);
    });
  });

  // ── PATCH /api/vehicles/:vehicleId/service-records/:id ───────────────────

  describe("PATCH /api/vehicles/:vehicleId/service-records/:id", () => {
    it("200 — User A can update their own service record", async () => {
      mockDbUpdate.mockImplementation(() => ({
        set: () => ({
          where: () => ({
            returning: () =>
              Promise.resolve([{ ...serviceRecordA, title: "Bremseskift" }]),
          }),
        }),
      }));

      const res = await request(app)
        .patch(`/api/vehicles/${VEHICLE_ID}/service-records/${SERVICE_RECORD_ID}`)
        .set("x-user-token", tokenA)
        .send({ title: "Bremseskift" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Bremseskift");
    });

    it("404 — User B cannot update User A's service record", async () => {
      const res = await request(app)
        .patch(`/api/vehicles/${VEHICLE_ID}/service-records/${SERVICE_RECORD_ID}`)
        .set("x-user-token", tokenB)
        .send({ title: "Hacking attempt" });

      expect(res.status).toBe(404);
    });

    it("401 — unauthenticated request is rejected", async () => {
      const res = await request(app)
        .patch(`/api/vehicles/${VEHICLE_ID}/service-records/${SERVICE_RECORD_ID}`)
        .send({ title: "x" });
      expect(res.status).toBe(401);
    });
  });

  // ── DELETE /api/vehicles/:vehicleId/service-records/:id ──────────────────

  describe("DELETE /api/vehicles/:vehicleId/service-records/:id", () => {
    it("204 — User A can delete their own service record", async () => {
      mockDbDelete.mockImplementation(() => ({
        where: () => ({ returning: () => Promise.resolve([serviceRecordA]) }),
      }));

      const res = await request(app)
        .delete(`/api/vehicles/${VEHICLE_ID}/service-records/${SERVICE_RECORD_ID}`)
        .set("x-user-token", tokenA);

      expect(res.status).toBe(204);
    });

    it("404 — User B cannot delete User A's service record", async () => {
      const res = await request(app)
        .delete(`/api/vehicles/${VEHICLE_ID}/service-records/${SERVICE_RECORD_ID}`)
        .set("x-user-token", tokenB);

      expect(res.status).toBe(404);
    });

    it("401 — unauthenticated request is rejected", async () => {
      const res = await request(app).delete(
        `/api/vehicles/${VEHICLE_ID}/service-records/${SERVICE_RECORD_ID}`
      );
      expect(res.status).toBe(401);
    });
  });
});
