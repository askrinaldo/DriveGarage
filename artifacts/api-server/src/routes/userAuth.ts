import { Router, type IRouter } from "express";
import { eq, desc, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";
import {
  db, usersTable, clubsTable, vehiclesTable, forumPostsTable, forumCommentsTable,
  tenantsTable, tenantMembershipsTable,
} from "@workspace/db";
import { signUserToken, requireUser, requireSuperAdmin, parseUserAuth, resolvePersonalTenant } from "../middleware/userAuth";
import { authRateLimit } from "../middleware/rateLimiter";
import { validate } from "../middleware/validate";

const router: IRouter = Router();

// ─── Shared helper: get or create personal tenant ──────────────────────────
async function getOrCreatePersonalTenant(userId: number, userName: string): Promise<{ tenantId: number; tenantName: string; tenantRole: "owner"; isPersonalTenant: boolean }> {
  const slug = `personal-${userId}`;

  const [existing] = await db
    .select({ id: tenantsTable.id, name: tenantsTable.name })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, slug));

  if (existing) {
    return { tenantId: existing.id, tenantName: existing.name, tenantRole: "owner", isPersonalTenant: true };
  }

  const tenantName = `${userName}'s Garasje`;
  const [tenant] = await db
    .insert(tenantsTable)
    .values({ name: tenantName, slug, isPersonal: true, ownerUserId: userId })
    .returning({ id: tenantsTable.id });

  if (!tenant) throw new Error("Kunne ikke opprette tenant");

  await db.insert(tenantMembershipsTable).values({ tenantId: tenant.id, userId, role: "owner" });

  return { tenantId: tenant.id, tenantName, tenantRole: "owner", isPersonalTenant: true };
}

// ─── Schemas ───────────────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd").trim(),
  email: z.email("Ugyldig e-postadresse"),
  password: z.string().min(6, "Passordet må være minst 6 tegn"),
});

const loginSchema = z.object({
  email: z.email("Ugyldig e-postadresse"),
  password: z.string().min(1, "Passord er påkrevd"),
});

const preferencesSchema = z.object({
  themeAccent: z.enum(["kobber", "blå", "rød", "grønn", "gul", "lilla", "grå"]).optional(),
  themeMode: z.enum(["dark", "light", "auto"]).optional(),
}).strict();

const adminUpdateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(["user", "super_admin"]).optional(),
});

const adminSuspendClubSchema = z.object({
  suspend: z.boolean(),
  reason: z.string().optional(),
});

// ─── Register ──────────────────────────────────────────────────────────────
router.post("/users/register", authRateLimit, validate(registerSchema), async (req, res): Promise<void> => {
  const { name, email, password } = req.body as z.infer<typeof registerSchema>;

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()));

  if (existing.length > 0) {
    res.status(409).json({ error: "E-postadressen er allerede i bruk" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "user",
    })
    .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role });

  if (!user) {
    res.status(500).json({ error: "Kunne ikke opprette bruker" });
    return;
  }

  // Auto-create personal tenant
  const tenantInfo = await getOrCreatePersonalTenant(user.id, user.name);

  const token = signUserToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "user" | "super_admin",
    ...tenantInfo,
  });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      themeAccent: null,
      themeMode: null,
      tenantId: tenantInfo.tenantId,
      tenantName: tenantInfo.tenantName,
      tenantRole: tenantInfo.tenantRole,
      isPersonalTenant: tenantInfo.isPersonalTenant,
    },
  });
});

// ─── Login ─────────────────────────────────────────────────────────────────
router.post("/users/login", authRateLimit, validate(loginSchema), async (req, res): Promise<void> => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()));

  if (!user) {
    res.status(401).json({ error: "Feil e-post eller passord" });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Kontoen er deaktivert" });
    return;
  }

  if (!user.passwordHash) {
    res.status(401).json({ error: "Denne kontoen bruker Clerk-innlogging. Logg inn via innloggingssiden." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Feil e-post eller passord" });
    return;
  }

  // Resolve active tenant (personal tenant is default)
  const tenantInfo = await getOrCreatePersonalTenant(user.id, user.name);

  const token = signUserToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "user" | "super_admin",
    ...tenantInfo,
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      themeAccent: user.themeAccent ?? null,
      themeMode: user.themeMode ?? null,
      tenantId: tenantInfo.tenantId,
      tenantName: tenantInfo.tenantName,
      tenantRole: tenantInfo.tenantRole,
      isPersonalTenant: tenantInfo.isPersonalTenant,
    },
  });
});

