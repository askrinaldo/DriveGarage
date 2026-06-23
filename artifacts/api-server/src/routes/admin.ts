import { Router } from "express";
import { eq, desc, count, sql, gte } from "drizzle-orm";
import { db, usersTable, vehiclesTable, auditLogsTable, clubsTable } from "@workspace/db";
import { parseUserAuth, requireSuperAdmin } from "../middleware/userAuth";
import { logAdminAction } from "../lib/adminAudit";

const router = Router();

// ─── Detailed user list ────────────────────────────────────────────────────
router.get("/admin/users-detailed", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      isActive: usersTable.isActive,
      subscriptionTier: usersTable.subscriptionTier,
      subscriptionStatus: usersTable.subscriptionStatus,
      stripeCustomerId: usersTable.stripeCustomerId,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  const vehicleCounts = await db
    .select({ userId: vehiclesTable.userId, cnt: count() })
    .from(vehiclesTable)
    .groupBy(vehiclesTable.userId);

  const vehicleMap = new Map(vehicleCounts.map(v => [v.userId, Number(v.cnt)]));

  const result = users.map(u => ({
    ...u,
    vehicleCount: vehicleMap.get(u.id) ?? 0,
  }));

  res.json(result);
});

// ─── Billing / revenue stats ──────────────────────────────────────────────
router.get("/admin/billing-stats", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60;
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60;
  const startOfYear = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000);

  const tierCounts = await db
    .select({ tier: usersTable.subscriptionTier, cnt: count() })
    .from(usersTable)
    .groupBy(usersTable.subscriptionTier);

  const tierMap: Record<string, number> = {};
  for (const row of tierCounts) tierMap[row.tier ?? "free"] = Number(row.cnt);

  const monthStart = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);
  const [newUsersRow] = await db
    .select({ cnt: count() })
    .from(usersTable)
    .where(gte(usersTable.createdAt, new Date(monthStart * 1000)));
  const newUsersThisMonth = Number(newUsersRow?.cnt ?? 0);

  let activeSubscriptions = 0;
  let mrrOre = 0;
  let revenueThisMonthOre = 0;
  let revenueLastMonthOre = 0;
  let revenueYtdOre = 0;

  try {
    const activeSubsResult = await db.execute(
      sql`SELECT COUNT(*) AS cnt FROM stripe.subscriptions WHERE status = 'active'`
    );
    activeSubscriptions = Number((activeSubsResult.rows[0] as Record<string, unknown>)?.cnt ?? 0);

    const mrrResult = await db.execute(sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN (item->>'plan_interval') = 'year' THEN (item->>'plan_amount')::bigint / 12
          ELSE (item->>'plan_amount')::bigint
        END
      ), 0) AS mrr_ore
      FROM stripe.subscriptions s,
      jsonb_array_elements(s.items->'data') AS item
      WHERE s.status = 'active'
    `);
    mrrOre = Number((mrrResult.rows[0] as Record<string, unknown>)?.mrr_ore ?? 0);

    const revThisMonthResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount_paid), 0) AS total
      FROM stripe.invoices
      WHERE status = 'paid' AND created >= ${thirtyDaysAgo}
    `);
    revenueThisMonthOre = Number((revThisMonthResult.rows[0] as Record<string, unknown>)?.total ?? 0);

    const revLastMonthResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount_paid), 0) AS total
      FROM stripe.invoices
      WHERE status = 'paid' AND created >= ${sixtyDaysAgo} AND created < ${thirtyDaysAgo}
    `);
    revenueLastMonthOre = Number((revLastMonthResult.rows[0] as Record<string, unknown>)?.total ?? 0);

    const revYtdResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount_paid), 0) AS total
      FROM stripe.invoices
      WHERE status = 'paid' AND created >= ${startOfYear}
    `);
    revenueYtdOre = Number((revYtdResult.rows[0] as Record<string, unknown>)?.total ?? 0);
  } catch {
    // stripe schema may be empty in dev
  }

  const userGrowth = await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') AS month,
      DATE_TRUNC('month', created_at) AS month_date,
      COUNT(*) AS cnt
    FROM users
    WHERE created_at >= NOW() - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month_date
  `);

  const toKr = (ore: number) => Math.round(ore / 100);

  res.json({
    tiers: {
      free: tierMap["free"] ?? 0,
      standard: tierMap["standard"] ?? 0,
      premium: tierMap["premium"] ?? 0,
    },
    newUsersThisMonth,
    activeSubscriptions,
    mrr: toKr(mrrOre),
    arr: toKr(mrrOre * 12),
    revenueThisMonth: toKr(revenueThisMonthOre),
    revenueLastMonth: toKr(revenueLastMonthOre),
    revenueYtd: toKr(revenueYtdOre),
    userGrowth: (userGrowth.rows as Array<Record<string, unknown>>).map(r => ({
      month: String(r.month ?? ""),
      count: Number(r.cnt ?? 0),
    })),
  });
});

// ─── MRR history (last 12 months) ─────────────────────────────────────────
router.get("/admin/mrr-history", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  let rows: Array<{ month: string; mrr: number; newSubs: number; churned: number }> = [];

  try {
    const result = await db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', TO_TIMESTAMP(created)), 'Mon YY') AS month,
        DATE_TRUNC('month', TO_TIMESTAMP(created)) AS month_date,
        COALESCE(SUM(amount_paid), 0) AS revenue_ore,
        COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
        COUNT(*) FILTER (WHERE amount_paid = 0) AS zero_count
      FROM stripe.invoices
      WHERE created >= EXTRACT(EPOCH FROM NOW() - INTERVAL '12 months')
      GROUP BY DATE_TRUNC('month', TO_TIMESTAMP(created))
      ORDER BY month_date
    `);

    rows = (result.rows as Array<Record<string, unknown>>).map(r => ({
      month: String(r.month ?? ""),
      mrr: Math.round(Number(r.revenue_ore ?? 0) / 100),
      newSubs: Number(r.paid_count ?? 0),
      churned: Number(r.zero_count ?? 0),
    }));
  } catch {
    // No stripe schema yet
  }

  // If no data, return empty placeholder months
  if (rows.length === 0) {
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      rows.push({
        month: d.toLocaleDateString("nb-NO", { month: "short", year: "2-digit" }),
        mrr: 0,
        newSubs: 0,
        churned: 0,
      });
    }
  }

  res.json(rows);
});

