import { Router } from "express";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { db, usersTable, vehiclesTable, serviceRecordsTable, monthlyProjectsTable, monthlyProjectVotesTable } from "@workspace/db";
import { parseUserAuth, requireUser, verifyUserToken } from "../middleware/userAuth";

const router = Router();

// ─── Get current month's nominations ─────────────────────────────────────────
router.get("/projects/month", async (req, res): Promise<void> => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const projects = await db
    .select({
      id: monthlyProjectsTable.id,
      title: monthlyProjectsTable.title,
      description: monthlyProjectsTable.description,
      nominatorName: monthlyProjectsTable.nominatorName,
      voteCount: monthlyProjectsTable.voteCount,
      isWinner: monthlyProjectsTable.isWinner,
      status: monthlyProjectsTable.status,
      month: monthlyProjectsTable.month,
      year: monthlyProjectsTable.year,
      createdAt: monthlyProjectsTable.createdAt,
      vehicleId: monthlyProjectsTable.vehicleId,
    })
    .from(monthlyProjectsTable)
    .where(
      and(
        eq(monthlyProjectsTable.month, month),
        eq(monthlyProjectsTable.year, year),
      )
    )
    .orderBy(desc(monthlyProjectsTable.voteCount));

  // Join vehicle data
  const vehicleIds = projects.map(p => p.vehicleId).filter(Boolean) as number[];
  let vehicleMap: Record<number, { make: string; model: string; year: number | null; imageUrl: string | null }> = {};
  if (vehicleIds.length > 0) {
    const vehicles = await db
      .select({ id: vehiclesTable.id, make: vehiclesTable.make, model: vehiclesTable.model, year: vehiclesTable.year, imageUrl: vehiclesTable.imageUrl })
      .from(vehiclesTable)
      .where(sql`${vehiclesTable.id} = ANY(${vehicleIds})`);
    vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  }

  // Get userId for current user if logged in (to check if they voted)
  const authHeader = req.headers["x-user-token"];
  let myUserId: number | null = null;
  if (authHeader) {
    try {
      const payload = verifyUserToken(String(authHeader));
      myUserId = payload?.userId ?? null;
    } catch { /* ok */ }
  }

  // Check which projects current user voted on
  let myVotes: Set<number> = new Set();
  if (myUserId) {
    const votes = await db
      .select({ projectId: monthlyProjectVotesTable.projectId })
      .from(monthlyProjectVotesTable)
      .where(eq(monthlyProjectVotesTable.userId, myUserId));
    myVotes = new Set(votes.map(v => v.projectId).filter((id): id is number => id !== null));
  }

  const result = projects.map(p => ({
    ...p,
    vehicle: p.vehicleId ? (vehicleMap[p.vehicleId] ?? null) : null,
    hasVoted: myVotes.has(p.id),
  }));

  res.json({ month, year, projects: result });
});

// ─── Get past winners ─────────────────────────────────────────────────────────
router.get("/projects/winners", async (req, res): Promise<void> => {
  const winners = await db
    .select({
      id: monthlyProjectsTable.id,
      title: monthlyProjectsTable.title,
      nominatorName: monthlyProjectsTable.nominatorName,
      voteCount: monthlyProjectsTable.voteCount,
      month: monthlyProjectsTable.month,
      year: monthlyProjectsTable.year,
      vehicleId: monthlyProjectsTable.vehicleId,
    })
    .from(monthlyProjectsTable)
    .where(eq(monthlyProjectsTable.isWinner, true))
    .orderBy(desc(monthlyProjectsTable.year), desc(monthlyProjectsTable.month))
    .limit(12);

  const vehicleIds = winners.map(w => w.vehicleId).filter(Boolean) as number[];
  let vehicleMap: Record<number, { make: string; model: string; year: number | null; imageUrl: string | null }> = {};
  if (vehicleIds.length > 0) {
    const vehicles = await db
      .select({ id: vehiclesTable.id, make: vehiclesTable.make, model: vehiclesTable.model, year: vehiclesTable.year, imageUrl: vehiclesTable.imageUrl })
      .from(vehiclesTable)
      .where(sql`${vehiclesTable.id} = ANY(${vehicleIds})`);
    vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));
  }

  res.json(winners.map(w => ({ ...w, vehicle: w.vehicleId ? (vehicleMap[w.vehicleId] ?? null) : null })));
});

