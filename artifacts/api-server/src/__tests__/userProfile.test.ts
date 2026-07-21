/**
 * Unit tests for the leaderboard and public garage endpoints.
 *
 * Verifies:
 *  - GET /api/profile/leaderboard returns the expected fields and does NOT leak subscriptionTier
 *  - GET /api/garage/:username returns the expected fields and does NOT leak subscriptionTier
 *
 * Strategy: mount only the userProfile router on a minimal Express app.
 * The @workspace/db module is mocked so tests run without a real database.
 */

import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

process.env["SESSION_SECRET"] = "test-session-secret-for-vitest-only";

// ─── Mock @workspace/db ───────────────────────────────────────────────────────

const mockDbSelect  = vi.fn();
const mockDbExecute = vi.fn();

vi.mock("@workspace/db", () => {
  const db = {
    select:  (...args: unknown[]) => mockDbSelect(...args),
    execute: (...args: unknown[]) => mockDbExecute(...args),
  };

  return {
    db,
    usersTable:         { id: "id", name: "name", email: "email", createdAt: "createdAt", isActive: "isActive" },
    vehiclesTable:      { id: "id", make: "make", model: "model", year: "year", type: "type", color: "color", mileage: "mileage", imageUrl: "imageUrl", userId: "userId" },
    serviceRecordsTable:{},
    eq:   vi.fn((_a: unknown, _b: unknown) => true),
    count: vi.fn(() => ({})),
    sql:  vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({})),
  };
});

// ─── Mock middlewares that pull in external services ──────────────────────────

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

// ─── Build a minimal test app ─────────────────────────────────────────────────

async function buildTestApp() {
  const { default: userProfileRouter } = await import("../routes/userProfile");
  const app = express();
  app.use(express.json());
  app.use("/api", userProfileRouter);
  return app;
}

// ─── Shared fixture data ───────────────────────────────────────────────────────

const USER_A = { id: 1, name: "Alice", createdAt: "2024-01-01T00:00:00.000Z" };
const USER_B = { id: 2, name: "Bob",   createdAt: "2024-02-01T00:00:00.000Z" };

const VEHICLES = [
  { id: 10, make: "Ford", model: "Mustang", year: 1969, type: "car", color: "red", mileage: 80000, imageUrl: null },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/profile/leaderboard", () => {
  let app: express.Express;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Wire up the three DB calls the leaderboard handler makes:
   *   1. db.select() for active users
   *   2. db.select() for vehicle counts per user
   *   3. db.execute(sql`...`) for service counts per user
   */
  function mockLeaderboard(users = [USER_A, USER_B]) {
    let selectCallCount = 0;

    mockDbSelect.mockImplementation(() => {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        // Active users query
        return {
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: () => Promise.resolve(users),
              }),
            }),
          }),
        };
      }
      // Vehicle counts query
      return {
        from: () => ({
          groupBy: () => Promise.resolve([
            { userId: 1, cnt: 2 },
            { userId: 2, cnt: 1 },
          ]),
        }),
      };
    });

    mockDbExecute.mockResolvedValue({
      rows: [
        { user_id: 1, cnt: 5 },
        { user_id: 2, cnt: 3 },
      ],
    });
  }

  it("200 and returns an array", async () => {
    mockLeaderboard();
    const res = await request(app).get("/api/profile/leaderboard");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("each entry contains id, name, createdAt, vehicles, services, score", async () => {
    mockLeaderboard();
    const res = await request(app).get("/api/profile/leaderboard");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);

    for (const entry of res.body) {
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("name");
      expect(entry).toHaveProperty("createdAt");
      expect(entry).toHaveProperty("vehicles");
      expect(entry).toHaveProperty("services");
      expect(entry).toHaveProperty("score");
    }
  });

  it("score is vehicles*50 + services*10", async () => {
    mockLeaderboard([USER_A]);
    const res = await request(app).get("/api/profile/leaderboard");
    expect(res.status).toBe(200);
    const entry = res.body.find((e: { id: number }) => e.id === 1);
    expect(entry).toBeDefined();
    // USER_A: 2 vehicles * 50 + 5 services * 10 = 150
    expect(entry.score).toBe(2 * 50 + 5 * 10);
    expect(entry.vehicles).toBe(2);
    expect(entry.services).toBe(5);
  });

  it("does NOT include subscriptionTier in any entry", async () => {
    mockLeaderboard();
    const res = await request(app).get("/api/profile/leaderboard");
    expect(res.status).toBe(200);
    for (const entry of res.body) {
      expect(entry).not.toHaveProperty("subscriptionTier");
    }
  });

  it("results are sorted by score descending", async () => {
    mockLeaderboard();
    const res = await request(app).get("/api/profile/leaderboard");
    expect(res.status).toBe(200);
    const scores: number[] = res.body.map((e: { score: number }) => e.score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  it("returns empty array when there are no active users", async () => {
    mockLeaderboard([]);
    const res = await request(app).get("/api/profile/leaderboard");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /api/garage/:username", () => {
  let app: express.Express;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Wire up the two DB select calls the garage handler makes:
   *   1. db.select() for the user by username
   *   2. db.select() for that user's vehicles
   */
  function mockGarageFound(user = USER_A, vehicles = VEHICLES) {
    let selectCallCount = 0;

    mockDbSelect.mockImplementation(() => {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        // User lookup
        return {
          from: () => ({
            where: () => ({
              limit: () => Promise.resolve([user]),
            }),
          }),
        };
      }
      // Vehicles lookup
      return {
        from: () => ({
          where: () => Promise.resolve(vehicles),
        }),
      };
    });
  }

  function mockGarageNotFound() {
    mockDbSelect.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
      }),
    }));
  }

  it("200 and returns user + vehicles when the username exists", async () => {
    mockGarageFound();
    const res = await request(app).get("/api/garage/Alice");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("user");
    expect(res.body).toHaveProperty("vehicles");
    expect(Array.isArray(res.body.vehicles)).toBe(true);
  });

  it("user object contains id, name, createdAt", async () => {
    mockGarageFound();
    const res = await request(app).get("/api/garage/Alice");
    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty("id");
    expect(res.body.user).toHaveProperty("name");
    expect(res.body.user).toHaveProperty("createdAt");
  });

  it("does NOT include subscriptionTier in the user object", async () => {
    mockGarageFound();
    const res = await request(app).get("/api/garage/Alice");
    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty("subscriptionTier");
  });

  it("vehicles array contains expected fields", async () => {
    mockGarageFound();
    const res = await request(app).get("/api/garage/Alice");
    expect(res.status).toBe(200);
    expect(res.body.vehicles.length).toBeGreaterThan(0);
    const v = res.body.vehicles[0];
    expect(v).toHaveProperty("id");
    expect(v).toHaveProperty("make");
    expect(v).toHaveProperty("model");
    expect(v).toHaveProperty("year");
    expect(v).toHaveProperty("type");
  });

  it("404 when username does not exist", async () => {
    mockGarageNotFound();
    const res = await request(app).get("/api/garage/nobody");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });

  it("returns empty vehicles array when user has no vehicles", async () => {
    mockGarageFound(USER_B, []);
    const res = await request(app).get("/api/garage/Bob");
    expect(res.status).toBe(200);
    expect(res.body.vehicles).toEqual([]);
  });
});
