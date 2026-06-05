import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, badgeDefinitionsTable, userAchievementsTable, userPointsTable } from "@workspace/db";
import { parseAuth, requireClubRole } from "../middleware/auth";

const router: IRouter = Router();

const BADGE_DEFS = [
  { slug: "first_vehicle", name: "Første kjøretøy", description: "Registrerte sitt første kjøretøy", icon: "🚗", category: "milestone" as const, points: 50 },
  { slug: "first_service", name: "Første service", description: "Logget første serviceoppføring", icon: "🔧", category: "maintenance" as const, points: 30 },
  { slug: "ten_services", name: "Flittig mekaniker", description: "10 serviceoppføringer logget", icon: "⚙️", category: "maintenance" as const, points: 100 },
  { slug: "fifty_services", name: "Veteran mekaniker", description: "50 serviceoppføringer logget", icon: "🏆", category: "milestone" as const, points: 300 },
  { slug: "first_receipt", name: "Kvittering", description: "Lastet opp første kvittering", icon: "🧾", category: "activity" as const, points: 20 },
  { slug: "club_member", name: "Klubbmedlem", description: "Meldte seg inn i en klubb", icon: "🤝", category: "social" as const, points: 25 },
  { slug: "forum_poster", name: "Debattant", description: "Postet første foruminnlegg", icon: "💬", category: "social" as const, points: 20 },
  { slug: "forum_active", name: "Aktiv debattant", description: "10 foruminnlegg", icon: "📣", category: "social" as const, points: 75 },
  { slug: "event_organizer", name: "Arrangør", description: "Opprettet et klubbarrangement", icon: "📅", category: "social" as const, points: 60 },
  { slug: "event_attendee", name: "Deltaker", description: "Meldt seg på et arrangement", icon: "✅", category: "activity" as const, points: 15 },
  { slug: "project_month", name: "Månedens prosjekt", description: "Ble kåret til månedens prosjekt", icon: "⭐", category: "special" as const, points: 200 },
  { slug: "mileage_10k", name: "10 000 km", description: "Kjøretøy med mer enn 10 000 km registrert", icon: "🛣️", category: "milestone" as const, points: 50 },
  { slug: "classic_owner", name: "Klassiker-eier", description: "Eier et kjøretøy fra før 1980", icon: "🏛️", category: "milestone" as const, points: 100 },
  { slug: "photo_upload", name: "Fotograf", description: "Lastet opp et bilde av kjøretøyet", icon: "📸", category: "activity" as const, points: 15 },
  { slug: "marketplace_seller", name: "Markedsplass-selger", description: "Publiserte en annonse på markedsplassen", icon: "🏷️", category: "activity" as const, points: 20 },
];

async function seedBadges() {
  const existing = await db.select().from(badgeDefinitionsTable);
  const existingSlugs = new Set(existing.map((b) => b.slug));
  const toInsert = BADGE_DEFS.filter((b) => !existingSlugs.has(b.slug));
  if (toInsert.length > 0) {
    await db.insert(badgeDefinitionsTable).values(toInsert);
  }
}

// Bootstrap badges on first request
let seeded = false;
async function ensureSeeded() {
  if (!seeded) { await seedBadges(); seeded = true; }
}

// ─── Get user achievements ────────────────────────────────────────────────────
router.get("/users/:memberName/achievements", async (req, res): Promise<void> => {
  await ensureSeeded();
  const memberName = String(req.params.memberName);

  const achievements = await db
    .select()
    .from(userAchievementsTable)
    .where(eq(userAchievementsTable.memberName, memberName))
    .orderBy(desc(userAchievementsTable.earnedAt));

  const allBadges = await db.select().from(badgeDefinitionsTable);

  const totalPoints = await db
    .select({ total: sql<number>`coalesce(sum(points), 0)::int` })
    .from(userPointsTable)
    .where(eq(userPointsTable.memberName, memberName));

  res.json({
    memberName,
    achievements,
    allBadges,
    totalPoints: totalPoints[0]?.total ?? 0,
  });
});

// ─── Get club leaderboard ─────────────────────────────────────────────────────
router.get("/clubs/:clubId/leaderboard", async (req, res): Promise<void> => {
  const clubId = parseInt(String(req.params.clubId), 10);

  const rows = await db
    .select({
      memberName: userPointsTable.memberName,
      total: sql<number>`coalesce(sum(${userPointsTable.points}), 0)::int`,
    })
    .from(userPointsTable)
    .where(eq(userPointsTable.clubId, clubId))
    .groupBy(userPointsTable.memberName)
    .orderBy(desc(sql`sum(${userPointsTable.points})`))
    .limit(20);

  res.json(rows);
});

// ─── Award badge (internal helper exposed for testing) ───────────────────────
router.post(
  "/api/clubs/:clubId/award-badge",
  parseAuth,
  requireClubRole("moderator"),
  async (req, res): Promise<void> => {
    await ensureSeeded();
    const clubId = parseInt(String(req.params.clubId), 10);
    const { targetMember, badgeSlug } = req.body as { targetMember: string; badgeSlug: string };

    const [badge] = await db
      .select()
      .from(badgeDefinitionsTable)
      .where(eq(badgeDefinitionsTable.slug, badgeSlug));

    if (!badge) {
      res.status(404).json({ error: "Badge ikke funnet" });
      return;
    }

    const [existing] = await db
      .select()
      .from(userAchievementsTable)
      .where(
        and(
          eq(userAchievementsTable.memberName, targetMember),
          eq(userAchievementsTable.badgeSlug, badgeSlug)
        )
      );

    if (existing) {
      res.status(409).json({ error: "Brukeren har allerede denne badgen" });
      return;
    }

    const [achievement] = await db
      .insert(userAchievementsTable)
      .values({ memberName: targetMember, clubId, badgeSlug })
      .returning();

    await db.insert(userPointsTable).values({
      memberName: targetMember,
      clubId,
      points: badge.points,
      reason: `Badge: ${badge.name}`,
      referenceType: "badge",
    });

    res.status(201).json({ achievement, badge });
  }
);

export { ensureSeeded, BADGE_DEFS };
export default router;
