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
import { parseAuth, requireClubRole } from "../middleware/auth";
import { parseUserAuth, requireUser } from "../middleware/userAuth";
import { audit } from "../lib/audit";
import { logger } from "../lib/logger";

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
      isPrivate: clubsTable.isPrivate,
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
      isPrivate: clubsTable.isPrivate,
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

// ─── Protected: create club — requires authenticated user ─────────────────────
router.post("/clubs", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const parsed = CreateClubBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Ugyldig input", details: parsed.error.issues });
    return;
  }

  // ownerName is always derived from the authenticated user — never trusted from the body
  const ownerName = req.userAuth!.name || req.userAuth!.email;
  const { ownerName: _ignored, ...clubData } = parsed.data;

  const [club] = await db
    .insert(clubsTable)
    .values({ ...clubData, ownerName })
    .returning();
  await db.insert(clubMembersTable).values({
    clubId: club.id,
    memberName: ownerName,
    role: "owner",
  });
  await audit({
    clubId: club.id,
    actorName: ownerName,
    action: "club.created",
    targetType: "club",
    targetId: club.id,
    targetName: club.name,
  });
  const full = await getClubWithCount(club.id);
  res.status(201).json(full);
});

// ─── GET /clubs/:id — public basic info; members hidden for private clubs ─────
router.get("/clubs/:id", parseAuth, async (req, res): Promise<void> => {
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

  // For private clubs, only members (valid club session) see the member list
  const isMember =
    req.auth &&
    req.auth.clubId === params.data.id;

  if (club.isPrivate && !isMember) {
    // Return limited public info — no member list
    res.json({
      id: club.id,
      name: club.name,
      description: club.description,
      logoUrl: club.logoUrl,
      bannerUrl: club.bannerUrl,
      location: club.location,
      clubType: club.clubType,
      ownerName: club.ownerName,
      isPrivate: club.isPrivate,
      createdAt: club.createdAt,
      updatedAt: club.updatedAt,
      memberCount: club.memberCount,
      members: [], // hidden
    });
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

// ─── GET /clubs/:clubId/members — private clubs require club session ──────────
router.get("/clubs/:clubId/members", parseAuth, async (req, res): Promise<void> => {
  const params = ListClubMembersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Check if club is private
  const [club] = await db
    .select({ isPrivate: clubsTable.isPrivate })
    .from(clubsTable)
    .where(eq(clubsTable.id, params.data.clubId));

  if (!club) {
    res.status(404).json({ error: "Klubb ikke funnet" });
    return;
  }

  if (club.isPrivate) {
    const isMember = req.auth && req.auth.clubId === params.data.clubId;
    if (!isMember) {
      res.status(403).json({ error: "Kun klubbmedlemmer kan se medlemslisten." });
      return;
    }
  }

  const members = await db
    .select()
    .from(clubMembersTable)
    .where(eq(clubMembersTable.clubId, params.data.clubId))
    .orderBy(clubMembersTable.joinedAt);
  res.json(members);
});

// ─── Protected: join club — requires authenticated user ───────────────────────
router.post("/clubs/:clubId/members", parseUserAuth, requireUser, async (req, res): Promise<void> => {
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

  // memberName is always the authenticated user's display name — never trusted from body
  const memberName = req.userAuth!.name || req.userAuth!.email;

  const existing = await db
    .select()
    .from(clubMembersTable)
    .where(eq(clubMembersTable.clubId, params.data.clubId));
  const alreadyMember = existing.find(
    (m) => m.memberName.toLowerCase() === memberName.toLowerCase()
  );
  if (alreadyMember) {
    res.status(409).json({ error: "Allerede medlem av klubben" });
    return;
  }

  const [clubInfo] = await db
    .select({ joinMode: clubsTable.joinMode })
    .from(clubsTable)
    .where(eq(clubsTable.id, params.data.clubId));
  if (!clubInfo) {
    res.status(404).json({ error: "Klubb ikke funnet" });
    return;
  }
  if (clubInfo.joinMode === "invite_only") {
    res.status(403).json({ error: "Denne klubben krever invitasjon for å bli med." });
    return;
  }

  const [member] = await db
    .insert(clubMembersTable)
    .values({ clubId: params.data.clubId, memberName, role: "member" })
    .returning();

  logger.info({ userId: req.userAuth!.userId, clubId: params.data.clubId }, "User joined club");
  await audit({
    clubId: params.data.clubId,
    actorName: memberName,
    action: "member.joined",
    targetType: "member",
    targetName: memberName,
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
      logger.warn(
        { actorRole: req.auth?.role, targetRole: target.role, clubId: params.data.clubId },
        "Unauthorized club member removal attempt"
      );
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
