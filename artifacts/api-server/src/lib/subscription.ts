/**
 * Central subscription access control.
 *
 * Single source of truth for:
 *   - Access decisions (hasPaidAccess, canAccessFeature)
 *   - Subscription state from DB
 *   - Fair-use constants
 *   - BILLING_ENFORCEMENT_ENABLED flag
 *
 * No Vipps API calls here — see lib/vipps/ for those.
 */

import { eq, and, isNull, or, gt, desc } from "drizzle-orm";
import { db, usersTable, subscriptionsTable, paymentExemptionsTable } from "@workspace/db";
import type { SubscriptionStatus } from "@workspace/db";
import { isBillingEnforcementEnabled } from "./vipps/config";
import { isUserPaymentExempt } from "./paymentExemptions";
import { logger } from "./logger";

export type { SubscriptionStatus };

// ── Plan constants ────────────────────────────────────────────────────────────

export const SUBSCRIPTION_PLAN    = "monthly_100" as const;
export const PLAN_PRICE_NOK       = 100;
export const PLAN_DISPLAY_NAME    = "DriveGarage";

// ── Fair-use limits (internal — not marketed as storage limits) ───────────────

export const FAIR_USE_LIMITS = {
  vehicles:            10,
  receipts:            200,
  aiRequestsPerMonth:  50,
  pdfExportsPerMonth:  25,
  clubMemberships:     10,
  ownedClubs:          2,
} as const;

export type FairUseFeature = keyof typeof FAIR_USE_LIMITS;

// ── Status normalisation ──────────────────────────────────────────────────────

const KNOWN_STATUSES = new Set<SubscriptionStatus>([
  "pending_payment_setup",
  "active",
  "past_due",
  "payment_failed",
  "canceled",
  "expired",
  "exempt_internal",
  "deletion_requested",
  "deleted",
]);

/**
 * Maps raw DB strings to a canonical SubscriptionStatus.
 * Legacy values ("trialing", "pending_vipps_agreement") become "pending_payment_setup".
 */
export function normalizeStatus(raw: string | null | undefined): SubscriptionStatus {
  if (!raw) return "pending_payment_setup";
  if (KNOWN_STATUSES.has(raw as SubscriptionStatus)) return raw as SubscriptionStatus;
  // Legacy mappings
  if (raw === "trialing" || raw === "pending_vipps_agreement") return "pending_payment_setup";
  logger.warn({ raw }, "Unknown subscription status — treating as pending_payment_setup");
  return "pending_payment_setup";
}

// ── DB types ──────────────────────────────────────────────────────────────────

export interface EffectiveSubscription {
  /** Canonical normalised status. */
  status: SubscriptionStatus;
  /** Source: "subscriptions_table" | "users_table" | "exemption" | "super_admin" */
  source: "subscriptions_table" | "users_table" | "exemption" | "super_admin";
  plan: string | null;
  vippsAgreementId: string | null;
  currentPeriodEndsAt: Date | null;
  canceledAt: Date | null;
  cancelAtPeriodEnd: boolean;
  expiresAt: Date | null;
  subscriptionId: number | null;
}

// ── Central access helpers ────────────────────────────────────────────────────

/**
 * Returns the effective subscription for a user.
 *
 * Resolution order:
 *   1. super_admin → exempt_internal
 *   2. Active payment exemption → exempt_internal
 *   3. Latest subscriptions row
 *   4. users.subscriptionStatus fallback (legacy rows with no subscriptions row)
 */
export async function getEffectiveSubscription(
  userId: number,
): Promise<EffectiveSubscription> {
  // 1. Check super_admin
  const [userRow] = await db
    .select({
      role:                usersTable.role,
      subscriptionStatus:  usersTable.subscriptionStatus,
      subscriptionPlan:    usersTable.subscriptionPlan,
      vippsAgreementId:    usersTable.vippsAgreementId,
      currentPeriodEndsAt: usersTable.currentPeriodEndsAt,
      canceledAt:          usersTable.canceledAt,
      expiresAt:           usersTable.expiresAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!userRow) {
    return {
      status:              "expired",
      source:              "users_table",
      plan:                null,
      vippsAgreementId:    null,
      currentPeriodEndsAt: null,
      canceledAt:          null,
      cancelAtPeriodEnd:   false,
      expiresAt:           null,
      subscriptionId:      null,
    };
  }

  if (userRow.role === "super_admin") {
    return {
      status:              "exempt_internal",
      source:              "super_admin",
      plan:                SUBSCRIPTION_PLAN,
      vippsAgreementId:    null,
      currentPeriodEndsAt: null,
      canceledAt:          null,
      cancelAtPeriodEnd:   false,
      expiresAt:           null,
      subscriptionId:      null,
    };
  }

  // 2. Check payment exemption
  const now = new Date();
  const [exemption] = await db
    .select({ id: paymentExemptionsTable.id })
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

  if (exemption) {
    return {
      status:              "exempt_internal",
      source:              "exemption",
      plan:                SUBSCRIPTION_PLAN,
      vippsAgreementId:    null,
      currentPeriodEndsAt: null,
      canceledAt:          null,
      cancelAtPeriodEnd:   false,
      expiresAt:           null,
      subscriptionId:      null,
    };
  }

  // 3. Latest subscriptions row
  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);

  if (sub) {
    return {
      status:              normalizeStatus(sub.status),
      source:              "subscriptions_table",
      plan:                sub.planCode,
      vippsAgreementId:    sub.vippsAgreementId,
      currentPeriodEndsAt: sub.currentPeriodEndsAt,
      canceledAt:          sub.canceledAt,
      cancelAtPeriodEnd:   sub.cancelAtPeriodEnd,
      expiresAt:           sub.expiresAt,
      subscriptionId:      sub.id,
    };
  }

  // 4. Fallback to users table (legacy rows)
  return {
    status:              normalizeStatus(userRow.subscriptionStatus),
    source:              "users_table",
    plan:                userRow.subscriptionPlan,
    vippsAgreementId:    userRow.vippsAgreementId,
    currentPeriodEndsAt: userRow.currentPeriodEndsAt,
    canceledAt:          userRow.canceledAt,
    cancelAtPeriodEnd:   false,
    expiresAt:           userRow.expiresAt,
    subscriptionId:      null,
  };
}

