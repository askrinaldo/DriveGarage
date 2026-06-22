import { Router } from "express";
import { sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { parseUserAuth, requireUser } from "../middleware/userAuth";
import { getUncachableStripeClient } from "../lib/stripeClient";

const router = Router();

function getBaseUrl(req: { protocol: string; get: (h: string) => string | undefined }): string {
  const domains = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domains) return `https://${domains}`;
  return `${req.protocol}://${req.get("host")}`;
}

router.get("/billing/subscription", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;
  const [row] = await db.select({
    subscriptionTier: usersTable.subscriptionTier,
    subscriptionStatus: usersTable.subscriptionStatus,
    stripeCustomerId: usersTable.stripeCustomerId,
    stripeSubscriptionId: usersTable.stripeSubscriptionId,
  }).from(usersTable).where(eq(usersTable.id, userId));

  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let stripeSubscription = null;
  if (row.stripeSubscriptionId) {
    try {
      const result = await db.execute(sql`
        SELECT s.id, s.status, s.current_period_end,
               p.id as price_id, p.unit_amount, p.currency, p.recurring,
               pr.name as product_name, pr.metadata as product_metadata
        FROM stripe.subscriptions s
        LEFT JOIN stripe.subscription_items si ON si.subscription = s.id
        LEFT JOIN stripe.prices p ON p.id = si.price
        LEFT JOIN stripe.products pr ON pr.id = p.product
        WHERE s.id = ${row.stripeSubscriptionId}
        LIMIT 1
      `);
      stripeSubscription = result.rows[0] ?? null;
    } catch {
      // stripe schema not yet populated – ignore
    }
  }

  res.json({
    tier: row.subscriptionTier,
    status: row.subscriptionStatus,
    stripeSubscription,
  });
});

router.post("/billing/checkout", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;
  const { priceId } = req.body as { priceId?: string };

  if (!priceId) {
    res.status(400).json({ error: "priceId is required" });
    return;
  }

  const [row] = await db.select({
    stripeCustomerId: usersTable.stripeCustomerId,
    email: usersTable.email,
  }).from(usersTable).where(eq(usersTable.id, userId));

  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const stripe = await getUncachableStripeClient();
  const base = getBaseUrl(req);

  let customerId = row.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: row.email,
      metadata: { userId: String(userId) },
    });
    await db.update(usersTable)
      .set({ stripeCustomerId: customer.id })
      .where(eq(usersTable.id, userId));
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${base}/billing?success=1`,
    cancel_url: `${base}/billing?canceled=1`,
    metadata: { userId: String(userId) },
  });

  res.json({ url: session.url });
});

router.post("/billing/portal", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;
  const [row] = await db.select({ stripeCustomerId: usersTable.stripeCustomerId })
    .from(usersTable).where(eq(usersTable.id, userId));

  if (!row?.stripeCustomerId) {
    res.status(400).json({ error: "Ingen aktiv Stripe-kunde funnet. Oppgrader abonnementet ditt først." });
    return;
  }

  const stripe = await getUncachableStripeClient();
  const base = getBaseUrl(req);

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: row.stripeCustomerId,
    return_url: `${base}/billing`,
  });

  res.json({ url: portalSession.url });
});

router.get("/billing/prices", async (_req, res): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        pr.id as product_id, pr.name as product_name,
        pr.metadata as product_metadata, pr.description,
        p.id as price_id, p.unit_amount, p.currency, p.recurring
      FROM stripe.products pr
      JOIN stripe.prices p ON p.product = pr.id AND p.active = true
      WHERE pr.active = true
      ORDER BY p.unit_amount ASC
    `);
    res.json({ prices: result.rows });
  } catch {
    res.json({ prices: [] });
  }
});

export default router;
