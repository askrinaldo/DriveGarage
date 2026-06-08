/**
 * Replit Auth — OIDC bridge to the existing JWT system.
 *
 * Flow:
 *   GET /api/login        → PKCE redirect to Replit OIDC
 *   GET /api/callback     → verify tokens → upsert user → issue JWT → set _gptoken cookie → redirect
 *   GET /api/logout       → clear cookie → OIDC end-session redirect
 *   GET /api/auth/user    → return current user from JWT cookie (for session check)
 */

import * as oidc from "openid-client";
import { Router, type Request, type Response } from "express";
import { eq, or } from "drizzle-orm";
import { db, usersTable, tenantsTable, tenantMembershipsTable } from "@workspace/db";
import { signUserToken, type UserTokenPayload } from "../middleware/userAuth";

const router = Router();

const ISSUER_URL = "https://replit.com/oidc";
const OIDC_STATE_TTL = 10 * 60 * 1000; // 10 min
const TOKEN_BRIDGE_TTL = 60 * 1000;    // 60 s — readable cookie to bridge SPA

let _config: oidc.Configuration | null = null;

async function getConfig(): Promise<oidc.Configuration> {
  if (!_config) {
    _config = await oidc.discovery(
      new URL(ISSUER_URL),
      process.env.REPL_ID ?? "garagepilot",
    );
  }
  return _config;
}

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers["host"] ?? "localhost";
  return `${proto}://${host}`;
}

function safeCookie(res: Response, name: string, value: string, maxAge: number, httpOnly = true) {
  res.cookie(name, value, { httpOnly, secure: true, sameSite: "lax", path: "/", maxAge });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

// ─── Upsert Replit user into our DB ──────────────────────────────────────────

async function upsertReplitUser(claims: Record<string, unknown>): Promise<typeof usersTable.$inferSelect> {
  const replitUserId = String(claims.sub ?? "");
  const email = (claims.email as string | undefined) ?? null;
  const firstName = (claims.first_name as string | undefined) ?? "";
  const lastName = (claims.last_name as string | undefined) ?? "";
  const fullName = ([firstName, lastName].filter(Boolean).join(" ") || email) ?? "GaragePilot-bruker";

  // Try to find existing user by replitUserId first, then by email
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(
      or(
        eq(usersTable.replitUserId, replitUserId),
        ...(email ? [eq(usersTable.email, email)] : []),
      )
    )
    .limit(1);

  if (existing) {
    // Link replitUserId if not already set
    if (!existing.replitUserId) {
      await db.update(usersTable)
        .set({ replitUserId, updatedAt: new Date() })
        .where(eq(usersTable.id, existing.id));
    }
    return { ...existing, replitUserId };
  }

  // Create new user
  const [created] = await db.insert(usersTable).values({
    name: fullName,
    email: email ?? `${replitUserId}@replit.user`,
    passwordHash: null,
    replitUserId,
    role: "user",
    isActive: true,
    subscriptionTier: "free",
  }).returning();

  return created!;
}

// ─── Build JWT payload (resolve personal tenant) ──────────────────────────────

async function buildTokenPayload(user: typeof usersTable.$inferSelect): Promise<UserTokenPayload> {
  // Find personal tenant
  const slug = `personal-${user.id}`;
  const [tenant] = await db
    .select({ id: tenantsTable.id, name: tenantsTable.name })
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, slug))
    .limit(1);

  if (tenant) {
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "user" | "super_admin",
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantRole: "owner",
      isPersonalTenant: true,
    };
  }

  // Create personal tenant if it doesn't exist yet
  const tenantName = `${user.name}'s Garasje`;
  const [newTenant] = await db.insert(tenantsTable).values({
    name: tenantName,
    slug,
    isPersonal: true,
  }).returning();

  await db.insert(tenantMembershipsTable).values({
    tenantId: newTenant!.id,
    userId: user.id,
    role: "owner",
  });

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "user" | "super_admin",
    tenantId: newTenant!.id,
    tenantName,
    tenantRole: "owner",
    isPersonalTenant: true,
  };
}

