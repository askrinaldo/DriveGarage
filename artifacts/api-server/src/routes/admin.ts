import { Router } from "express";
import { eq, desc, count, sql, gte } from "drizzle-orm";
import { db, usersTable, vehiclesTable, auditLogsTable, clubsTable, subscriptionsTable, subscriptionEventsTable, billingChargesTable } from "@workspace/db";
import { parseUserAuth, requireSuperAdmin } from "../middleware/userAuth";
import { runMonthlyBillingJob, reconcileCharges, currentBillingPeriod } from "../lib/billing/monthlyCharges";
import { logAdminAction } from "../lib/adminAudit";
import {
  getActivePaymentExemptionForUser,
  createPaymentExemption,
  revokePaymentExemption,
} from "../lib/paymentExemptions";

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

// ─── Billing stats (Vipps) ────────────────────────────────────────────────
router.get("/admin/billing-stats", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [newUsersRow] = await db
    .select({ cnt: count() })
    .from(usersTable)
    .where(gte(usersTable.createdAt, monthStart));
  const newUsersThisMonth = Number(newUsersRow?.cnt ?? 0);

  // Subscription status counts from subscriptions table
  const statusCounts = await db.execute(sql`
    SELECT status, COUNT(*) AS cnt
    FROM subscriptions
    GROUP BY status
  `);
  const statusMap: Record<string, number> = {};
  for (const r of statusCounts.rows as Array<Record<string, unknown>>) {
    statusMap[String(r.status ?? "")] = Number(r.cnt ?? 0);
  }

  const activeSubscriptions = statusMap["active"] ?? 0;
  // MRR estimate: active subs × 100 NOK/month (one plan, no Vipps settlement data yet)
  const mrrNok = activeSubscriptions * 100;

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

  res.json({
    provider: "vipps",
    newUsersThisMonth,
    activeSubscriptions,
    mrr: mrrNok,
    arr: mrrNok * 12,
    statusCounts: statusMap,
    userGrowth: (userGrowth.rows as Array<Record<string, unknown>>).map(r => ({
      month: String(r.month ?? ""),
      count: Number(r.cnt ?? 0),
    })),
    note: "Revenue figures are estimated (100 NOK × active subscriptions). Actual settlement data requires Vipps Report API integration.",
  });
});

// ─── MRR history (last 12 months) ─────────────────────────────────────────
// Returns new/churned subscription counts per month from subscription_events.
// Revenue figures are estimated until Vipps Report API is integrated.
router.get("/admin/mrr-history", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const result = await db.execute(sql`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') AS month,
      DATE_TRUNC('month', created_at) AS month_date,
      COUNT(*) FILTER (WHERE event_type = 'recurring.agreement-activated.v1') AS new_subs,
      COUNT(*) FILTER (WHERE event_type IN ('recurring.agreement-stopped.v1','recurring.agreement-expired.v1')) AS churned
    FROM subscription_events
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month_date
  `);

  const eventRows = (result.rows as Array<Record<string, unknown>>).map(r => ({
    month:   String(r.month ?? ""),
    mrr:     0,   // estimated below
    newSubs: Number(r.new_subs ?? 0),
    churned: Number(r.churned ?? 0),
  }));

  // Fill in any missing months with zero rows
  const now = new Date();
  const rows: typeof eventRows = [];
  for (let i = 11; i >= 0; i--) {
    const d     = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("nb-NO", { month: "short", year: "2-digit" });
    const found = eventRows.find(r => r.month.toLowerCase() === label.toLowerCase());
    rows.push(found ?? { month: label, mrr: 0, newSubs: 0, churned: 0 });
  }

  res.json(rows);
});