// ─── Stripe invoices list ─────────────────────────────────────────────────
router.get("/admin/invoices", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  let invoices: Array<{
    id: string;
    customerEmail: string;
    amount: number;
    status: string;
    created: number;
    hostedUrl: string | null;
  }> = [];

  try {
    const result = await db.execute(sql`
      SELECT
        id,
        customer_email,
        amount_paid,
        amount_due,
        status,
        created,
        hosted_invoice_url
      FROM stripe.invoices
      ORDER BY created DESC
      LIMIT 200
    `);

    invoices = (result.rows as Array<Record<string, unknown>>).map(r => ({
      id: String(r.id ?? ""),
      customerEmail: String(r.customer_email ?? "—"),
      amount: Math.round(Number(r.amount_paid ?? r.amount_due ?? 0) / 100),
      status: String(r.status ?? "unknown"),
      created: Number(r.created ?? 0),
      hostedUrl: r.hosted_invoice_url ? String(r.hosted_invoice_url) : null,
    }));
  } catch {
    // No stripe schema
  }

  res.json(invoices);
});

// ─── System health ────────────────────────────────────────────────────────
router.get("/admin/system-health", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const start = Date.now();
  let dbOk = false;
  let dbLatencyMs = 0;
  let userCount = 0;
  let vehicleCount = 0;

  try {
    const t0 = Date.now();
    const [countRow] = await db.select({ cnt: count() }).from(usersTable);
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
    userCount = Number(countRow?.cnt ?? 0);

    const [vRow] = await db.select({ cnt: count() }).from(vehiclesTable);
    vehicleCount = Number(vRow?.cnt ?? 0);
  } catch {
    dbOk = false;
  }

  let clubCount = 0;
  try {
    const [cRow] = await db.select({ cnt: count() }).from(clubsTable);
    clubCount = Number(cRow?.cnt ?? 0);
  } catch { /* ok */ }

  const apiLatencyMs = Date.now() - start;

  res.json({
    api: { status: "ok", latencyMs: apiLatencyMs },
    database: { status: dbOk ? "ok" : "error", latencyMs: dbLatencyMs },
    stats: { users: userCount, vehicles: vehicleCount, clubs: clubCount },
    uptime: process.uptime(),
    memory: {
      heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  });
});

