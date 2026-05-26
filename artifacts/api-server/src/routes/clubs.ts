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
import { requireClubRole } from "../middleware/auth";
import { audit } from "../lib/audit";

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

// ─── Public routes ────────────────────────────────────────────────────────────

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
  await audit({
    clubId: club.id,
    actorName: ownerName!,
    action: "club.created",
    targetType: "club",
    targetId: club.id,
    targetName: club.name,
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

// ─── Protected: edit club — requires admin ────────────────────────────────────
router.patch(
  "/clubs/:id",
  requireClubRole("admin"),
  async (req, res): Promise<void> => {
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
    await audit({
      clubId: params.data.id,
      actorName: req.auth!.memberName,
      action: "club.updated",
      targetType: "club",
      targetId: params.data.id,
      targetName: existing.name,
    });
    const updated = await getClubWithCount(params.data.id);
    res.json(updated);
  }
);

// ─── Protected: delete club — requires owner ──────────────────────────────────
router.delete(
  "/clubs/:id",
  requireClubRole("owner"),
  async (req, res): Promise<void> => {
    const params = DeleteClubParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [club] = await db.select().from(clubsTable).where(eq(clubsTable.id, params.data.id));
    await db.delete(clubsTable).where(eq(clubsTable.id, params.data.id));
    await audit({
      clubId: params.data.id,
      actorName: req.auth!.memberName,
      action: "club.deleted",
      targetType: "club",
      targetId: params.data.id,
      targetName: club?.name ?? String(params.data.id),
    });
    res.status(204).send();
  }
);

// ─── Public: list members ─────────────────────────────────────────────────────
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

// ─── Public: join club ────────────────────────────────────────────────────────
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
  await audit({
    clubId: params.data.clubId,
    actorName: parsed.data.memberName,
    action: "member.joined",
    targetType: "member",
    targetName: parsed.data.memberName,
  });
  res.status(201).json(member);
});

// ─── Protected: update member role — requires admin ───────────────────────────
router.patch(
  "/clubs/:clubId/members/:memberId",
  requireClubRole("admin"),
  async (req, res): Promise<void> => {
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

    const ROLE_ORDER: Record<string, number> = { owner: 4, admin: 3, moderator: 2, member: 1 };
    const actorRank = ROLE_ORDER[req.auth!.role] ?? 0;
    const targetRank = ROLE_ORDER[parsed.data.role] ?? 0;

    // Admins cannot promote to owner or equal/higher than themselves
    if (req.auth!.role !== "owner" && targetRank >= actorRank) {
      res.status(403).json({ error: "Du kan ikke gi en rolle som er lik eller høyere enn din egen." });
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

    // Cannot change the role of someone with a higher or equal rank
    const existingRank = ROLE_ORDER[existing.role ?? "member"] ?? 0;
    if (actorRank <= existingRank && req.auth!.role !== "owner") {
      res.status(403).json({ error: "Du kan ikke endre rollen til et medlem med høyere eller lik rang." });
      return;
    }

    const [updated] = await db
      .update(clubMembersTable)
      .set({ role: parsed.data.role })
      .where(eq(clubMembersTable.id, params.data.memberId))
      .returning();

    await audit({
      clubId: params.data.clubId,
      actorName: req.auth!.memberName,
      action: "member.role_changed",
      targetType: "member",
      targetId: params.data.memberId,
      targetName: existing.memberName,
      metadata: { oldRole: existing.role, newRole: parsed.data.role },
    });

    res.json(updated);
  }
);

// ─── Protected: remove member — requires admin (or self-leave) ────────────────
router.delete("/clubs/:clubId/members/:memberId", async (req, res): Promise<void> => {
  const params = LeaveClubParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [target] = await db
    .select()
    .from(clubMembersTable)
    .where(eq(clubMembersTable.id, params.data.memberId));

  if (!target) {
    res.status(404).json({ error: "Medlem ikke funnet" });
    return;
  }

  // Self-leave is always allowed; removing others requires admin+
  const isSelf = req.auth && req.auth.memberName === target.memberName && req.auth.clubId === params.data.clubId;
  if (!isSelf) {
    const ROLE_ORDER: Record<string, number> = { owner: 4, admin: 3, moderator: 2, member: 1 };
    const actorRank = ROLE_ORDER[req.auth?.role ?? ""] ?? 0;
    const targetRank = ROLE_ORDER[target.role ?? "member"] ?? 0;
    if (actorRank < 3 || actorRank <= targetRank) {
      res.status(403).json({ error: "Utilstrekkelig tilgang til å fjerne dette medlemmet." });
      return;
    }
  }

  await db.delete(clubMembersTable).where(eq(clubMembersTable.id, params.data.memberId));
  await audit({
    clubId: params.data.clubId,
    actorName: req.auth?.memberName ?? "anonym",
    action: isSelf ? "member.left" : "member.removed",
    targetType: "member",
    targetId: params.data.memberId,
    targetName: target.memberName,
  });
  res.status(204).send();
});

export default router;
