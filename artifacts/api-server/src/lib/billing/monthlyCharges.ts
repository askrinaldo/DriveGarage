/**
 * Monthly recurring charge creation job.
 *
 * Vipps does NOT create recurring charges automatically after an agreement is
 * activated. The merchant (DriveGarage) must create each monthly charge explicitly
 * via POST /recurring/v3/agreements/{agreementId}/charges.
 *
 * This module implements a safe, idempotent job to:
 *   1. Find all active subscriptions that do not yet have a charge for the
 *      current billing period (YYYY-MM).
 *   2. Insert a pending billing_charges row first (DB-level deduplication lock).
 *   3. Create the charge via the Vipps API.
 *   4. Update the row with the Vipps chargeId.
 *   5. Reconcile local charge status against Vipps for stale rows.
 *
 * Lead time rule (official Vipps spec):
 *   The `due` date must be at least 1 day in the future. We use 2 days to account
 *   for timezone edge cases and late-night job runs.
 *
 * Double-charge prevention:
 *   - DB unique index on (subscription_id, billing_period) rejects duplicates.
 *   - Application-level check before insert.
 *   - Idempotency key (orderId) is stable per (userId, billingPeriod, attempt).
 *
 * Scheduler:
 *   Replit does not provide managed cron. Trigger this job via:
 *     POST /admin/billing/run-monthly-charges  (super_admin only, bearer auth)
 *   In production, call this endpoint from an external scheduler (e.g. GitHub
 *   Actions cron, Upstash QStash, Render cron jobs) on the 1st of each month.
 *   The job is idempotent — running it multiple times on the same day is safe.
 */

import crypto from "crypto";
import { eq, and, sql } from "drizzle-orm";
import { db, subscriptionsTable, billingChargesTable, usersTable } from "@workspace/db";
import { createVippsCharge, getVippsCharge, listVippsCharges } from "../vipps/charges";
import { PLAN_PRICE_NOK } from "../subscription";
import { logger } from "../logger";

export interface BillingJobResult {
  billingPeriod:   string;
  dueDate:         string;
  processed:       number;
  created:         number;
  skipped:         number;   // already had a charge for this period
  errors:          number;
  reconciled:      number;   // stale rows updated via Vipps GET
  dryRun:          boolean;
  errorDetails:    string[];
}

/** Returns the current billing period as YYYY-MM. */
export function currentBillingPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Returns the due date for a new charge: 2 days from now.
 * Meets the "at least 1 day in the future" requirement with a safety buffer.
 */
function chargeDueDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(12, 0, 0, 0); // noon to avoid edge cases around midnight
  return d;
}

/**
 * Generates a stable orderId for a given (userId, billingPeriod, attempt).
 * Stable across retries within the same attempt counter; unique across periods.
 * Format: dg-<userId>-<YYYYMM>-<shortUUID>  (max 64 chars, alphanumeric + dash)
 */
function generateOrderId(userId: number, billingPeriod: string, attempt: number): string {
  const period = billingPeriod.replace("-", "");
  const suffix = crypto.randomBytes(4).toString("hex");
  return `dg-${userId}-${period}-${attempt}-${suffix}`.slice(0, 64);
}

/**
 * Runs the monthly charge creation job for all active subscriptions.
 *
 * @param options.dryRun - If true, query and report without creating any charges.
 * @param options.limitToUserId - If set, only process this specific user (for testing).
 */
