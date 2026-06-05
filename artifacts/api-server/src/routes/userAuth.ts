import { Router, type IRouter } from "express";
import { eq, desc, count, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  db, usersTable, clubsTable, vehiclesTable, forumPostsTable, forumCommentsTable,
} from "@workspace/db";
import { signUserToken, requireUser, requireSuperAdmin, parseUserAuth } from "../middleware/userAuth";

const router: IRouter = Router();

// ─── Register ──────────────────────────────────────────────────────────────
router.post("/users/register", async (req, res): Promise<void> => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name?.trim() || !email?.trim() || !password) {
    res.status(400).json({ error: "Navn, e-post og passord er påkrevd" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Passordet må være minst 6 tegn" });
    return;
  }

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

  const token = signUserToken({ userId: user.id, email: user.email, name: user.name, role: user.role as "user" | "super_admin" });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, themeAccent: null, themeMode: null } });
});

// ─── Login ─────────────────────────────────────────────────────────────────
router.post("/users/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email?.trim() || !password) {
    res.status(400).json({ error: "E-post og passord er påkrevd" });
    return;
  }

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

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Feil e-post eller passord" });
    return;
  }

  const token = signUserToken({ userId: user.id, email: user.email, name: user.name, role: user.role as "user" | "super_admin" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, themeAccent: user.themeAccent ?? null, themeMode: user.themeMode ?? null } });
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

  res.json(user);
});

// ─── Update preferences ────────────────────────────────────────────────────
router.patch("/users/me/preferences", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const { themeAccent, themeMode } = req.body as { themeAccent?: string; themeMode?: string };

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

  let query = db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, isActive: usersTable.isActive, createdAt: usersTable.createdAt })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt))
    .$dynamic();

  const users = await query;
  const filtered = q
    ? users.filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
    : users;

  res.json(filtered);
});

// ─── Admin: update user (activate/deactivate) ──────────────────────────────
router.patch("/admin/users/:id", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { isActive, role } = req.body as { isActive?: boolean; role?: "user" | "super_admin" };

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
  const clubs = await db
    .select()
    .from(clubsTable)
    .orderBy(desc(clubsTable.createdAt));

  res.json(clubs);
});

// ─── Admin: suspend / unsuspend club ──────────────────────────────────────
router.patch("/admin/clubs/:id/suspend", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { suspend, reason } = req.body as { suspend: boolean; reason?: string };

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

// ─── Admin: stats ──────────────────────────────────────────────────────────
router.get("/admin/stats", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const [userCount] = await db.select({ count: count() }).from(usersTable);
  const [vehicleCount] = await db.select({ count: count() }).from(vehiclesTable);
  const [clubCount] = await db.select({ count: count() }).from(clubsTable);
  const [postCount] = await db.select({ count: count() }).from(forumPostsTable);
  const [commentCount] = await db.select({ count: count() }).from(forumCommentsTable);

  const activeUserCount = await db
    .select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.isActive, true));

  const adminCount = await db
    .select({ count: count() })
    .from(usersTable)
    .where(eq(usersTable.role, "super_admin"));

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