// ─── Audit log ────────────────────────────────────────────────────────────
router.get("/admin/audit-log", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const logs = await db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(200);

  res.json(logs);
});

// ─── Subscription list from Stripe ────────────────────────────────────────
router.get("/admin/subscriptions", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      subscriptionTier: usersTable.subscriptionTier,
      subscriptionStatus: usersTable.subscriptionStatus,
      stripeCustomerId: usersTable.stripeCustomerId,
      stripeSubscriptionId: usersTable.stripeSubscriptionId,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(
      sql`${usersTable.subscriptionTier} != 'free' OR ${usersTable.stripeCustomerId} IS NOT NULL`
    )
    .orderBy(desc(usersTable.createdAt));

  let stripeData: Record<string, { status: string; currentPeriodEnd: number; cancelAtPeriodEnd: boolean; amount: number; interval: string }> = {};

  try {
    const result = await db.execute(sql`
      SELECT
        id,
        status,
        current_period_end,
        cancel_at_period_end,
        (items->'data'->0->>'plan_amount')::bigint AS amount,
        items->'data'->0->>'plan_interval' AS plan_interval
      FROM stripe.subscriptions
      WHERE status IN ('active', 'past_due', 'canceled')
    `);
    for (const row of result.rows as Array<Record<string, unknown>>) {
      if (row.id) {
        stripeData[String(row.id)] = {
          status: String(row.status ?? ""),
          currentPeriodEnd: Number(row.current_period_end ?? 0),
          cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
          amount: Math.round(Number(row.amount ?? 0) / 100),
          interval: String(row.plan_interval ?? "month"),
        };
      }
    }
  } catch {
    // ok
  }

  const result = users.map(u => ({
    ...u,
    stripe: u.stripeSubscriptionId ? (stripeData[u.stripeSubscriptionId] ?? null) : null,
  }));

  res.json(result);
});

// ─── Admin action on user ─────────────────────────────────────────────────
router.patch("/admin/users/:id", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { isActive, reason } = req.body as { isActive?: boolean; reason?: string };

  const [before] = await db
    .select({ id: usersTable.id, email: usersTable.email, isActive: usersTable.isActive })
    .from(usersTable)
    .where(eq(usersTable.id, id));

  if (!before) { res.status(404).json({ error: "Bruker ikke funnet" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, isActive: usersTable.isActive });

  if (!updated) { res.status(404).json({ error: "Bruker ikke funnet" }); return; }

  const action = isActive ? "user.activate" : "user.deactivate";
  await logAdminAction({
    req,
    action,
    targetType: "user",
    targetUserId: before.id,
    targetEmail: before.email,
    reason: reason ?? undefined,
    metadata: { before: { isActive: before.isActive }, after: { isActive: updated.isActive } },
  });

  res.json(updated);
});

// ─── Admin action on user subscription tier ───────────────────────────────
router.patch("/admin/users/:id/subscription", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const { subscriptionTier, reason } = req.body as { subscriptionTier: "free" | "standard" | "premium"; reason?: string };

  const [before] = await db
    .select({ id: usersTable.id, email: usersTable.email, subscriptionTier: usersTable.subscriptionTier })
    .from(usersTable)
    .where(eq(usersTable.id, id));

  if (!before) { res.status(404).json({ error: "Bruker ikke funnet" }); return; }

  const [updated] = await db
    .update(usersTable)
    .set({ subscriptionTier, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, subscriptionTier: usersTable.subscriptionTier });

  if (!updated) { res.status(404).json({ error: "Bruker ikke funnet" }); return; }

  await logAdminAction({
    req,
    action: "billing.tier.change",
    targetType: "user",
    targetUserId: before.id,
    targetEmail: before.email,
    reason: reason ?? undefined,
    metadata: {
      before: { subscriptionTier: before.subscriptionTier },
      after: { subscriptionTier: updated.subscriptionTier },
    },
  });

  res.json(updated);
});

export default router;