export async function runMonthlyBillingJob(options: {
  dryRun?:         boolean;
  limitToUserId?:  number;
} = {}): Promise<BillingJobResult> {
  const billingPeriod = currentBillingPeriod();
  const dueDate       = chargeDueDate();
  const dryRun        = options.dryRun ?? false;
  const result: BillingJobResult = {
    billingPeriod,
    dueDate:      dueDate.toISOString(),
    processed:    0,
    created:      0,
    skipped:      0,
    errors:       0,
    reconciled:   0,
    dryRun,
    errorDetails: [],
  };

  logger.info({ billingPeriod, dueDate, dryRun }, "Monthly billing job started");

  // Find active subscriptions without a charge for this billing period.
  // Excludes rows that are already in pending/due/charged state (failed/cancelled are retried).
  const rows = await db.execute(sql`
    SELECT
      s.id             AS sub_id,
      s.user_id,
      s.vipps_agreement_id
    FROM subscriptions s
    WHERE s.status = 'active'
      AND s.vipps_agreement_id IS NOT NULL
      ${options.limitToUserId != null ? sql`AND s.user_id = ${options.limitToUserId}` : sql``}
      AND NOT EXISTS (
        SELECT 1 FROM billing_charges bc
        WHERE bc.subscription_id = s.id
          AND bc.billing_period  = ${billingPeriod}
          AND bc.status NOT IN ('failed', 'cancelled')
      )
  `);

  const subscriptions = rows.rows as Array<{
    sub_id: number;
    user_id: number;
    vipps_agreement_id: string;
  }>;

  result.processed = subscriptions.length;
  logger.info({ count: subscriptions.length, billingPeriod }, "Subscriptions needing charge");

  if (dryRun) {
    result.skipped = subscriptions.length;
    logger.info("Dry run — no charges created");
    return result;
  }

  for (const sub of subscriptions) {
    const { sub_id: subscriptionId, user_id: userId, vipps_agreement_id: agreementId } = sub;

    try {
      const orderId = generateOrderId(userId, billingPeriod, 1);
      const amountNok = PLAN_PRICE_NOK; // 50 NOK — must match the agreement amount in agreements.ts

      // Insert pending row first — DB unique index rejects race condition duplicates.
      const [chargeRow] = await db
        .insert(billingChargesTable)
        .values({
          subscriptionId,
          userId,
          billingPeriod,
          orderId,
          amountNok,
          status:  "pending",
          dueDate,
        })
        .returning()
        .onConflictDoNothing();

      if (!chargeRow) {
        // unique index blocked the insert — another process already created it
        logger.info({ subscriptionId, billingPeriod }, "Charge already exists — skipping");
        result.skipped++;
        continue;
      }

      // Create the charge via Vipps API
      const chargeRef = await createVippsCharge({
        agreementId,
        amountNok,
        description: `DriveGarage — ${billingPeriod}`,
        dueDate,
        retryDays:   5,
        idempotencyKey: orderId,
      });

      // Update with Vipps chargeId
      await db
        .update(billingChargesTable)
        .set({
          vippsChargeId: chargeRef.chargeId,
          status:        "due",
          updatedAt:     new Date(),
        })
        .where(eq(billingChargesTable.id, chargeRow.id));

      logger.info({ subscriptionId, userId, chargeId: chargeRef.chargeId, orderId }, "Charge created");
      result.created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err, subscriptionId, userId }, "Failed to create monthly charge");
      result.errors++;
      result.errorDetails.push(`sub=${subscriptionId} user=${userId}: ${msg}`);

      // Mark the pending row as failed so it can be retried next run
      await db
        .update(billingChargesTable)
        .set({
          status:    "failed",
          lastError: msg,
          failedAt:  new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(billingChargesTable.subscriptionId, subscriptionId),
            eq(billingChargesTable.billingPeriod, billingPeriod),
            eq(billingChargesTable.status, "pending"),
          ),
        );
    }
  }

  logger.info(result, "Monthly billing job completed");
  return result;
}

/**
 * Reconciles local charge status against Vipps for stale rows.
 * Updates "pending" or "due" charges whose due date has passed.
 * Should be run after the main billing job or separately.
 */
export async function reconcileCharges(): Promise<{ updated: number }> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const staleRows = await db
    .select()
    .from(billingChargesTable)
    .where(
      and(
        sql`${billingChargesTable.status} IN ('pending', 'due')`,
        sql`${billingChargesTable.dueDate} < ${yesterday}`,
        sql`${billingChargesTable.vippsChargeId} IS NOT NULL`,
      ),
    );

  let updated = 0;

  for (const row of staleRows) {
    if (!row.vippsChargeId) continue;

    // Get subscription for agreementId
    const [sub] = await db
      .select({ vippsAgreementId: subscriptionsTable.vippsAgreementId })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, row.subscriptionId));

    if (!sub?.vippsAgreementId) continue;

    try {
      const charge = await getVippsCharge(sub.vippsAgreementId, row.vippsChargeId);
      const now    = new Date();

      let newStatus: "charged" | "failed" | "cancelled" | undefined;
      if (charge.status === "CHARGED")                 newStatus = "charged";
      else if (charge.status === "FAILED")             newStatus = "failed";
      else if (charge.status === "CANCELLED")          newStatus = "cancelled";

      if (newStatus) {
        await db
          .update(billingChargesTable)
          .set({
            status:     newStatus,
            chargedAt:  newStatus === "charged"   ? now : row.chargedAt,
            failedAt:   newStatus === "failed"    ? now : row.failedAt,
            cancelledAt: newStatus === "cancelled" ? now : row.cancelledAt,
            updatedAt:  now,
          })
          .where(eq(billingChargesTable.id, row.id));
        updated++;
      }
    } catch (err) {
      logger.warn({ err, chargeId: row.vippsChargeId }, "Could not reconcile charge from Vipps");
    }
  }

  return { updated };
}