// ─── Nominate a vehicle ───────────────────────────────────────────────────────
router.post("/projects/month/nominate", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;
  const { vehicleId, title, description } = req.body as { vehicleId: number; title: string; description?: string };

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Check if user already nominated this month
  const [existing] = await db
    .select({ id: monthlyProjectsTable.id })
    .from(monthlyProjectsTable)
    .where(and(
      eq(monthlyProjectsTable.nominatedByUserId, userId),
      eq(monthlyProjectsTable.month, month),
      eq(monthlyProjectsTable.year, year),
    ));

  if (existing) {
    res.status(400).json({ error: "Du har allerede nominert et prosjekt denne måneden" });
    return;
  }

  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));

  const [project] = await db
    .insert(monthlyProjectsTable)
    .values({
      vehicleId,
      nominatedByUserId: userId,
      nominatorName: user?.name ?? "Anonym",
      title,
      description: description ?? null,
      month,
      year,
    })
    .returning();

  res.status(201).json(project);
});

// ─── Vote for a project ───────────────────────────────────────────────────────
router.post("/projects/month/:id/vote", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;
  const projectId = parseInt(String(req.params.id), 10);

  // Check already voted
  const [existingVote] = await db
    .select({ id: monthlyProjectVotesTable.id })
    .from(monthlyProjectVotesTable)
    .where(and(
      eq(monthlyProjectVotesTable.projectId, projectId),
      eq(monthlyProjectVotesTable.userId, userId),
    ));

  if (existingVote) {
    // Unvote
    await db.delete(monthlyProjectVotesTable).where(eq(monthlyProjectVotesTable.id, existingVote.id));
    await db.update(monthlyProjectsTable)
      .set({ voteCount: sql`${monthlyProjectsTable.voteCount} - 1` })
      .where(eq(monthlyProjectsTable.id, projectId));
    res.json({ voted: false });
    return;
  }

  await db.insert(monthlyProjectVotesTable).values({ projectId, userId });
  await db.update(monthlyProjectsTable)
    .set({ voteCount: sql`${monthlyProjectsTable.voteCount} + 1` })
    .where(eq(monthlyProjectsTable.id, projectId));

  res.json({ voted: true });
});

// ─── Profile: me ─────────────────────────────────────────────────────────────
router.get("/profile/me", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;

  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      subscriptionTier: usersTable.subscriptionTier,
      subscriptionStatus: usersTable.subscriptionStatus,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) { res.status(404).json({ error: "Bruker ikke funnet" }); return; }

  const [vehicleCount] = await db.select({ cnt: count() }).from(vehiclesTable).where(eq(vehiclesTable.userId, userId));
  const [serviceCount] = await db.select({ cnt: count() }).from(serviceRecordsTable)
    .where(sql`${serviceRecordsTable.vehicleId} IN (SELECT id FROM vehicles WHERE user_id = ${userId})`);

  // Platform score
  const score = (Number(vehicleCount?.cnt ?? 0) * 50) + (Number(serviceCount?.cnt ?? 0) * 10);

  res.json({
    ...user,
    stats: {
      vehicleCount: Number(vehicleCount?.cnt ?? 0),
      serviceCount: Number(serviceCount?.cnt ?? 0),
      score,
    },
  });
});

// ─── Leaderboard ─────────────────────────────────────────────────────────────
router.get("/profile/leaderboard", async (req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      subscriptionTier: usersTable.subscriptionTier,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.isActive, true))
    .orderBy(usersTable.id)
    .limit(100);

  const vehicleCounts = await db
    .select({ userId: vehiclesTable.userId, cnt: count() })
    .from(vehiclesTable)
    .groupBy(vehiclesTable.userId);

  const vehicleMap = new Map(vehicleCounts.map(v => [v.userId, Number(v.cnt)]));

  // Service records per user via subquery
  const serviceRows = await db.execute(sql`
    SELECT v.user_id, COUNT(sr.id)::int AS cnt
    FROM vehicles v
    LEFT JOIN service_records sr ON sr.vehicle_id = v.id
    GROUP BY v.user_id
  `);
  const serviceMap = new Map((serviceRows.rows as Array<{user_id: number; cnt: number}>).map(r => [r.user_id, r.cnt]));

  const scored = users.map(u => {
    const vehicles = vehicleMap.get(u.id) ?? 0;
    const services = serviceMap.get(u.id) ?? 0;
    const score = vehicles * 50 + services * 10;
    return { ...u, vehicles, services, score };
  });

  scored.sort((a, b) => b.score - a.score);

  res.json(scored.slice(0, 20));
});

export default router;