// ─── GET /login ───────────────────────────────────────────────────────────────

router.get("/login", async (req: Request, res: Response) => {
  try {
    const config = await getConfig();
    const returnTo = getSafeReturnTo(req.query.returnTo);
    const callbackUrl = `${getOrigin(req)}/api/callback`;

    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

    const redirectUrl = oidc.buildAuthorizationUrl(config, {
      redirect_uri: callbackUrl,
      scope: "openid email profile offline_access",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "login consent",
      state,
      nonce,
    });

    safeCookie(res, "_gp_cv",  codeVerifier, OIDC_STATE_TTL);
    safeCookie(res, "_gp_n",   nonce,        OIDC_STATE_TTL);
    safeCookie(res, "_gp_s",   state,        OIDC_STATE_TTL);
    safeCookie(res, "_gp_ret", returnTo,     OIDC_STATE_TTL);

    res.redirect(redirectUrl.href);
  } catch (err) {
    req.log.error({ err }, "OIDC login init error");
    res.redirect("/login?error=oidc");
  }
});

// ─── GET /callback ─────────────────────────────────────────────────────────────

router.get("/callback", async (req: Request, res: Response) => {
  const codeVerifier   = req.cookies?._gp_cv  as string | undefined;
  const nonce          = req.cookies?._gp_n   as string | undefined;
  const expectedState  = req.cookies?._gp_s   as string | undefined;
  const returnTo       = getSafeReturnTo(req.cookies?._gp_ret);

  // Clear OIDC cookies regardless
  for (const name of ["_gp_cv", "_gp_n", "_gp_s", "_gp_ret"]) {
    res.clearCookie(name, { path: "/" });
  }

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    const config = await getConfig();
    const callbackUrl = `${getOrigin(req)}/api/callback`;
    const currentUrl = new URL(
      `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
    );
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch (err) {
    req.log.error({ err }, "OIDC callback error");
    res.redirect("/login?error=oidc_callback");
    return;
  }

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/login?error=no_claims");
    return;
  }

  try {
    const user = await upsertReplitUser(claims as unknown as Record<string, unknown>);
    const payload = await buildTokenPayload(user);
    const jwt = signUserToken(payload);

    // Set bridge cookie — JS-readable, expires in 60 s
    // The SPA picks this up on mount, moves to localStorage, clears it
    safeCookie(res, "_gptoken", jwt, TOKEN_BRIDGE_TTL, false /* httpOnly=false so JS can read */);

    res.redirect(returnTo);
  } catch (err) {
    req.log.error({ err }, "User upsert error");
    res.redirect("/login?error=upsert");
  }
});

// ─── GET /logout ──────────────────────────────────────────────────────────────

router.get("/logout", async (req: Request, res: Response) => {
  // Clear the bridge cookie if still set
  res.clearCookie("_gptoken", { path: "/" });

  try {
    const config = await getConfig();
    const origin = getOrigin(req);
    const endSessionUrl = oidc.buildEndSessionUrl(config, {
      client_id: process.env.REPL_ID ?? "garagepilot",
      post_logout_redirect_uri: `${origin}/login`,
    });
    res.redirect(endSessionUrl.href);
  } catch {
    res.redirect("/login");
  }
});

// ─── GET /auth/user ───────────────────────────────────────────────────────────
// Returns the currently authenticated user from the JWT (header or cookie).
// Called by the frontend hook on mount.

router.get("/auth/user", (req: Request, res: Response) => {
  if (!req.userAuth) {
    res.json({ user: null });
    return;
  }
  const u = req.userAuth;
  res.json({
    user: {
      id: u.userId,
      name: u.name,
      email: u.email,
      role: u.role,
      tenantId: u.tenantId,
      tenantName: u.tenantName,
      tenantRole: u.tenantRole,
      isPersonalTenant: u.isPersonalTenant,
    },
  });
});

export default router;
