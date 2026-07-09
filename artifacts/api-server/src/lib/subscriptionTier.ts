/**
 * Legacy subscription tier resolver — kept for backward compat.
 * Stripe queries removed. New code should use lib/subscription.ts instead.
 */

import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

/** @deprecated Use subscription.ts helpers instead. */
export type Tier = "free" | "standard" | "premium";

/**
 * Returns the cached subscription tier from the users table.
 * Stripe lookup removed; returns "free" for all users until Vipps is live.
 * @deprecated Prefer getSubscriptionStatus() from lib/subscription.ts.
 */
export async function getUserTier(userId: number): Promise<Tier> {
  const [user] = await db
    .select({ subscriptionTier: usersTable.subscriptionTier })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) return "free";
  return (user.subscriptionTier as Tier) ?? "free";
}
