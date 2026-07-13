/**
 * Account management routes.
 *
 * These routes are always accessible regardless of subscription status.
 *
 *   POST /account/request-deletion  — schedule account deletion (14-day grace period)
 *   POST /account/cancel-deletion   — cancel a pending deletion request
 *
 * Account deletion is a separate, permanent action from subscription cancellation.
 * It requires explicit confirmation phrase and a 14-day cooling-off period.
 *
 * During the grace period the user can cancel deletion. After 14 days, a cleanup
 * job (not yet implemented) will anonymize/delete the data. Only minimal records
 * required for accounting/audit are retained.
 *
 * Data retained permanently:
 *   - Billing/payment event records (accounting requirement)
 *   - Subscription events (fraud/audit requirement)
 *
 * Data deleted/anonymized after 14 days:
 *   - Vehicles, service records, receipts, trip logs
 *   - Club memberships and user-created club content
 *   - Personal settings, profile data
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { parseUserAuth, requireUser } from "../middleware/userAuth";
import { getEffectiveSubscription } from "../lib/subscription";
import { isVippsConfigured } from "../lib/vipps/config";
import { stopVippsAgreement } from "../lib/vipps/agreements";

const router = Router();

/** Required confirmation phrase for account deletion. */
const DELETION_CONFIRM_PHRASE = "slett kontoen min";

/**
 * POST /account/request-deletion
 *
 * Schedules account deletion with a 14-day grace period.
 * If an active Vipps agreement exists, it is stopped first.
 *
 * Body: { confirmPhrase: string }
 * Returns: { deletionRequestedAt, scheduledDeleteAt, message }
 */
router.post(
  "/account/request-deletion",
  parseUserAuth,
  requireUser,
  async (req, res): Promise<void> => {
    const userId = req.userAuth!.userId;
    const { confirmPhrase } = req.body as { confirmPhrase?: string };

    if (!confirmPhrase || confirmPhrase.trim().toLowerCase() !== DELETION_CONFIRM_PHRASE) {
      res.status(400).json({
        error: "confirm_phrase_mismatch",
        message: `Skriv inn "${DELETION_CONFIRM_PHRASE}" for å bekrefte.`,
        requiredPhrase: DELETION_CONFIRM_PHRASE,
      });
      return;
    }

    // Check current subscription state
    const sub = await getEffectiveSubscription(userId);

    if (sub.status === "deletion_requested") {
      res.status(409).json({
        error: "already_requested",
        message: "En slettingsforespørsel er allerede aktiv.",
      });
      return;
    }

    // Stop active Vipps agreement first (best-effort — log and continue if it fails)
    if (sub.vippsAgreementId && isVippsConfigured()) {
      try {
        await stopVippsAgreement(sub.vippsAgreementId);
        req.log.info(
          { userId, agreementId: sub.vippsAgreementId },
          "Vipps agreement stopped as part of account deletion request",
        );
      } catch (err) {
        req.log.warn(
          { err, userId, agreementId: sub.vippsAgreementId },
          "Could not stop Vipps agreement during deletion request — continuing",
        );
      }
    }

    const now              = new Date();
    const gracePeriodDays  = 14;
    const scheduledDeleteAt = new Date(now.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

    await db
      .update(usersTable)
      .set({
        subscriptionStatus:  "deletion_requested",
        deletionRequestedAt: now,
        updatedAt:           now,
      })
      .where(eq(usersTable.id, userId));

    req.log.info({ userId, scheduledDeleteAt }, "Account deletion requested");

    res.json({
      deletionRequestedAt: now.toISOString(),
      scheduledDeleteAt:   scheduledDeleteAt.toISOString(),
      gracePeriodDays,
      message:
        `Kontoen din er planlagt slettet om ${gracePeriodDays} dager (${scheduledDeleteAt.toLocaleDateString("no-NO")}). ` +
        "Du kan angre dette innen fristen ved å kansellere forespørselen.",
    });
  },
);

/**
 * POST /account/cancel-deletion
 *
 * Cancels a pending deletion request within the grace period.
 * Restores status to pending_payment_setup; user must re-setup billing to get access.
 */
router.post(
  "/account/cancel-deletion",
  parseUserAuth,
  requireUser,
  async (req, res): Promise<void> => {
    const userId = req.userAuth!.userId;

    const [user] = await db
      .select({
        subscriptionStatus:  usersTable.subscriptionStatus,
        deletionRequestedAt: usersTable.deletionRequestedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!user) {
      res.status(404).json({ error: "user_not_found", message: "Bruker ikke funnet." });
      return;
    }

    if (user.subscriptionStatus !== "deletion_requested") {
      res.status(400).json({
        error:   "no_pending_deletion",
        message: "Ingen aktiv slettingsforespørsel å avbryte.",
      });
      return;
    }

    // Check grace period has not expired
    if (user.deletionRequestedAt) {
      const gracePeriodMs = 14 * 24 * 60 * 60 * 1000;
      const deadline      = new Date(user.deletionRequestedAt.getTime() + gracePeriodMs);
      if (new Date() > deadline) {
        res.status(410).json({
          error:   "grace_period_expired",
          message: "14-dagersfristen for å angre er utløpt. Kontakt support.",
        });
        return;
      }
    }

    await db
      .update(usersTable)
      .set({
        subscriptionStatus:  "pending_payment_setup",
        deletionRequestedAt: null,
        updatedAt:           new Date(),
      })
      .where(eq(usersTable.id, userId));

    req.log.info({ userId }, "Account deletion request cancelled");

    res.json({
      message: "Slettingsforespørselen er kansellert. Kontoen din er aktiv igjen.",
    });
  },
);

export default router;