// ─── Billing events (replaces Stripe invoices) ────────────────────────────
// Shows recent subscription_events for operational monitoring.
router.get("/admin/invoices", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const events = await db
    .select({
      id:               subscriptionEventsTable.id,
      userId:           subscriptionEventsTable.userId,
      eventType:        subscriptionEventsTable.eventType,
      processingStatus: subscriptionEventsTable.processingStatus,
      error:            subscriptionEventsTable.error,
      receivedAt:       subscriptionEventsTable.receivedAt,
      processedAt:      subscriptionEventsTable.processedAt,
    })
    .from(subscriptionEventsTable)
    .orderBy(desc(subscriptionEventsTable.receivedAt))
    .limit(200);

  res.json(events);
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

// ─── Subscription list (Vipps) ────────────────────────────────────────────
// Lists all users with a subscriptions row or non-default status.
// agreementId is partially masked for security — last 6 chars only.
router.get("/admin/subscriptions", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const rows = await db.execute(sql`
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.subscription_status,
      u.vipps_agreement_id,
      u.current_period_ends_at,
      u.expires_at,
      u.deletion_requested_at,
      u.created_at,
      s.id AS sub_id,
      s.status AS sub_status,
      s.plan_code,
      s.cancel_at_period_end,
      s.current_period_ends_at AS sub_period_ends,
      s.canceled_at,
      s.updated_at AS sub_updated,
      pe.exemption_type,
      pe.reason AS exemption_reason,
      pe.expires_at AS exemption_expires,
      (
        SELECT event_type FROM subscription_events se
        WHERE se.user_id = u.id
        ORDER BY se.created_at DESC LIMIT 1
      ) AS last_event_type,
      (
        SELECT processing_status FROM subscription_events se
        WHERE se.user_id = u.id
        ORDER BY se.created_at DESC LIMIT 1
      ) AS last_event_status,
      (
        SELECT error FROM subscription_events se
        WHERE se.user_id = u.id AND se.processing_status = 'failed'
        ORDER BY se.created_at DESC LIMIT 1
      ) AS last_billing_error
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    LEFT JOIN payment_exemptions pe
      ON pe.user_id = u.id
      AND pe.revoked_at IS NULL
      AND (pe.expires_at IS NULL OR pe.expires_at > NOW())
    ORDER BY u.created_at DESC
    LIMIT 500
  `);

  const masked = (id: string | null | undefined): string | null => {
    if (!id) return null;
    return `****${id.slice(-6)}`;
  };

  const result = (rows.rows as Array<Record<string, unknown>>).map(r => ({
    userId:               Number(r.id),
    name:                 r.name,
    email:                r.email,
    role:                 r.role,
    userStatus:           r.subscription_status,
    agreementIdMasked:    masked(r.vipps_agreement_id as string | null),
    periodEndsAt:         r.sub_period_ends ?? r.current_period_ends_at,
    expiresAt:            r.expires_at,
    cancelAtPeriodEnd:    Boolean(r.cancel_at_period_end),
    canceledAt:           r.canceled_at,
    plan:                 r.plan_code ?? "monthly_100",
    subStatus:            r.sub_status,
    exemptionType:        r.exemption_type ?? null,
    exemptionReason:      r.exemption_reason ?? null,
    exemptionExpires:     r.exemption_expires ?? null,
    lastEventType:        r.last_event_type ?? null,
    lastEventStatus:      r.last_event_status ?? null,
    lastBillingError:     r.last_billing_error ?? null,
    deletionRequestedAt:  r.deletion_requested_at ?? null,
    userCreatedAt:        r.created_at,
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

// ─── Payment exemptions ────────────────────────────────────────────────────

router.get("/admin/users/:id/payment-exemption", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Ugyldig bruker-ID" }); return; }
  const exemption = await getActivePaymentExemptionForUser(id);
  res.json({ exemption });
});

router.post("/admin/users/:id/payment-exemption", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Ugyldig bruker-ID" }); return; }
  const { type, reason, expiresAt } = req.body as {
    type: "internal" | "partner" | "test" | "manual";
    reason: string;
    expiresAt?: string;
  };

  if (!type || !["internal", "partner", "test", "manual"].includes(type)) {
    res.status(400).json({ error: "Ugyldig type. Gyldige verdier: internal, partner, test, manual" });
    return;
  }
  if (!reason?.trim()) {
    res.status(400).json({ error: "reason er obligatorisk" });
    return;
  }

  const existing = await getActivePaymentExemptionForUser(id);
  if (existing) {
    res.status(409).json({ error: "Brukeren har allerede et aktivt betalingsunntak" });
    return;
  }

  try {
    const created = await createPaymentExemption(
      req,
      id,
      type,
      reason,
      expiresAt ? new Date(expiresAt) : undefined,
    );
    res.status(201).json({ exemption: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    res.status(400).json({ error: message });
  }
});

router.delete("/admin/users/:id/payment-exemption", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Ugyldig bruker-ID" }); return; }
  const { reason } = req.body as { reason?: string };

  if (!reason?.trim()) {
    res.status(400).json({ error: "reason er obligatorisk ved tilbakekalling" });
    return;
  }

  try {
    const revoked = await revokePaymentExemption(req, id, reason);
    res.json({ exemption: revoked });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    const status = message.includes("no active exemption") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

// ── POST /admin/billing/run-monthly-charges ───────────────────────────────────
// Triggers the monthly charge creation job. Idempotent — safe to run multiple
// times; existing charges for the current period are skipped.
// In production: call from an external scheduler on the 1st of each month.

router.post("/admin/billing/run-monthly-charges", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const { dryRun, limitToUserId } = req.body as {
    dryRun?: boolean;
    limitToUserId?: number;
  };

  try {
    const result = await runMonthlyBillingJob({
      dryRun:        dryRun === true,
      limitToUserId: limitToUserId !== undefined ? Number(limitToUserId) : undefined,
    });

    req.log.info(result, "Monthly billing job triggered by admin");
    res.json({ ok: true, result });
  } catch (err) {
    req.log.error({ err }, "Monthly billing job error");
    res.status(500).json({ error: "Billing job failed", detail: String(err) });
  }
});

// ── POST /admin/billing/reconcile-charges ─────────────────────────────────────
// Reconciles stale pending/due charges against Vipps state.

router.post("/admin/billing/reconcile-charges", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  try {
    const result = await reconcileCharges();
    req.log.info(result, "Charge reconciliation triggered by admin");
    res.json({ ok: true, result });
  } catch (err) {
    req.log.error({ err }, "Charge reconciliation error");
    res.status(500).json({ error: "Reconciliation failed", detail: String(err) });
  }
});

// ── GET /admin/billing/charges ────────────────────────────────────────────────
// Lists recent billing charge rows for auditing.

router.get("/admin/billing/charges", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const limitParam = parseInt(String(req.query.limit ?? "50"), 10);
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 50 : limitParam), 200);
  const period = req.query.period as string | undefined;

  const rows = await db
    .select({
      id:             billingChargesTable.id,
      subscriptionId: billingChargesTable.subscriptionId,
      userId:         billingChargesTable.userId,
      billingPeriod:  billingChargesTable.billingPeriod,
      orderId:        billingChargesTable.orderId,
      vippsChargeId:  billingChargesTable.vippsChargeId,
      amountNok:      billingChargesTable.amountNok,
      status:         billingChargesTable.status,
      dueDate:        billingChargesTable.dueDate,
      chargedAt:      billingChargesTable.chargedAt,
      failedAt:       billingChargesTable.failedAt,
      retryCount:     billingChargesTable.retryCount,
      lastError:      billingChargesTable.lastError,
      createdAt:      billingChargesTable.createdAt,
    })
    .from(billingChargesTable)
    .where(period ? sql`${billingChargesTable.billingPeriod} = ${period}` : sql`1=1`)
    .orderBy(desc(billingChargesTable.createdAt))
    .limit(limit);

  res.json({
    charges: rows,
    currentPeriod: currentBillingPeriod(),
    count: rows.length,
  });
});

export default router;
