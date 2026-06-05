import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface UserTokenPayload {
  userId: number;
  email: string;
  name: string;
  role: "user" | "super_admin";
}

declare global {
  namespace Express {
    interface Request {
      userAuth?: UserTokenPayload;
    }
  }
}

function getSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET env var is required");
  return secret;
}

export function signUserToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "30d" });
}

export function verifyUserToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(token, getSecret()) as UserTokenPayload;
  } catch {
    return null;
  }
}

export function parseUserAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers["x-user-token"];
  const token = Array.isArray(header) ? header[0] : header;
  if (token) {
    const payload = verifyUserToken(token);
    if (payload) req.userAuth = payload;
  }
  next();
}

/**
 * Verifies the user is logged in AND re-checks DB to ensure isActive === true.
 * Prevents deactivated users with unexpired tokens from accessing protected routes.
 */
export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.userAuth) {
    res.status(401).json({ error: "Innlogging kreves" });
    return;
  }
  const [user] = await db
    .select({ isActive: usersTable.isActive, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.userAuth.userId));

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Kontoen er deaktivert" });
    return;
  }
  // Refresh role from DB in case it changed after token was issued
  req.userAuth = { ...req.userAuth, role: user.role as "user" | "super_admin" };
  next();
}

/**
 * Verifies super_admin role against DB, not just JWT claim.
 * Prevents role-demoted users with unexpired tokens from accessing admin routes.
 */
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.userAuth) {
    res.status(401).json({ error: "Innlogging kreves" });
    return;
  }
  const [user] = await db
    .select({ isActive: usersTable.isActive, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.userAuth.userId));

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Kontoen er deaktivert" });
    return;
  }
  if (user.role !== "super_admin") {
    res.status(403).json({ error: "Super Admin-tilgang kreves" });
    return;
  }
  req.userAuth = { ...req.userAuth, role: "super_admin" };
  next();
}
