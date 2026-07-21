/**
 * Route-level integration tests for the four PATCH endpoints with Zod validation.
 *
 * Tests mount real route handlers on a minimal Express app via supertest.
 * DB queries and auth middlewares are mocked so tests run without a real database
 * or network, but Zod validation and route handler logic run as-is.
 *
 * Covered routes:
 *   PATCH /api/vehicles/:vehicleId/reminders/:reminderId   — validate() middleware
 *   PATCH /api/clubs/:clubId/forum/posts/:postId            — inline safeParse
 *   PATCH /api/clubs/:clubId/events/:eventId               — inline safeParse
 *   PATCH /api/clubs/:clubId/marketplace/:listingId        — inline safeParse
 */

import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";

// SESSION_SECRET must be set before any route module imports that use JWT.
process.env["SESSION_SECRET"] = "test-session-secret-for-vitest-only";

// Module-level role state for tests that need a non-default club role.
// The requireClubRole mock reads this lazily at request time (not at vi.mock factory
// time), so reassigning it between tests works even with vi.mock hoisting.
let testClubRole = "member";

// ─── DB mock ──────────────────────────────────────────────────────────────────
const mockDbSelect = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbInsert = vi.fn();
const mockDbDelete = vi.fn();

/**
 * Returns a thenable + chainable Drizzle-style builder that resolves to `rows`.
 * Handles `.from()`, `.where()`, `.orderBy()`, `.limit()`, `.set()`, `.returning()`,
 * `.values()`, `.$dynamic()`, `.groupBy()`.
 */
function makeChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(rows).then(resolve, reject),
    catch: (reject: (e: unknown) => void) => Promise.resolve(rows).catch(reject),
  };
  const noop = () => chain;
  chain.from = noop;
  chain.where = noop;
  chain.orderBy = noop;
  chain.limit = noop;
  chain.groupBy = noop;
  chain.$dynamic = noop;
  chain.returning = () => Promise.resolve(rows);
  chain.set = () => ({
    where: () => ({
      returning: () => Promise.resolve(rows),
    }),
  });
  chain.values = (_v: unknown) => ({
    returning: () => Promise.resolve(rows),
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(rows).then(resolve, reject),
  });
  return chain;
}

vi.mock("@workspace/db", () => {
  const db = {
    select:  (...args: unknown[]) => mockDbSelect(...args),
    insert:  (...args: unknown[]) => mockDbInsert(...args),
    update:  (...args: unknown[]) => mockDbUpdate(...args),
    delete:  (...args: unknown[]) => mockDbDelete(...args),
  };

  const sym = (name: string) => ({ _name: name });
  return {
    db,
    serviceRemindersTable:   sym("serviceReminders"),
    vehiclesTable:           sym("vehicles"),
    forumPostsTable:         sym("forumPosts"),
    forumCommentsTable:      sym("forumComments"),
    forumLikesTable:         sym("forumLikes"),
    forumNotificationsTable: sym("forumNotifications"),
    clubMembersTable:        sym("clubMembers"),
    clubEventsTable:         sym("clubEvents"),
    clubEventRsvpsTable:     sym("clubEventRsvps"),
    marketplaceListingsTable:sym("marketplaceListings"),
    clubsTable:              sym("clubs"),
    usersTable:              sym("users"),
    auditLogsTable:          sym("auditLogs"),
    eq:   vi.fn(() => true),
    and:  vi.fn(() => true),
    or:   vi.fn(() => true),
    desc: vi.fn((a: unknown) => a),
    asc:  vi.fn((a: unknown) => a),
    gte:  vi.fn(() => true),
    ilike:vi.fn(() => true),
    sql:  Object.assign(vi.fn((parts: TemplateStringsArray, ...values: unknown[]) =>
      parts.reduce((acc, p, i) => acc + p + (values[i] ?? ""), "")
    ), { raw: vi.fn((s: string) => s) }),
  };
});

