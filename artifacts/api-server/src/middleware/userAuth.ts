import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable, tenantsTable, tenantMembershipsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export interface UserTokenPayload {
  userId: number;
  email: string;
  name: string;
  role: "user" | "super_admin";
  tenantId: number;
  tenantName: string;
  tenantRole: "owner" | "admin" | "member";
  isPersonalTenant: boolean;
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

/**
 * Resolve the personal tenant for a user. Used to upgrade old tokens
 * that predate the multi-tenant architecture.
 */
export async function resolvePersonalTenant(userId: number): Promise<{ tenantId: number; tenantName: string; tenantRole: "owner" | "admin" | "member"; isPersonalTenant: boolean } | null> {
  const slug = `personal-${userId}`;
  const [tenant] = await db
    .select({ id: tenantsTable.id, name: tenantsTable.name, isPersonal: tenantsTable.isPersonal })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, slug));

  if (!tenant) return null;

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    tenantRole: "owner",
    isPersonalTenant: tenant.isPersonal,
  };
}

export function parseUserAuth(req: Request, _res: Response, next: NextFunction): void {
  // Accept token from x-user-token header (browser/app) OR Authorization: Bearer (external schedulers / GitHub Actions)
  const xUserToken = req.headers["x-user-token"];
  const bearerHeader = req.headers["authorization"];

  let rawToken: string | undefined;

  if (xUserToken) {
    rawToken = Array.isArray(xUserToken) ? xUserToken[0] : xUserToken;
  } else if (typeof bearerHeader === "string" && bearerHeader.startsWith("Bearer ")) {
    rawToken = bearerHeader.slice("Bearer ".length).trim();
  }

  if (rawToken) {
    const payload = verifyUserToken(rawToken);
    if (payload) req.userAuth = payload;
  }
  next();
}

/**
 * Verifies the user is logged in AND re-checks DB to ensure isActive === true.
 * If tenantId is missing from the token (old token), resolves personal tenant from DB.
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

  // Upgrade old tokens that lack tenantId
  if (!req.userAuth.tenantId) {
    const tenant = await resolvePersonalTenant(req.userAuth.userId);
    if (tenant) {
      req.userAuth = { ...req.userAuth, ...tenant, role: user.role as "user" | "super_admin" };
    } else {
      req.userAuth = { ...req.userAuth, role: user.role as "user" | "super_admin" };
    }
  } else {
    req.userAuth = { ...req.userAuth, role: user.role as "user" | "super_admin" };
  }

  next();
}

/**
 * Verifies super_admin role against DB, not just JWT claim.
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

/**
 * Verifies the user has the required role in the current tenant.
 */
export async function requireTenantRole(minRole: "owner" | "admin" | "member") {
  const roleOrder: Record<string, number> = { owner: 3, admin: 2, member: 1 };

  return async function (req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.userAuth?.tenantId) {
      res.status(401).json({ error: "Tenant-kontekst mangler" });
      return;
    }

    const [membership] = await db
      .select({ role: tenantMembershipsTable.role })
      .from(tenantMembershipsTable)
      .where(
        and(
          eq(tenantMembershipsTable.tenantId, req.userAuth.tenantId),
          eq(tenantMembershipsTable.userId, req.userAuth.userId),
        )
      );

    if (!membership) {
      res.status(403).json({ error: "Du er ikke medlem av denne tenanten" });
      return;
    }

    const userLevel = roleOrder[membership.role] ?? 0;
    const requiredLevel = roleOrder[minRole] ?? 0;

    if (userLevel < requiredLevel) {
      res.status(403).json({ error: `Krever ${minRole}-rolle eller høyere` });
      return;
    }

    next();
  };
}
