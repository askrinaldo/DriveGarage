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
    // clerkMiddleware also populates req.auth with its own object shape, so a
    // truthy req.auth is NOT proof of a club actor. Only accept a genuine club
    // payload (numeric clubId + string memberName).
    const candidate = req.auth as Partial<ClubTokenPayload> | undefined;
    if (
      !candidate ||
      typeof candidate.clubId !== "number" ||
      typeof candidate.memberName !== "string"
    ) {
      res.status(401).json({ error: "Autentisering kreves. Logg inn i klubben." });
      return;
    }
    const actor: ClubTokenPayload = {
      clubId: candidate.clubId,
      memberName: candidate.memberName,
      role: candidate.role ?? "member",
    };

    const rawId = req.params.clubId ?? req.params.id;
    const clubId = parseInt(Array.isArray(rawId) ? rawId[0]! : rawId, 10);

    if (actor.clubId !== clubId) {
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
          eq(clubMembersTable.memberName, actor.memberName)
        )
      );

    if (!member) {
      res.status(403).json({ error: "Du er ikke lenger medlem av denne klubben." });
      return;
    }

    const actualRole = member.role ?? "member";
    req.auth = { ...actor, role: actualRole };

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
 * Bridges the global Clerk/user identity (req.userAuth) into the club auth
 * context (req.auth).
 *
 * Club admin routes authorise via req.auth (the per-club JWT). Owners and members
 * who are signed in through Clerk do NOT carry a club JWT, so without this bridge
 * they cannot manage members, edit, or delete their own club. When no club JWT is
 * present but a Clerk/user identity is, we look up that identity's membership in
 * the club (matched by name or email) and populate req.auth with their real DB
 * role. Never rejects — enforcement stays in requireClubRole / route handlers.
 */
export async function resolveClubActorFromUser(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // A club JWT already established the actor — leave it untouched.
  // NOTE: clerkMiddleware also populates req.auth with its own (Clerk) object,
  // so we cannot rely on truthiness alone — only skip when req.auth carries a
  // genuine club payload (numeric clubId + memberName).
  const existing = req.auth as Partial<ClubTokenPayload> | undefined;
  if (existing && typeof existing.clubId === "number" && typeof existing.memberName === "string") {
    next();
    return;
  }
  if (!req.userAuth) {
    next();
    return;
  }

  const match = req.path.match(/\/clubs\/(\d+)/);
  if (!match) {
    next();
    return;
  }
  const clubId = parseInt(match[1]!, 10);
  if (Number.isNaN(clubId)) {
    next();
    return;
  }

  try {
    const candidates = [req.userAuth.name, req.userAuth.email]
      .filter((c): c is string => !!c)
      .map((c) => c.toLowerCase());
    if (candidates.length === 0) {
      next();
      return;
    }

    const members = await db
      .select()
      .from(clubMembersTable)
      .where(eq(clubMembersTable.clubId, clubId));

    const member = members.find((m) =>
      candidates.includes(m.memberName.toLowerCase())
    );

    if (member) {
      req.auth = {
        memberName: member.memberName,
        clubId,
        role: member.role ?? "member",
      };
    }
  } catch (err) {
    req.log?.error({ err }, "resolveClubActorFromUser failed");
  }

  next();
}

/**
 * Soft auth — parses token if present, never rejects.
 * Use for endpoints that work both authenticated and not.
 */
export { parseAuth as optionalAuth };
