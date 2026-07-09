/**
 * Vipps subscription helpers — central access-control logic.
 *
 * No real Vipps API calls here. This module resolves subscription state
 * from the DB and provides helpers consumed by routes and middleware.
 */

import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import type { SubscriptionStatus } from "@workspace/db";

export type { SubscriptionStatus };

// ── Plan constants ────────────────────────────────────────────────────────────

export const SUBSCRIPTION_PLAN = "monthly_100" as const;
export const PLAN_PRICE_NOK = 100;
export const TRIAL_DAYS = 7;

// ── Fair-use limits (internal — not marketed as storage limits) ───────────────

export const FAIR_USE_LIMITS = {
  vehicles: 10,
  receipts: 200,
  aiRequestsPerMonth: 50,
  pdfExportsPerMonth: 25,
  clubMemberships: 10,
  ownedClubs: 2,
} as const;

export type FairUseFeature = keyof typeof FAIR_USE_LIMITS;

// ── Access helpers ────────────────────────────────────────────────────────────

/**
 * Returns true if the user may open the app at all.
 * Locked statuses: expired, deletion_requested, deleted.
 */
export function canAccessApp(status: SubscriptionStatus | null | undefined): boolean {
  if (!status) return true; // no status = pre-billing era, always allow
  const LOCKED: SubscriptionStatus[] = ["expired", "deletion_requested", "deleted"];
  return !LOCKED.includes(status);
}

/**
 * Returns true if the user has full feature access (not degraded).
 * Degraded: past_due, payment_failed, pending_vipps_agreement.
 */
export function hasFullAccess(status: SubscriptionStatus | null | undefined): boolean {
  if (!status) return true;
  const FULL: SubscriptionStatus[] = ["trialing", "active", "exempt_internal"];
  return FULL.includes(status);
}

/**
 * Whether the user has specifically requested account deletion.
 */
export function isDeletionRequested(status: SubscriptionStatus | null | undefined): boolean {
  return status === "deletion_requested" || status === "deleted";
}

// ── DB helpers ────────────────────────────────────────────────────────────────

export interface SubscriptionRow {
  status: SubscriptionStatus | null;
  plan: string | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
  canceledAt: Date | null;
  expiresAt: Date | null;
  vippsAgreementId: string | null;
}

export async function getSubscriptionStatus(userId: number): Promise<SubscriptionRow | null> {
  const [row] = await db
    .select({
      status: usersTable.subscriptionStatus,
      plan: usersTable.subscriptionPlan,
      trialStartedAt: usersTable.trialStartedAt,
      trialEndsAt: usersTable.trialEndsAt,
      currentPeriodEndsAt: usersTable.currentPeriodEndsAt,
      canceledAt: usersTable.canceledAt,
      expiresAt: usersTable.expiresAt,
      vippsAgreementId: usersTable.vippsAgreementId,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!row) return null;

  return {
    ...row,
    status: row.status as SubscriptionStatus | null,
  };
}

/**
 * Compute days remaining in trial. Returns null if no trial end date.
 * Returns 0 if expired.
 */
export function trialDaysRemaining(trialEndsAt: Date | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const ms = trialEndsAt.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

// ── TODO gates (add hard enforcement here when Vipps is live) ─────────────────
//
//  WHERE TO ADD GATES:
//  - POST /api/vehicles              → FAIR_USE_LIMITS.vehicles
//  - POST /api/vehicles/:id/receipts → FAIR_USE_LIMITS.receipts
//  - POST /api/clubs                 → FAIR_USE_LIMITS.ownedClubs
//  - POST /api/clubs/:id/members     → FAIR_USE_LIMITS.clubMemberships
//  - GET/POST /api/ai/*              → FAIR_USE_LIMITS.aiRequestsPerMonth
//  - GET/POST /api/pdf/*             → FAIR_USE_LIMITS.pdfExportsPerMonth
//
//  Pattern for each gate:
//    const sub = await getSubscriptionStatus(req.userAuth!.userId);
//    if (!canAccessApp(sub?.status)) { res.status(403).json({ error: "..." }); return; }
//    const count = await countUserVehicles(req.userAuth!.userId);
//    if (count >= FAIR_USE_LIMITS.vehicles) { res.status(403).json({ error: "Grensen nådd" }); return; }