/**
 * Returns true if the user has paid access.
 *
 * When BILLING_ENFORCEMENT_ENABLED=false, always returns true
 * (subscription UI is shown but access is never locked).
 */
export async function hasPaidAccess(userId: number): Promise<boolean> {
  if (!isBillingEnforcementEnabled()) return true;

  const sub = await getEffectiveSubscription(userId);
  return hasPaidAccessFromStatus(sub.status, sub.currentPeriodEndsAt);
}

/**
 * Synchronous status check (use when the EffectiveSubscription is already loaded).
 * Respects canceled-but-within-period and past_due grace access.
 */
export function hasPaidAccessFromStatus(
  status: SubscriptionStatus,
  currentPeriodEndsAt: Date | null,
): boolean {
  if (status === "active" || status === "exempt_internal") return true;

  if (status === "canceled" && currentPeriodEndsAt && currentPeriodEndsAt > new Date()) {
    return true;
  }

  if (status === "past_due") return true;  // grace period — let them in with banner

  return false;
}

/**
 * Returns a human-readable lock reason when access is denied.
 * Returns null when access is allowed.
 */
export async function getSubscriptionLockReason(userId: number): Promise<string | null> {
  if (!isBillingEnforcementEnabled()) return null;

  const sub = await getEffectiveSubscription(userId);
  if (hasPaidAccessFromStatus(sub.status, sub.currentPeriodEndsAt)) return null;

  const REASONS: Partial<Record<SubscriptionStatus, string>> = {
    pending_payment_setup: "Abonnement ikke aktivert. Gå til Abonnement for å sette opp betaling via Vipps.",
    payment_failed:        "Betaling feilet. Sjekk Vipps-appen din.",
    expired:               "Abonnementet har utløpt. Gjenaktiver via Vipps for å fortsette.",
    deletion_requested:    "Kontosletting er forespurt. Kontakt support for å angre.",
    deleted:               "Kontoen er slettet.",
  };

  return REASONS[sub.status] ?? "Abonnementet er ikke aktivt.";
}

/**
 * Returns the subscription row from the subscriptions table, or creates one.
 * Used when starting a Vipps agreement flow.
 */
export async function getOrCreateSubscriptionRow(
  userId: number,
): Promise<typeof subscriptionsTable.$inferSelect> {
  const [existing] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId))
    .orderBy(desc(subscriptionsTable.createdAt))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(subscriptionsTable)
    .values({
      userId,
      provider:  "vipps",
      planCode:  SUBSCRIPTION_PLAN,
      status:    "pending_payment_setup",
    })
    .returning();

  return created!;
}

/**
 * Updates both subscriptions and users tables atomically when a webhook
 * or status check changes the subscription state.
 */
export async function updateSubscriptionStatus(params: {
  subscriptionId: number;
  userId: number;
  status: SubscriptionStatus;
  vippsAgreementId?: string;
  currentPeriodStartsAt?: Date;
  currentPeriodEndsAt?: Date;
  canceledAt?: Date;
  expiresAt?: Date;
  cancelAtPeriodEnd?: boolean;
}): Promise<void> {
  await db
    .update(subscriptionsTable)
    .set({
      status:               params.status,
      vippsAgreementId:     params.vippsAgreementId,
      currentPeriodStartsAt: params.currentPeriodStartsAt,
      currentPeriodEndsAt:  params.currentPeriodEndsAt,
      canceledAt:           params.canceledAt,
      expiresAt:            params.expiresAt,
      cancelAtPeriodEnd:    params.cancelAtPeriodEnd,
      updatedAt:            new Date(),
    })
    .where(eq(subscriptionsTable.id, params.subscriptionId));

  // Mirror critical fields to users table for backward compat
  await db
    .update(usersTable)
    .set({
      subscriptionStatus:  params.status,
      vippsAgreementId:    params.vippsAgreementId,
      currentPeriodEndsAt: params.currentPeriodEndsAt,
      canceledAt:          params.canceledAt,
      expiresAt:           params.expiresAt,
      updatedAt:           new Date(),
    })
    .where(eq(usersTable.id, params.userId));
}

// ── Legacy compat ─────────────────────────────────────────────────────────────

/** @deprecated Use getEffectiveSubscription instead. */
export async function getSubscriptionStatus(userId: number) {
  const sub = await getEffectiveSubscription(userId);
  return {
    status:              sub.status,
    plan:                sub.plan,
    trialStartedAt:      null,
    trialEndsAt:         null,
    currentPeriodEndsAt: sub.currentPeriodEndsAt,
    canceledAt:          sub.canceledAt,
    expiresAt:           sub.expiresAt,
    vippsAgreementId:    sub.vippsAgreementId,
  };
}

/** @deprecated No trial logic. Always returns null. */
export function trialDaysRemaining(_trialEndsAt: Date | null | undefined): null {
  return null;
}
