/**
 * billing_charges — merchant-created monthly charges submitted to Vipps.
 *
 * Design principles:
 * - One row per billing attempt per (subscriptionId, billingPeriod).
 * - The unique constraint on (subscription_id, billing_period) enforces
 *   deduplication: only one non-failed/cancelled charge per month per subscription.
 * - orderId doubles as the Vipps idempotency key. Format: dg-<userId>-<YYYYMM>-<uuid8>
 * - Status is updated by the monthly charge job and by Vipps webhooks.
 */

import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { subscriptionsTable } from "./subscriptions";

export const BILLING_CHARGE_STATUSES = [
  "pending",    // inserted locally, Vipps API call not yet completed
  "due",        // created in Vipps, waiting for due date to pass
  "charged",    // successfully captured by Vipps
  "failed",     // final failure after all Vipps retries exhausted
  "cancelled",  // cancelled before due date (e.g. subscription stopped)
  "refunded",   // fully refunded after capture
] as const;

export type BillingChargeStatus = (typeof BILLING_CHARGE_STATUSES)[number];

export const billingChargesTable = pgTable(
  "billing_charges",
  {
    id: serial("id").primaryKey(),

    subscriptionId: integer("subscription_id")
      .notNull()
      .references(() => subscriptionsTable.id, { onDelete: "cascade" }),

    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    /**
     * Billing period in YYYY-MM format (e.g. "2026-07").
     * Combined with subscriptionId in the unique index below to enforce
     * exactly-once charge creation per period per subscription.
     */
    billingPeriod: text("billing_period").notNull(),

    /**
     * Our internal order ID, used as the Vipps Idempotency-Key and orderId.
     * Format: dg-<userId>-<YYYYMM>-<uuid8>
     * Must be globally unique and match the regex ^[a-zA-Z0-9-]+$.
     */
    orderId: text("order_id").notNull().unique(),

    /** Vipps-assigned chargeId. Null until Vipps confirms charge creation. */
    vippsChargeId: text("vipps_charge_id"),

    /** Amount in NOK (whole units). Always 100 for the current plan. */
    amountNok: integer("amount_nok").notNull(),

    status: text("status", { enum: BILLING_CHARGE_STATUSES }).notNull().default("pending"),

    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),

    /** Populated from recurring.charge-captured.v1 webhook. */
    chargedAt:   timestamp("charged_at",   { withTimezone: true }),
    /** Populated from recurring.charge-failed.v1 webhook (final failure). */
    failedAt:    timestamp("failed_at",    { withTimezone: true }),
    /** Populated when merchant cancels a DUE charge. */
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    /** Number of times this charge row has been retried after a creation error. */
    retryCount: integer("retry_count").notNull().default(0),
    lastError:  text("last_error"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [
    /**
     * Prevents double-charging: only one active charge row per subscription per month.
     * "Active" = status not in (failed, cancelled).
     * Enforced at application level in monthlyCharges.ts; this index is the DB backstop.
     */
    uniqueIndex("billing_charges_sub_period_uidx").on(t.subscriptionId, t.billingPeriod),
  ],
);

export type BillingCharge = typeof billingChargesTable.$inferSelect;
export type NewBillingCharge = typeof billingChargesTable.$inferInsert;