// ─── Me ────────────────────────────────────────────────────────────────────
router.get("/users/me", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, isActive: usersTable.isActive, themeAccent: usersTable.themeAccent, themeMode: usersTable.themeMode })
    .from(usersTable)
    .where(eq(usersTable.id, req.userAuth!.userId));

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Bruker ikke funnet" });
    return;
  }

  res.json({
    ...user,
    tenantId: req.userAuth!.tenantId,
    tenantName: req.userAuth!.tenantName,
    tenantRole: req.userAuth!.tenantRole,
    isPersonalTenant: req.userAuth!.isPersonalTenant,
  });
});

// ─── Update preferences ────────────────────────────────────────────────────
router.patch("/users/me/preferences", parseUserAuth, requireUser, validate(preferencesSchema), async (req, res): Promise<void> => {
  const { themeAccent, themeMode } = req.body as z.infer<typeof preferencesSchema>;

  const [updated] = await db
    .update(usersTable)
    .set({
      ...(themeAccent !== undefined ? { themeAccent } : {}),
      ...(themeMode !== undefined ? { themeMode } : {}),
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, req.userAuth!.userId))
    .returning({ themeAccent: usersTable.themeAccent, themeMode: usersTable.themeMode });

  if (!updated) {
    res.status(404).json({ error: "Bruker ikke funnet" });
    return;
  }

  res.json(updated);
});

// ─── Admin: list users ─────────────────────────────────────────────────────
router.get("/admin/users", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const { q } = req.query as { q?: string };

  const users = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, isActive: usersTable.isActive, createdAt: usersTable.createdAt })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  const filtered = q
    ? users.filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
    : users;

  res.json(filtered);
});

// ─── Admin: update user ────────────────────────────────────────────────────
router.patch("/admin/users/:id", parseUserAuth, requireSuperAdmin, validate(adminUpdateUserSchema), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { isActive, role } = req.body as z.infer<typeof adminUpdateUserSchema>;

  const [updated] = await db
    .update(usersTable)
    .set({
      ...(isActive !== undefined ? { isActive } : {}),
      ...(role !== undefined ? { role } : {}),
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, isActive: usersTable.isActive });

  if (!updated) {
    res.status(404).json({ error: "Bruker ikke funnet" });
    return;
  }
  res.json(updated);
});

// ─── Admin: list clubs ─────────────────────────────────────────────────────
router.get("/admin/clubs", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const clubs = await db.select().from(clubsTable).orderBy(desc(clubsTable.createdAt));
  res.json(clubs);
});

// ─── Admin: suspend / unsuspend club ──────────────────────────────────────
router.patch("/admin/clubs/:id/suspend", parseUserAuth, requireSuperAdmin, validate(adminSuspendClubSchema), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { suspend, reason } = req.body as z.infer<typeof adminSuspendClubSchema>;

  const [updated] = await db
    .update(clubsTable)
    .set({
      isSuspended: suspend,
      suspendedReason: suspend ? (reason ?? null) : null,
      suspendedAt: suspend ? new Date() : null,
    })
    .where(eq(clubsTable.id, id))
    .returning({
      id: clubsTable.id,
      name: clubsTable.name,
      isSuspended: clubsTable.isSuspended,
      suspendedReason: clubsTable.suspendedReason,
      suspendedAt: clubsTable.suspendedAt,
    });

  if (!updated) {
    res.status(404).json({ error: "Klubb ikke funnet" });
    return;
  }
  res.json(updated);
});

// ─── Auth: current user (used by Clerk session bridge) ─────────────────────
router.get("/auth/user", requireUser, async (req, res): Promise<void> => {
  const auth = req.userAuth!;
  res.json({
    user: {
      id: auth.userId,
      name: auth.name,
      email: auth.email,
      role: auth.role,
      tenantId: auth.tenantId,
      tenantName: auth.tenantName,
      tenantRole: auth.tenantRole,
      isPersonalTenant: auth.isPersonalTenant,
    },
  });
});

// ─── Admin: stats ──────────────────────────────────────────────────────────
router.get("/admin/stats", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const [userCount] = await db.select({ count: count() }).from(usersTable);
  const [vehicleCount] = await db.select({ count: count() }).from(vehiclesTable);
  const [clubCount] = await db.select({ count: count() }).from(clubsTable);
  const [postCount] = await db.select({ count: count() }).from(forumPostsTable);
  const [commentCount] = await db.select({ count: count() }).from(forumCommentsTable);

  const activeUserCount = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.isActive, true));
  const adminCount = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "super_admin"));

  res.json({
    users: userCount?.count ?? 0,
    activeUsers: activeUserCount[0]?.count ?? 0,
    vehicles: vehicleCount?.count ?? 0,
    clubs: clubCount?.count ?? 0,
    posts: postCount?.count ?? 0,
    comments: commentCount?.count ?? 0,
    admins: adminCount[0]?.count ?? 0,
  });
});

export default router;
