import { Router } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, usersTable, vehiclesTable, serviceRecordsTable } from "@workspace/db";
import { parseUserAuth, requireUser } from "../middleware/userAuth";

const router = Router();

// ─── Profile: me ─────────────────────────────────────────────────────────────
router.get("/profile/me", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;

  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) { res.status(404).json({ error: "Bruker ikke funnet" }); return; }

  const [vehicleCount] = await db.select({ cnt: count() }).from(vehiclesTable).where(eq(vehiclesTable.userId, userId));
  const [serviceCount] = await db.select({ cnt: count() }).from(serviceRecordsTable)
    .where(sql`${serviceRecordsTable.vehicleId} IN (SELECT id FROM vehicles WHERE user_id = ${userId})`);

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

  const serviceRows = await db.execute(sql`
    SELECT v.user_id, COUNT(sr.id)::int AS cnt
    FROM vehicles v
    LEFT JOIN service_records sr ON sr.vehicle_id = v.id
    GROUP BY v.user_id
  `);
  const serviceMap = new Map((serviceRows.rows as Array<{ user_id: number; cnt: number }>).map(r => [r.user_id, r.cnt]));

  const scored = users.map(u => {
    const vehicles = vehicleMap.get(u.id) ?? 0;
    const services = serviceMap.get(u.id) ?? 0;
    const score = vehicles * 50 + services * 10;
    return { ...u, vehicles, services, score };
  });

  scored.sort((a, b) => b.score - a.score);

  res.json(scored.slice(0, 20));
});

// ─── Public garage profile by name ───────────────────────────────────────────
router.get("/garage/:username", async (req, res): Promise<void> => {
  const { username } = req.params;

  const [user] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      subscriptionTier: usersTable.subscriptionTier,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.name, String(username)))
    .limit(1);

  if (!user) { res.status(404).json({ error: "Bruker ikke funnet" }); return; }

  const vehicles = await db
    .select({
      id: vehiclesTable.id,
      make: vehiclesTable.make,
      model: vehiclesTable.model,
      year: vehiclesTable.year,
      type: vehiclesTable.type,
      color: vehiclesTable.color,
      mileage: vehiclesTable.mileage,
      imageUrl: vehiclesTable.imageUrl,
    })
    .from(vehiclesTable)
    .where(eq(vehiclesTable.userId, user.id));

  res.json({ user, vehicles });
});

export default router;
