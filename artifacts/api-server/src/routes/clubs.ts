import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, clubsTable, clubMembersTable } from "@workspace/db";
import {
  CreateClubBody,
  UpdateClubBody,
  JoinClubBody,
  UpdateClubMemberBody,
  GetClubParams,
  UpdateClubParams,
  DeleteClubParams,
  JoinClubParams,
  UpdateClubMemberParams,
  LeaveClubParams,
  ListClubMembersParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getClubWithCount(id: number) {
  const [club] = await db
    .select({
      id: clubsTable.id,
      name: clubsTable.name,
      description: clubsTable.description,
      logoUrl: clubsTable.logoUrl,
      bannerUrl: clubsTable.bannerUrl,
      location: clubsTable.location,
      clubType: clubsTable.clubType,
      ownerName: clubsTable.ownerName,
      createdAt: clubsTable.createdAt,
      updatedAt: clubsTable.updatedAt,
      memberCount: sql<number>`cast(count(${clubMembersTable.id}) as int)`,
    })
    .from(clubsTable)
    .leftJoin(clubMembersTable, eq(clubMembersTable.clubId, clubsTable.id))
    .where(eq(clubsTable.id, id))
    .groupBy(clubsTable.id);
  return club ?? null;
}

router.get("/clubs", async (req, res): Promise<void> => {
  const { type } = req.query;
  const clubs = await db
    .select({
      id: clubsTable.id,
      name: clubsTable.name,
      description: clubsTable.description,
      logoUrl: clubsTable.logoUrl,
      bannerUrl: clubsTable.bannerUrl,
      location: clubsTable.location,
      clubType: clubsTable.clubType,
      ownerName: clubsTable.ownerName,
      createdAt: clubsTable.createdAt,
      updatedAt: clubsTable.updatedAt,
      memberCount: sql<number>`cast(count(${clubMembersTable.id}) as int)`,
    })
    .from(clubsTable)
    .leftJoin(clubMembersTable, eq(clubMembersTable.clubId, clubsTable.id))
    .groupBy(clubsTable.id);

  const filtered =
    type && typeof type === "string"
      ? clubs.filter((c) => c.clubType === type || c.clubType === "both")
      : clubs;
  res.json(filtered);
});

router.post("/clubs", async (req, res): Promise<void> => {
  const parsed = CreateClubBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ugyldig input", details: parsed.error.issues });
    return;
  }
  const { ownerName, ...clubData } = parsed.data;
  const [club] = await db
    .insert(clubsTable)
    .values({ ...clubData, ownerName: ownerName! })
    .returning();
  await db.insert(clubMembersTable).values({
    clubId: club.id,
    memberName: ownerName!,
    role: "owner",
  });
  const full = await getClubWithCount(club.id);
  res.status(201).json(full);
});

router.get("/clubs/:id", async (req, res): Promise<void> => {
  const params = GetClubParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const club = await getClubWithCount(params.data.id);
  if (!club) {
    res.status(404).json({ error: "Klubb ikke funnet" });
    return;
  }
  const members = await db
    .select()
    .from(clubMembersTable)
    .where(eq(clubMembersTable.clubId, params.data.id))
    .orderBy(clubMembersTable.joinedAt);
  res.json({ ...club, members });
});

router.patch("/clubs/:id", async (req, res): Promise<void> => {
  const params = UpdateClubParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClubBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ugyldig input", details: parsed.error.issues });
    return;
  }
  const [existing] = await db.select().from(clubsTable).where(eq(clubsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Klubb ikke funnet" });
    return;
  }
  await db.update(clubsTable).set(parsed.data).where(eq(clubsTable.id, params.data.id));
  const updated = await getClubWithCount(params.data.id);
  res.json(updated);
});

router.delete("/clubs/:id", async (req, res): Promise<void> => {
  const params = DeleteClubParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(clubsTable).where(eq(clubsTable.id, params.data.id));
  res.status(204).send();
});

router.get("/clubs/:clubId/members", async (req, res): Promise<void> => {
  const params = ListClubMembersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const members = await db
    .select()
    .from(clubMembersTable)
    .where(eq(clubMembersTable.clubId, params.data.clubId))
    .orderBy(clubMembersTable.joinedAt);
  res.json(members);
});

router.post("/clubs/:clubId/members", async (req, res): Promise<void> => {
  const params = JoinClubParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = JoinClubBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ugyldig input", details: parsed.error.issues });
    return;
  }
  const existing = await db
    .select()
    .from(clubMembersTable)
    .where(eq(clubMembersTable.clubId, params.data.clubId));
  const alreadyMember = existing.find(
    (m) => m.memberName.toLowerCase() === parsed.data.memberName.toLowerCase()
  );
  if (alreadyMember) {
    res.status(409).json({ error: "Allerede medlem av klubben" });
    return;
  }
  const [member] = await db
    .insert(clubMembersTable)
    .values({ clubId: params.data.clubId, memberName: parsed.data.memberName, role: "member" })
    .returning();
  res.status(201).json(member);
});

router.patch("/clubs/:clubId/members/:memberId", async (req, res): Promise<void> => {
  const params = UpdateClubMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClubMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ugyldig input", details: parsed.error.issues });
    return;
  }
  const [existing] = await db
    .select()
    .from(clubMembersTable)
    .where(eq(clubMembersTable.id, params.data.memberId));
  if (!existing) {
    res.status(404).json({ error: "Medlem ikke funnet" });
    return;
  }
  const [updated] = await db
    .update(clubMembersTable)
    .set({ role: parsed.data.role })
    .where(eq(clubMembersTable.id, params.data.memberId))
    .returning();
  res.json(updated);
});

router.delete("/clubs/:clubId/members/:memberId", async (req, res): Promise<void> => {
  const params = LeaveClubParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(clubMembersTable).where(eq(clubMembersTable.id, params.data.memberId));
  res.status(204).send();
});

export default router;
