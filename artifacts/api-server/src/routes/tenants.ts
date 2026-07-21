import { Router } from "express";
import { eq, and, ne } from "drizzle-orm";
import { randomBytes } from "crypto";
import { z } from "zod/v4";
import {
  db, usersTable, tenantsTable, tenantMembershipsTable, tenantInvitationsTable, vehiclesTable,
} from "@workspace/db";
import { parseUserAuth, requireUser, signUserToken, resolvePersonalTenant } from "../middleware/userAuth";
import { validate } from "../middleware/validate";

const router = Router();

// ─── Schemas ───────────────────────────────────────────────────────────────
const createTenantSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd").trim(),
});

const updateTenantSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd").trim(),
});

const inviteSchema = z.object({
  email: z.email("Ugyldig e-postadresse"),
  role: z.enum(["admin", "member"]).optional().default("member"),
});

const switchTenantSchema = z.object({
  tenantId: z.number().int().positive("Ugyldig tenantId"),
});

// ─── GET /tenants/mine — all tenants for current user ─────────────────────
router.get("/tenants/mine", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;

  const memberships = await db
    .select({
      tenantId: tenantMembershipsTable.tenantId,
      role: tenantMembershipsTable.role,
      tenantName: tenantsTable.name,
      tenantSlug: tenantsTable.slug,
      isPersonal: tenantsTable.isPersonal,
    })
    .from(tenantMembershipsTable)
    .innerJoin(tenantsTable, eq(tenantMembershipsTable.tenantId, tenantsTable.id))
    .where(eq(tenantMembershipsTable.userId, userId));

  res.json(memberships);
});

// ─── GET /tenants/:id — get tenant details ────────────────────────────────
router.get("/tenants/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const tenantId = parseInt(String(req.params.id), 10);
  const userId = req.userAuth!.userId;

  // Verify membership
  const [membership] = await db
    .select({ role: tenantMembershipsTable.role })
    .from(tenantMembershipsTable)
    .where(and(eq(tenantMembershipsTable.tenantId, tenantId), eq(tenantMembershipsTable.userId, userId)));

  if (!membership) {
    res.status(403).json({ error: "Ingen tilgang til denne tenanten" });
    return;
  }

  const [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tenantId));

  if (!tenant) { res.status(404).json({ error: "Tenant ikke funnet" }); return; }

  // Get members
  const members = await db
    .select({
      userId: tenantMembershipsTable.userId,
      role: tenantMembershipsTable.role,
      name: usersTable.name,
      email: usersTable.email,
      joinedAt: tenantMembershipsTable.createdAt,
    })
    .from(tenantMembershipsTable)
    .innerJoin(usersTable, eq(tenantMembershipsTable.userId, usersTable.id))
    .where(eq(tenantMembershipsTable.tenantId, tenantId));

  res.json({ ...tenant, members, myRole: membership.role });
});

// ─── POST /tenants — create a new org tenant ──────────────────────────────
router.post("/tenants", parseUserAuth, requireUser, validate(createTenantSchema), async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;
  const { name } = req.body as z.infer<typeof createTenantSchema>;

  const slug = `org-${userId}-${Date.now()}`;

  const [tenant] = await db
    .insert(tenantsTable)
    .values({ name: name.trim(), slug, isPersonal: false, ownerUserId: userId })
    .returning();

  if (!tenant) { res.status(500).json({ error: "Kunne ikke opprette tenant" }); return; }

  await db.insert(tenantMembershipsTable).values({
    tenantId: tenant.id,
    userId,
    role: "owner",
  });

  res.status(201).json(tenant);
});

// ─── PATCH /tenants/:id — update tenant name ──────────────────────────────
router.patch("/tenants/:id", parseUserAuth, requireUser, validate(updateTenantSchema), async (req, res): Promise<void> => {
  const tenantId = parseInt(String(req.params.id), 10);
  const userId = req.userAuth!.userId;
  const { name } = req.body as z.infer<typeof updateTenantSchema>;

  const [membership] = await db
    .select({ role: tenantMembershipsTable.role })
    .from(tenantMembershipsTable)
    .where(and(eq(tenantMembershipsTable.tenantId, tenantId), eq(tenantMembershipsTable.userId, userId)));

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    res.status(403).json({ error: "Krever eier- eller admin-rolle" });
    return;
  }

  const [updated] = await db
    .update(tenantsTable)
    .set({ name: name?.trim() ?? "", updatedAt: new Date() })
    .where(eq(tenantsTable.id, tenantId))
    .returning();

  res.json(updated);
});

// ─── POST /tenants/:id/invite — invite user by email ─────────────────────
router.post("/tenants/:id/invite", parseUserAuth, requireUser, validate(inviteSchema), async (req, res): Promise<void> => {
  const tenantId = parseInt(String(req.params.id), 10);
  const userId = req.userAuth!.userId;
  const { email, role } = req.body as z.infer<typeof inviteSchema>;

  const [membership] = await db
    .select({ role: tenantMembershipsTable.role })
    .from(tenantMembershipsTable)
    .where(and(eq(tenantMembershipsTable.tenantId, tenantId), eq(tenantMembershipsTable.userId, userId)));

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    res.status(403).json({ error: "Krever eier- eller admin-rolle for å invitere" });
    return;
  }

  // Check if already a member
  const [existingUser] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (existingUser) {
    const [alreadyMember] = await db
      .select({ id: tenantMembershipsTable.id })
      .from(tenantMembershipsTable)
      .where(and(eq(tenantMembershipsTable.tenantId, tenantId), eq(tenantMembershipsTable.userId, existingUser.id)));
    if (alreadyMember) {
      res.status(409).json({ error: "Brukeren er allerede medlem" });
      return;
    }
  }

  const code = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const [invitation] = await db
    .insert(tenantInvitationsTable)
    .values({ tenantId, email: email.toLowerCase().trim(), code, role, createdByUserId: userId, expiresAt })
    .returning();

  res.status(201).json({ invitation, inviteUrl: `/tenant-invite/${code}` });
});

