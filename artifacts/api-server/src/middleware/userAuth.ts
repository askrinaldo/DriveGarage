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

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.userAuth) {
    res.status(401).json({ error: "Innlogging kreves" });
    return;
  }
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.userAuth) {
    res.status(401).json({ error: "Innlogging kreves" });
    return;
  }
  if (req.userAuth.role !== "super_admin") {
    res.status(403).json({ error: "Super Admin-tilgang kreves" });
    return;
  }
  next();
}
