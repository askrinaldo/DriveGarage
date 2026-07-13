/**
 * Billing access middleware.
 *
 * `requirePaidAccess` enforces subscription gating when BILLING_ENFORCEMENT_ENABLED=true.
 * Apply AFTER `parseUserAuth` and `requireUser`.
 *
 * Always allowed through (even when enforcement is on):
 *   - GET/POST /api/billing/*          (subscription management)
 *   - GET /api/account/*               (deletion management)
 *   - Any route when enforcement is off (BILLING_ENFORCEMENT_ENABLED != "true")
 *
 * super_admin and exempt_internal users always pass through.
 */

import type { Request, Response, NextFunction } from "express";
import { hasPaidAccess, getSubscriptionLockReason } from "../lib/subscription";

/**
 * Express middleware that enforces paid subscription access.
 *
 * Returns HTTP 402 with a structured JSON body when access is denied:
 *   { error: "subscription_required", code: "SUBSCRIPTION_REQUIRED", reason, upgradeUrl }
 *
 * Note: BILLING_ENFORCEMENT_ENABLED=false bypasses this (handled inside hasPaidAccess).
 * Apply only to application routes — never to billing, account, legal, or auth routes.
 */
export async function requirePaidAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.userAuth?.userId;

  if (!userId) {
    // requireUser should run first; if no userId here it means auth is not required for this route
    next();
    return;
  }

  const hasAccess = await hasPaidAccess(userId);

  if (!hasAccess) {
    const reason = await getSubscriptionLockReason(userId);
    res.status(402).json({
      error:      "subscription_required",
      code:       "SUBSCRIPTION_REQUIRED",
      reason:     reason ?? "Abonnementet er ikke aktivt.",
      upgradeUrl: "/billing",
    });
    return;
  }

  next();
}
