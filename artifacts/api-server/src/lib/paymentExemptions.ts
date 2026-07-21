import type { Request } from "express";
import { db, paymentExemptionsTable, usersTable } from "@workspace/db";
import type { ExemptionType } from "@workspace/db";
import { eq, isNull, or, gt, and } from "drizzle-orm";
import { logAdminAction } from "./adminAudit";
import { logger } from "./logger";

export class NoActiveExemptionError extends Error {
  constructor() { super("no active exemption for this user"); this.name = "NoActiveExemptionError"; }
}

/**
 * Returns the active payment exemption for a user, or null if none.
 * Active = revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > now)
 */
export async function getActivePaymentExemptionForUser(
  userId: number,
) {
  const now = new Date();
  const [row] = await db
    .select()
    .from(paymentExemptionsTable)
    .where(
      and(
        eq(paymentExemptionsTable.userId, userId),
        isNull(paymentExemptionsTable.revokedAt),
        or(
          isNull(paymentExemptionsTable.expiresAt),
          gt(paymentExemptionsTable.expiresAt, now),
        ),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Returns true if the user currently has an active payment exemption.
 */
export async function isUserPaymentExempt(userId: number): Promise<boolean> {
  const exemption = await getActivePaymentExemptionForUser(userId);
  return exemption !== null;
}

/**
 * Grants a payment exemption to a user. Logs billing.exemption.grant.
 * Throws if the user does not exist or reason is empty.
 */
export async function createPaymentExemption(
  req: Request,
  userId: number,
  type: ExemptionType,
  reason: string,
  expiresAt?: Date,
): Promise<typeof paymentExemptionsTable.$inferSelect> {
  if (!reason.trim()) throw new Error("reason is required");

  const actor = req.userAuth;
  if (!actor) throw new Error("unauthenticated");

  const [target] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!target) throw new Error("target user not found");

  const [created] = await db
    .insert(paymentExemptionsTable)
    .values({
      userId,
      type,
      reason,
      createdByUserId: actor.userId,
      expiresAt: expiresAt ?? null,
    })
    .returning();

  if (!created) throw new Error("insert failed");

  await logAdminAction({
    req,
    action: "billing.exemption.grant",
    targetType: "user",
    targetUserId: target.id,
    targetEmail: target.email,
    reason,
    metadata: {
      exemptionId: created.id,
      type,
      expiresAt: expiresAt?.toISOString() ?? null,
    },
  });

  logger.info({ exemptionId: created.id, userId, type }, "Payment exemption granted");
  return created;
}

/**
 * Revokes the active payment exemption for a user. Logs billing.exemption.revoke.
 * Throws if no active exemption exists or revokeReason is empty.
 */
export async function revokePaymentExemption(
  req: Request,
  userId: number,
  revokeReason: string,
): Promise<typeof paymentExemptionsTable.$inferSelect> {
  if (!revokeReason.trim()) throw new Error("revokeReason is required");

  const actor = req.userAuth;
  if (!actor) throw new Error("unauthenticated");

  const active = await getActivePaymentExemptionForUser(userId);
  if (!active) throw new NoActiveExemptionError();

  const [target] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  const [revoked] = await db
    .update(paymentExemptionsTable)
    .set({
      revokedAt: new Date(),
      revokedByUserId: actor.userId,
      revokeReason,
    })
    .where(eq(paymentExemptionsTable.id, active.id))
    .returning();

  if (!revoked) throw new Error("update failed");

  await logAdminAction({
    req,
    action: "billing.exemption.revoke",
    targetType: "user",
    targetUserId: userId,
    targetEmail: target?.email ?? null,
    reason: revokeReason,
    metadata: {
      exemptionId: active.id,
      type: active.type,
      originalReason: active.reason,
    },
  });

  logger.info({ exemptionId: active.id, userId }, "Payment exemption revoked");
  return revoked;
}
