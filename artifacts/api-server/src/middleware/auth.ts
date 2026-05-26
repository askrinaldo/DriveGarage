import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, clubMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export interface ClubTokenPayload {
  memberName: string;
  clubId: number;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: ClubTokenPayload;
    }
  }
}

const ROLE_ORDER: Record<string, number> = {
  owner: 4,
  admin: 3,
  moderator: 2,
  member: 1,
};

function getSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET env var is required");
  return secret;
}

export function signClubToken(payload: ClubTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "7d" });
}

export function verifyClubToken(token: string): ClubTokenPayload | null {
  try {
    return jwt.verify(token, getSecret()) as ClubTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extract and verify the JWT from Authorization: Bearer <token>
 * Attaches the decoded payload to req.auth if valid.
 * Does NOT reject the request — use requireClubRole for enforcement.
 */
export function parseAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    const payload = verifyClubToken(token);
    if (payload) req.auth = payload;
  }
  next();
}

/**
 * Middleware factory — requires a minimum role for the requesting member.
 * Reads clubId from req.params.clubId.
 * Re-verifies role from DB (JWT is used for identity, DB for authorisation).
 */
export function requireClubRole(minRole: "member" | "moderator" | "admin" | "owner") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ error: "Autentisering kreves. Logg inn i klubben." });
      return;
    }

    const rawId = req.params.clubId ?? req.params.id;
    const clubId = parseInt(Array.isArray(rawId) ? rawId[0]! : rawId, 10);

    if (req.auth.clubId !== clubId) {
      res.status(403).json({ error: "Token gjelder ikke for denne klubben." });
      return;
    }

    // Re-verify role from DB
    const [member] = await db
      .select()
      .from(clubMembersTable)
      .where(
        and(
          eq(clubMembersTable.clubId, clubId),
          eq(clubMembersTable.memberName, req.auth.memberName)
        )
      );

    if (!member) {
      res.status(403).json({ error: "Du er ikke lenger medlem av denne klubben." });
      return;
    }

    const actualRole = member.role ?? "member";
    req.auth = { ...req.auth, role: actualRole };

    const required = ROLE_ORDER[minRole] ?? 1;
    const actual = ROLE_ORDER[actualRole] ?? 0;

    if (actual < required) {
      res.status(403).json({
        error: `Utilstrekkelig tilgang. Krever rollen '${minRole}', du har '${actualRole}'.`,
      });
      return;
    }

    next();
  };
}

/**
 * Soft auth — parses token if present, never rejects.
 * Use for endpoints that work both authenticated and not.
 */
export { parseAuth as optionalAuth };