// ─── Auth middleware mocks ────────────────────────────────────────────────────
// Service reminder routes use parseUserAuth + requireUser from ../middleware/userAuth
vi.mock("../middleware/userAuth", () => ({
  parseUserAuth: (req: { userAuth?: unknown }, _res: unknown, next: () => void) => {
    req.userAuth = {
      userId: 1, email: "test@test.com", name: "Test",
      role: "user", tenantId: 1, tenantName: "Garasje",
      tenantRole: "owner", isPersonalTenant: true,
    };
    next();
  },
  requireUser: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Club routes use parseAuth + requireClubRole from ../middleware/auth.
// requireClubRole reads testClubRole lazily at request time so individual tests
// can temporarily set a different role without rebuilding the mock.
vi.mock("../middleware/auth", () => ({
  parseAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  resolveClubActorFromUser: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireClubRole: (_minRole: unknown) =>
    (req: { auth?: unknown }, _res: unknown, next: () => void) => {
      req.auth = { memberName: "test-member", clubId: 1, role: testClubRole };
      next();
    },
}));

// ─── Other infrastructure mocks ───────────────────────────────────────────────
vi.mock("../middleware/clerkUserAuth", () => ({
  clerkUserAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../middleware/billingAccess", () => ({
  requirePaidAccess: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../middleware/rateLimiter", () => ({
  globalRateLimit: (_req: unknown, _res: unknown, next: () => void) => next(),
  writeRateLimit:  (_req: unknown, _res: unknown, next: () => void) => next(),
  authRateLimit:   (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../socket", () => ({
  emitToClub: vi.fn(),
}));
vi.mock("../lib/audit", () => ({
  audit: vi.fn(),
}));

// ─── Build minimal test Express apps ─────────────────────────────────────────

async function buildRemindersApp() {
  const { default: router } = await import("../routes/serviceReminders");
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
}

async function buildForumApp() {
  const { default: router } = await import("../routes/forum");
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
}

async function buildEventsApp() {
  const { default: router } = await import("../routes/clubEvents");
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
}

async function buildMarketplaceApp() {
  const { default: router } = await import("../routes/marketplace");
  const app = express();
  app.use(express.json());
  app.use("/api", router);
  return app;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const existingReminder = {
  id: 10, vehicleId: 5, title: "Oljeskift", description: null,
  type: "date", dueMileage: null, dueDate: new Date("2026-12-01"),
  isActive: true, intervalMonths: 12, intervalMileage: null,
  lastCompleted: null, lastCompletedMileage: null, notifyBefore: 30, updatedAt: new Date(),
};

const updatedReminder = { ...existingReminder, title: "Oppdatert", updatedAt: new Date() };

const existingPost = {
  id: 20, clubId: 1, memberName: "test-member", category: "general",
  postType: "text", title: null, content: "Hei verden", imageUrl: null,
  videoUrl: null, isPinned: 0, likesCount: 0, commentsCount: 0,
  isDeleted: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

const existingEvent = {
  id: 30, clubId: 1, title: "Sommermøte", description: null,
  location: null, latitude: null, longitude: null,
  startAt: new Date("2026-08-01T12:00:00Z"), endAt: null,
  maxAttendees: null, imageUrl: null, status: "upcoming", createdBy: "test-member",
  updatedAt: new Date(),
};

const existingListing = {
  id: 40, clubId: 1, sellerName: "test-member", title: "Forgasser",
  description: null, price: "500", currency: "NOK", condition: "good",
  category: null, make: null, model: null, year: null, imageUrl: null,
  status: "active", contactInfo: null, location: null, isFree: false,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
};

// ─── Service Reminders PATCH ──────────────────────────────────────────────────

describe("PATCH /api/vehicles/:vehicleId/reminders/:reminderId", () => {
  let app: express.Express;

  beforeAll(async () => {
    app = await buildRemindersApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Valid payloads ────────────────────────────────────────────────────────

  it("200 for a full valid edit — validate() middleware does not block valid payload", async () => {
    mockDbSelect
      .mockImplementationOnce(() => makeChain([{ id: 5 }]))             // assertVehicleOwnership
      .mockImplementationOnce(() => makeChain([existingReminder]));      // existing reminder
    mockDbUpdate.mockImplementation(() => makeChain([updatedReminder]));

    const res = await request(app)
      .patch("/api/vehicles/5/reminders/10")
      .send({
        title: "Oljeskift",
        description: "5W-40 full synth",
        dueDate: "2026-12-01",
        isActive: true,
        intervalMonths: 12,
      });

    expect(res.status).toBe(200);
    expect(res.body.error).not.toBe("validation_error");
  });

  it("200 with null for clearable optional fields — frontend sends null for blank inputs", async () => {
    mockDbSelect
      .mockImplementationOnce(() => makeChain([{ id: 5 }]))
      .mockImplementationOnce(() => makeChain([existingReminder]));
    mockDbUpdate.mockImplementation(() => makeChain([updatedReminder]));

    const res = await request(app)
      .patch("/api/vehicles/5/reminders/10")
      .send({
        title: "Oljeskift",
        description: null,
        dueMileage: null,
        dueDate: null,
        intervalMonths: null,
        intervalMileage: null,
      });

    expect(res.status).toBe(200);
    expect(res.body.error).not.toBe("validation_error");
  });

  it("200 for an empty patch body — all fields optional", async () => {
    mockDbSelect
      .mockImplementationOnce(() => makeChain([{ id: 5 }]))
      .mockImplementationOnce(() => makeChain([existingReminder]));
    mockDbUpdate.mockImplementation(() => makeChain([updatedReminder]));

    const res = await request(app)
      .patch("/api/vehicles/5/reminders/10")
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.error).not.toBe("validation_error");
  });

  it("200 when frontend sends 'type' (unknown field) alongside other fields — stripped, not rejected", async () => {
    mockDbSelect
      .mockImplementationOnce(() => makeChain([{ id: 5 }]))
      .mockImplementationOnce(() => makeChain([existingReminder]));
    mockDbUpdate.mockImplementation(() => makeChain([updatedReminder]));

    const res = await request(app)
      .patch("/api/vehicles/5/reminders/10")
      .send({ title: "Oljeskift", type: "date" });

    expect(res.status).toBe(200);
    expect(res.body.error).not.toBe("validation_error");
  });

  // ── Invalid payloads ──────────────────────────────────────────────────────
  // validate() fires before any DB call, so no DB mocking needed for these.

  it("400 validation_error when isActive is a string (not boolean)", async () => {
    const res = await request(app)
      .patch("/api/vehicles/5/reminders/10")
      .send({ isActive: "true" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("400 validation_error when dueDate is an invalid date string", async () => {
    const res = await request(app)
      .patch("/api/vehicles/5/reminders/10")
      .send({ dueDate: "not-a-date" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("400 validation_error when dueMileage is negative", async () => {
    const res = await request(app)
      .patch("/api/vehicles/5/reminders/10")
      .send({ dueMileage: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("400 validation_error when title is blank (whitespace-only)", async () => {
    const res = await request(app)
      .patch("/api/vehicles/5/reminders/10")
      .send({ title: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("400 response includes a fields map with the failing key", async () => {
    const res = await request(app)
      .patch("/api/vehicles/5/reminders/10")
      .send({ isActive: 1 });

    expect(res.status).toBe(400);
    expect(res.body.fields).toBeDefined();
    expect(typeof res.body.fields).toBe("object");
  });
});

// ─── Forum Post PATCH ─────────────────────────────────────────────────────────

describe("PATCH /api/clubs/:clubId/forum/posts/:postId", () => {
  let app: express.Express;

  beforeAll(async () => {
    app = await buildForumApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    testClubRole = "member";
  });

  afterEach(() => {
    testClubRole = "member";
  });

  // ── Valid payloads ─────────────────────────────────────────────────────────

  it("200 for content edit by the post author — member editing their own post", async () => {
    const ownPost = { ...existingPost, memberName: "test-member" };
    mockDbSelect.mockImplementationOnce(() => makeChain([ownPost]));
    mockDbUpdate.mockImplementation(() => makeChain([{ ...ownPost, content: "Oppdatert" }]));

    const res = await request(app)
      .patch("/api/clubs/1/forum/posts/20")
      .send({ content: "Oppdatert innhold her" });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeUndefined();
  });

  it("200 for isPinned:1 by a moderator — pin requires moderator+ role", async () => {
    testClubRole = "moderator";
    const post = { ...existingPost };
    mockDbSelect.mockImplementationOnce(() => makeChain([post]));
    mockDbUpdate.mockImplementation(() => makeChain([{ ...post, isPinned: 1 }]));
    mockDbInsert.mockImplementation(() => makeChain([{}])); // audit

    const res = await request(app)
      .patch("/api/clubs/1/forum/posts/20")
      .send({ isPinned: 1 });

    expect(res.status).toBe(200);
    expect(res.body.isPinned).toBe(1);
  });

  it("200 for isPinned:0 (unpin) by a moderator", async () => {
    testClubRole = "moderator";
    const pinnedPost = { ...existingPost, isPinned: 1 };
    mockDbSelect.mockImplementationOnce(() => makeChain([pinnedPost]));
    mockDbUpdate.mockImplementation(() => makeChain([{ ...pinnedPost, isPinned: 0 }]));
    mockDbInsert.mockImplementation(() => makeChain([{}])); // audit

    const res = await request(app)
      .patch("/api/clubs/1/forum/posts/20")
      .send({ isPinned: 0 });

    expect(res.status).toBe(200);
    expect(res.body.isPinned).toBe(0);
  });

  it("403 when a member tries to pin a post — safeParse passes, handler enforces role", async () => {
    // testClubRole is "member" — safeParse validates the payload (isPinned:1 is valid),
    // then the handler returns 403 because pin requires moderator.
    const post = { ...existingPost };
    mockDbSelect.mockImplementationOnce(() => makeChain([post]));

    const res = await request(app)
      .patch("/api/clubs/1/forum/posts/20")
      .send({ isPinned: 1 });

    expect(res.status).toBe(403);
  });

  it("safeParse passes for isPinned:0 — proceeds to handler (not blocked at schema level)", async () => {
    // A valid body should NOT return 400 — safeParse accepts it and the handler runs.
    // Post not found → 404 (not 400), which proves schema accepted the value.
    mockDbSelect.mockImplementation(() => makeChain([]));

    const res = await request(app)
      .patch("/api/clubs/1/forum/posts/99")
      .send({ isPinned: 0 });

    expect(res.status).not.toBe(400);
  });

  // ── Invalid payloads ──────────────────────────────────────────────────────
  // safeParse fires at the start of the handler, BEFORE the DB post lookup.

  it("400 when content is empty — safeParse rejects blank content", async () => {
    const res = await request(app)
      .patch("/api/clubs/1/forum/posts/20")
      .send({ content: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Ugyldig input");
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("400 when isPinned is a boolean — schema requires integer 0 or 1", async () => {
    const res = await request(app)
      .patch("/api/clubs/1/forum/posts/20")
      .send({ isPinned: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Ugyldig input");
  });

  it("400 when isPinned is 2 — out of allowed range 0..1", async () => {
    const res = await request(app)
      .patch("/api/clubs/1/forum/posts/20")
      .send({ isPinned: 2 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Ugyldig input");
  });
});

// ─── Club Event PATCH ─────────────────────────────────────────────────────────

describe("PATCH /api/clubs/:clubId/events/:eventId", () => {
  let app: express.Express;

  beforeAll(async () => {
    app = await buildEventsApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Valid payloads ─────────────────────────────────────────────────────────

  it("200 for a full valid edit payload matching what the frontend sends", async () => {
    mockDbSelect.mockImplementation(() => makeChain([existingEvent]));
    mockDbUpdate.mockImplementation(() => makeChain([{ ...existingEvent, title: "Oppdatert" }]));
    mockDbInsert.mockImplementation(() => makeChain([{}])); // audit insert

    const res = await request(app)
      .patch("/api/clubs/1/events/30")
      .send({
        title: "Oppdatert Sommermøte",
        description: null,
        location: null,
        startAt: new Date("2026-08-01T12:00:00Z").toISOString(),
        endAt: null,
        maxAttendees: null,
        imageUrl: null,
      });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeUndefined();
  });

  it("200 for status-only update (cancelled)", async () => {
    mockDbSelect.mockImplementation(() => makeChain([existingEvent]));
    mockDbUpdate.mockImplementation(() => makeChain([{ ...existingEvent, status: "cancelled" }]));
    mockDbInsert.mockImplementation(() => makeChain([{}]));

    const res = await request(app)
      .patch("/api/clubs/1/events/30")
      .send({ status: "cancelled" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });

  it("200 for past/ongoing status values", async () => {
    for (const status of ["past", "ongoing", "upcoming"] as const) {
      mockDbSelect.mockImplementation(() => makeChain([existingEvent]));
      mockDbUpdate.mockImplementation(() => makeChain([{ ...existingEvent, status }]));
      mockDbInsert.mockImplementation(() => makeChain([{}]));

      const res = await request(app)
        .patch("/api/clubs/1/events/30")
        .send({ status });

      expect(res.status).toBe(200);
    }
  });

  // ── Invalid payloads ──────────────────────────────────────────────────────
  // safeParse fires AFTER the entity lookup, so we must provide a mock DB row.

  it("400 when status is an unrecognised enum value", async () => {
    mockDbSelect.mockImplementation(() => makeChain([existingEvent]));

    const res = await request(app)
      .patch("/api/clubs/1/events/30")
      .send({ status: "deleted" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Ugyldig input");
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("400 when maxAttendees is zero or negative (must be positive int)", async () => {
    mockDbSelect.mockImplementation(() => makeChain([existingEvent]));

    const res = await request(app)
      .patch("/api/clubs/1/events/30")
      .send({ maxAttendees: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Ugyldig input");
  });

  it("400 when title is empty string", async () => {
    mockDbSelect.mockImplementation(() => makeChain([existingEvent]));

    const res = await request(app)
      .patch("/api/clubs/1/events/30")
      .send({ title: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Ugyldig input");
  });

  it("404 when event not found (safeParse never reached — proves 404≠400)", async () => {
    mockDbSelect.mockImplementation(() => makeChain([])); // event not found

    const res = await request(app)
      .patch("/api/clubs/1/events/99")
      .send({ title: "Valid Title" });

    expect(res.status).toBe(404);
  });
});

// ─── Marketplace Listing PATCH ────────────────────────────────────────────────

describe("PATCH /api/clubs/:clubId/marketplace/:listingId", () => {
  let app: express.Express;

  beforeAll(async () => {
    app = await buildMarketplaceApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Valid payloads ─────────────────────────────────────────────────────────

  it("200 for a full valid edit payload matching what the frontend sends", async () => {
    mockDbSelect.mockImplementation(() => makeChain([existingListing]));
    mockDbUpdate.mockImplementation(() => makeChain([{ ...existingListing, title: "Oppdatert" }]));

    const res = await request(app)
      .patch("/api/clubs/1/marketplace/40")
      .send({
        title: "Oppdatert forgasser",
        description: null,
        price: 500,
        isFree: false,
        condition: "good",
        imageUrl: null,
        contactInfo: null,
      });

    expect(res.status).toBe(200);
    expect(res.body.error).toBeUndefined();
  });

  it("200 for null price with isFree:true", async () => {
    mockDbSelect.mockImplementation(() => makeChain([existingListing]));
    mockDbUpdate.mockImplementation(() => makeChain([{ ...existingListing, price: null, isFree: true }]));

    const res = await request(app)
      .patch("/api/clubs/1/marketplace/40")
      .send({ price: null, isFree: true });

    expect(res.status).toBe(200);
  });

  it("200 for each valid status value", async () => {
    for (const status of ["active", "sold", "reserved", "removed"] as const) {
      mockDbSelect.mockImplementation(() => makeChain([existingListing]));
      mockDbUpdate.mockImplementation(() => makeChain([{ ...existingListing, status }]));

      const res = await request(app)
        .patch("/api/clubs/1/marketplace/40")
        .send({ status });

      expect(res.status).toBe(200);
    }
  });

  it("200 even when frontend sends extra fields (category, make, model, year — stripped silently)", async () => {
    mockDbSelect.mockImplementation(() => makeChain([existingListing]));
    mockDbUpdate.mockImplementation(() => makeChain([existingListing]));

    const res = await request(app)
      .patch("/api/clubs/1/marketplace/40")
      .send({
        title: "Forgasser",
        category: "Motor",
        make: "BMW",
        model: "R90",
        year: 1974,
        location: "Oslo",
      });

    expect(res.status).toBe(200);
  });

  // ── Invalid payloads ──────────────────────────────────────────────────────
  // safeParse fires AFTER the entity lookup, so we must provide a mock DB row.

  it("400 when condition is an unrecognised enum value", async () => {
    mockDbSelect.mockImplementation(() => makeChain([existingListing]));

    const res = await request(app)
      .patch("/api/clubs/1/marketplace/40")
      .send({ condition: "broken" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Ugyldig input");
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it("400 when status is an unrecognised enum value", async () => {
    mockDbSelect.mockImplementation(() => makeChain([existingListing]));

    const res = await request(app)
      .patch("/api/clubs/1/marketplace/40")
      .send({ status: "archived" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Ugyldig input");
  });

  it("400 when price is negative", async () => {
    mockDbSelect.mockImplementation(() => makeChain([existingListing]));

    const res = await request(app)
      .patch("/api/clubs/1/marketplace/40")
      .send({ price: -10 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Ugyldig input");
  });

  it("404 when listing not found (safeParse never reached — proves 404≠400)", async () => {
    mockDbSelect.mockImplementation(() => makeChain([])); // listing not found

    const res = await request(app)
      .patch("/api/clubs/1/marketplace/99")
      .send({ title: "Valid Title" });

    expect(res.status).toBe(404);
  });
});
