import { sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export type Tier = "free" | "standard" | "premium";

/**
 * Resolves the subscription tier for a user.
 * First checks stripe.subscriptions (authoritative), falls back to cached users.subscriptionTier.
 * Also writes back to users table if stripe data differs.
 */
export async function getUserTier(userId: number): Promise<Tier> {
  const [user] = await db
    .select({
      subscriptionTier: usersTable.subscriptionTier,
      stripeCustomerId: usersTable.stripeCustomerId,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) return "free";

  if (user.stripeCustomerId) {
    try {
      const result = await db.execute<{
        status: string;
        tier: string;
      }>(sql`
        SELECT s.status, pr.metadata->>'tier' as tier
        FROM stripe.subscriptions s
        JOIN stripe.subscription_items si ON si.subscription = s.id
        JOIN stripe.prices p ON p.id = si.price
        JOIN stripe.products pr ON pr.id = p.product
        WHERE s.customer = ${user.stripeCustomerId}
          AND s.status IN ('active', 'trialing')
        ORDER BY s.created DESC
        LIMIT 1
      `);

      const row = result.rows[0];
      if (row && (row.tier === "standard" || row.tier === "premium")) {
        const liveTier = row.tier as Tier;
        if (liveTier !== user.subscriptionTier) {
          await db
            .update(usersTable)
            .set({ subscriptionTier: liveTier, subscriptionStatus: row.status })
            .where(eq(usersTable.id, userId));
        }
        return liveTier;
      }
    } catch {
      // stripe schema not ready — fall back to cached value
    }
  }

  return (user.subscriptionTier as Tier) ?? "free";
}