// ─── GET /tenants/invite/:code — get invitation info ─────────────────────
router.get("/tenants/invite/:code", async (req, res): Promise<void> => {
  const code = String(req.params.code);

  const [invite] = await db
    .select({
      id: tenantInvitationsTable.id,
      email: tenantInvitationsTable.email,
      role: tenantInvitationsTable.role,
      expiresAt: tenantInvitationsTable.expiresAt,
      acceptedAt: tenantInvitationsTable.acceptedAt,
      tenantName: tenantsTable.name,
      tenantId: tenantInvitationsTable.tenantId,
    })
    .from(tenantInvitationsTable)
    .innerJoin(tenantsTable, eq(tenantInvitationsTable.tenantId, tenantsTable.id))
    .where(eq(tenantInvitationsTable.code, code));

  if (!invite) {
    res.status(404).json({ error: "Invitasjonen finnes ikke" });
    return;
  }
  if (invite.acceptedAt) {
    res.status(410).json({ error: "Invitasjonen er allerede brukt" });
    return;
  }
  if (new Date(invite.expiresAt) < new Date()) {
    res.status(410).json({ error: "Invitasjonen har utløpt" });
    return;
  }

  res.json(invite);
});

// ─── POST /tenants/invite/:code/accept — accept invitation ───────────────
router.post("/tenants/invite/:code/accept", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const code = String(req.params.code);
  const userId = req.userAuth!.userId;

  const [invite] = await db
    .select()
    .from(tenantInvitationsTable)
    .where(eq(tenantInvitationsTable.code, code));

  if (!invite || invite.acceptedAt || new Date(invite.expiresAt) < new Date()) {
    res.status(410).json({ error: "Invitasjonen er ugyldig eller utløpt" });
    return;
  }

  // Check not already a member
  const [existing] = await db
    .select({ id: tenantMembershipsTable.id })
    .from(tenantMembershipsTable)
    .where(and(eq(tenantMembershipsTable.tenantId, invite.tenantId), eq(tenantMembershipsTable.userId, userId)));

  if (!existing) {
    await db.insert(tenantMembershipsTable).values({
      tenantId: invite.tenantId,
      userId,
      role: invite.role,
    });
  }

  await db
    .update(tenantInvitationsTable)
    .set({ acceptedAt: new Date() })
    .where(eq(tenantInvitationsTable.id, invite.id));

  res.json({ tenantId: invite.tenantId, role: invite.role });
});

// ─── DELETE /tenants/:id/members/:userId — remove a member ───────────────
router.delete("/tenants/:id/members/:memberId", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const tenantId = parseInt(String(req.params.id), 10);
  const memberId = parseInt(String(req.params.memberId), 10);
  const actorId = req.userAuth!.userId;

  const [actorMembership] = await db
    .select({ role: tenantMembershipsTable.role })
    .from(tenantMembershipsTable)
    .where(and(eq(tenantMembershipsTable.tenantId, tenantId), eq(tenantMembershipsTable.userId, actorId)));

  if (!actorMembership || actorMembership.role !== "owner") {
    res.status(403).json({ error: "Kun eier kan fjerne medlemmer" });
    return;
  }
  if (memberId === actorId) {
    res.status(400).json({ error: "Du kan ikke fjerne deg selv" });
    return;
  }

  await db
    .delete(tenantMembershipsTable)
    .where(and(eq(tenantMembershipsTable.tenantId, tenantId), eq(tenantMembershipsTable.userId, memberId)));

  res.sendStatus(204);
});

// ─── POST /auth/switch-tenant — switch active tenant, returns new JWT ─────
router.post("/auth/switch-tenant", parseUserAuth, requireUser, validate(switchTenantSchema), async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;
  const { tenantId } = req.body as z.infer<typeof switchTenantSchema>;

  const [membership] = await db
    .select({ role: tenantMembershipsTable.role })
    .from(tenantMembershipsTable)
    .where(and(eq(tenantMembershipsTable.tenantId, tenantId), eq(tenantMembershipsTable.userId, userId)));

  if (!membership) {
    res.status(403).json({ error: "Du er ikke medlem av denne tenanten" });
    return;
  }

  const [tenant] = await db
    .select({ name: tenantsTable.name, isPersonal: tenantsTable.isPersonal })
    .from(tenantsTable)
    .where(eq(tenantsTable.id, tenantId));

  if (!tenant) {
    res.status(404).json({ error: "Tenant ikke funnet" });
    return;
  }

  const token = signUserToken({
    userId,
    email: req.userAuth!.email,
    name: req.userAuth!.name,
    role: req.userAuth!.role,
    tenantId,
    tenantName: tenant.name,
    tenantRole: membership.role as "owner" | "admin" | "member",
    isPersonalTenant: tenant.isPersonal,
  });

  res.json({ token, tenantId, tenantName: tenant.name, tenantRole: membership.role });
});

export default router;
