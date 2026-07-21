/**
 * Clerk → userAuth bridge middleware.
 *
 * When a request arrives with a valid Clerk session (set by clerkMiddleware),
 * this middleware resolves the corresponding internal DB user and sets
 * req.userAuth — the same shape used everywhere else in the codebase.
 *
 * Falls back silently when:
 * - req.userAuth is already set (JWT path took precedence)
 * - No Clerk session present
 * - Any DB error (request proceeds as unauthenticated)
 *
 * JIT provisioning: new users get subscriptionStatus = "pending_payment_setup".
 * No trial logic — users must set up a Vipps agreement to get paid access.
 */

import { getAuth, clerkClient } from "@clerk/express";
import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  tenantsTable,
  tenantMembershipsTable,
} from "@workspace/db";

export async function clerkUserAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  // JWT path already resolved auth — do nothing
  if (req.userAuth) {
    next();
    return;
  }

  // parseAuth (club JWT middleware) may have set req.auth to a plain club payload
  // object before Clerk's getAuth runs. Calling getAuth() on such a request would
  // throw "req.auth is not a function" because Clerk expects its own getter.
  // If req.auth is already a club JWT payload, skip the Clerk path entirely.
  const candidate = req.auth as Partial<{ clubId: number; memberName: string }> | undefined;
  if (candidate && typeof candidate.clubId === "number" && typeof candidate.memberName === "string") {
    next();
    return;
  }

  const { userId: clerkUserId } = getAuth(req);
  if (!clerkUserId) {
    next();
    return;
  }

  try {
    // ── 1. Find DB user by clerkUserId ──────────────────────────────────────
    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.replitUserId, clerkUserId));

    // ── 2. JIT provision if not found ───────────────────────────────────────
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      const email =
        clerkUser.emailAddresses[0]?.emailAddress ?? `${clerkUserId}@clerk.user`;
      const firstName = clerkUser.firstName ?? "";
      const lastName  = clerkUser.lastName ?? "";
      const fullName  = [firstName, lastName].filter(Boolean).join(" ") || email;

      // Try to link to an existing account with the same email
      const [existing] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (existing) {
        await db
          .update(usersTable)
          .set({ replitUserId: clerkUserId, updatedAt: new Date() })
          .where(eq(usersTable.id, existing.id));
        user = { ...existing, replitUserId: clerkUserId };
      } else {
        try {
          const [created] = await db
            .insert(usersTable)
            .values({
              name:               fullName,
              email,
              passwordHash:       null,
              replitUserId:       clerkUserId,
              role:               "user",
              isActive:           true,
              subscriptionTier:   "free",
              subscriptionPlan:   "monthly_100",
              subscriptionStatus: "pending_payment_setup",
            })
            .returning();
          user = created!;
        } catch (insertErr: unknown) {
          // Concurrent JIT race: another parallel request already inserted this user.
          // Recover by re-selecting the row that won the race.
          const pgCode =
            (insertErr as { cause?: { code?: string } })?.cause?.code ??
            (insertErr as { code?: string })?.code;
          if (pgCode === "23505") {
            const [raceWinner] = await db
              .select()
              .from(usersTable)
              .where(eq(usersTable.email, email));
            if (raceWinner) {
              user = raceWinner;
            } else {
              throw insertErr;
            }
          } else {
            throw insertErr;
          }
        }
      }
    }

    if (!user?.isActive) {
      next();
      return;
    }

    // ── 3. Resolve or create personal tenant ────────────────────────────────
    const slug = `personal-${user.id}`;
    let [tenant] = await db
      .select({ id: tenantsTable.id, name: tenantsTable.name })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, slug));

    if (!tenant) {
      const tName = `${user.name}'s Garasje`;
      const [newTenant] = await db
        .insert(tenantsTable)
        .values({ name: tName, slug, isPersonal: true, ownerUserId: user.id })
        .returning();
      await db.insert(tenantMembershipsTable).values({
        tenantId: newTenant!.id,
        userId:   user.id,
        role:     "owner",
      });
      tenant = { id: newTenant!.id, name: tName };
    }

    req.userAuth = {
      userId:          user.id,
      email:           user.email,
      name:            user.name,
      role:            user.role as "user" | "super_admin",
      tenantId:        tenant.id,
      tenantName:      tenant.name,
      tenantRole:      "owner",
      isPersonalTenant: true,
    };
  } catch (err) {
    req.log?.error({ err }, "clerkUserAuth: error resolving user");
  }

  next();
}
