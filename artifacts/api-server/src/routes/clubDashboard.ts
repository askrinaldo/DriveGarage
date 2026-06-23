import { Router, type IRouter } from "express";
import { eq, sql, desc, and, gte, inArray } from "drizzle-orm";
import {
  db,
  clubMembersTable,
  forumPostsTable,
  clubGarageEntriesTable,
  vehiclesTable,
  serviceRecordsTable,
} from "@workspace/db";
import { requireClubRole } from "../middleware/auth";

const router: IRouter = Router();

router.get(
  "/clubs/:clubId/dashboard",
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);

    if (isNaN(clubId)) {
      res.status(400).json({ error: "Ugyldig klubb-ID" });
      return;
    }

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      memberRows,
      membersByRole,
      forumTotalRow,
      postsByCategory,
      postsLast14Days,
      garageCountRow,
      vehiclesByType,
      recentPosts,
      meetupPosts,
      topContributors,
      garageVehicleIds,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` })
        .from(clubMembersTable)
        .where(eq(clubMembersTable.clubId, clubId)),

      db.select({ role: clubMembersTable.role, count: sql<number>`count(*)::int` })
        .from(clubMembersTable)
        .where(eq(clubMembersTable.clubId, clubId))
        .groupBy(clubMembersTable.role),

      db.select({ count: sql<number>`count(*)::int` })
        .from(forumPostsTable)
        .where(and(eq(forumPostsTable.clubId, clubId), eq(forumPostsTable.isDeleted, 0))),

      db.select({ category: forumPostsTable.category, count: sql<number>`count(*)::int` })
        .from(forumPostsTable)
        .where(and(eq(forumPostsTable.clubId, clubId), eq(forumPostsTable.isDeleted, 0)))
        .groupBy(forumPostsTable.category),

      db.select({
          day: sql<string>`to_char(created_at at time zone 'UTC', 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(forumPostsTable)
        .where(and(
          eq(forumPostsTable.clubId, clubId),
          eq(forumPostsTable.isDeleted, 0),
          gte(forumPostsTable.createdAt, fourteenDaysAgo),
        ))
        .groupBy(sql`to_char(created_at at time zone 'UTC', 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(created_at at time zone 'UTC', 'YYYY-MM-DD')`),

      db.select({ count: sql<number>`count(*)::int` })
        .from(clubGarageEntriesTable)
        .where(eq(clubGarageEntriesTable.clubId, clubId)),

      db.select({ type: vehiclesTable.type, count: sql<number>`count(*)::int` })
        .from(clubGarageEntriesTable)
        .innerJoin(vehiclesTable, eq(vehiclesTable.id, clubGarageEntriesTable.vehicleId))
        .where(eq(clubGarageEntriesTable.clubId, clubId))
        .groupBy(vehiclesTable.type),

      db.select({
          id: forumPostsTable.id,
          memberName: forumPostsTable.memberName,
          category: forumPostsTable.category,
          postType: forumPostsTable.postType,
          title: forumPostsTable.title,
          content: forumPostsTable.content,
          likesCount: forumPostsTable.likesCount,
          commentsCount: forumPostsTable.commentsCount,
          createdAt: forumPostsTable.createdAt,
        })
        .from(forumPostsTable)
        .where(and(eq(forumPostsTable.clubId, clubId), eq(forumPostsTable.isDeleted, 0)))
        .orderBy(desc(forumPostsTable.createdAt))
        .limit(6),

      db.select({
          id: forumPostsTable.id,
          memberName: forumPostsTable.memberName,
          title: forumPostsTable.title,
          content: forumPostsTable.content,
          createdAt: forumPostsTable.createdAt,
        })
        .from(forumPostsTable)
        .where(and(
          eq(forumPostsTable.clubId, clubId),
          eq(forumPostsTable.isDeleted, 0),
          eq(forumPostsTable.category, "meetup"),
          gte(forumPostsTable.createdAt, thirtyDaysAgo),
        ))
        .orderBy(desc(forumPostsTable.createdAt))
        .limit(5),

      db.select({ memberName: forumPostsTable.memberName, postCount: sql<number>`count(*)::int` })
        .from(forumPostsTable)
        .where(and(eq(forumPostsTable.clubId, clubId), eq(forumPostsTable.isDeleted, 0)))
        .groupBy(forumPostsTable.memberName)
        .orderBy(desc(sql`count(*)`))
        .limit(5),

      db.select({ vehicleId: clubGarageEntriesTable.vehicleId })
        .from(clubGarageEntriesTable)
        .where(eq(clubGarageEntriesTable.clubId, clubId))
        .limit(50),
    ]);

    const vehicleIds = garageVehicleIds.map((g) => g.vehicleId);
    const recentServiceRecords = vehicleIds.length > 0
      ? await db
          .select({
            id: serviceRecordsTable.id,
            vehicleId: serviceRecordsTable.vehicleId,
            title: serviceRecordsTable.title,
            category: serviceRecordsTable.category,
            serviceDate: serviceRecordsTable.serviceDate,
            cost: serviceRecordsTable.cost,
            vehicleName: sql<string>`concat(${vehiclesTable.make}, ' ', ${vehiclesTable.model}, ' (', ${vehiclesTable.year}, ')')`,
          })
          .from(serviceRecordsTable)
          .innerJoin(vehiclesTable, eq(vehiclesTable.id, serviceRecordsTable.vehicleId))
          .where(inArray(serviceRecordsTable.vehicleId, vehicleIds))
          .orderBy(desc(serviceRecordsTable.serviceDate))
          .limit(5)
      : [];

    const allDays: Array<{ day: string; count: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const found = postsLast14Days.find((r) => r.day === key);
      allDays.push({ day: key, count: found?.count ?? 0 });
    }

    res.json({
      memberCount: memberRows[0]?.count ?? 0,
      membersByRole,
      forumPostsCount: forumTotalRow[0]?.count ?? 0,
      postsByCategory,
      postsLast14Days: allDays,
      garageCount: garageCountRow[0]?.count ?? 0,
      vehiclesByType,
      recentPosts,
      meetupPosts,
      recentServiceRecords,
      topContributors,
    });
  }
);

export default router;
