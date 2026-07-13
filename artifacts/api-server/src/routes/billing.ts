/**
 * Billing routes — Vipps Recurring Payments foundation.
 *
 * Routes:
 *   GET  /billing/subscription          — current user subscription state
 *   GET  /billing/prices                — plan info
 *   POST /billing/vipps/start-agreement — initiate Vipps recurring agreement
 *   GET  /billing/vipps/status          — poll agreement status after redirect
 *   POST /billing/vipps/cancel          — cancel agreement at period end
 *   POST /billing/vipps/webhook         — Vipps webhook receiver (no auth required)
 *
 * Access rules enforced in middleware; these routes only deal with billing state.
 */

import crypto from "crypto";
import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, subscriptionsTable, subscriptionEventsTable, billingChargesTable } from "@workspace/db";
import { parseUserAuth, requireUser } from "../middleware/userAuth";
import {
  getEffectiveSubscription,
  getOrCreateSubscriptionRow,
  updateSubscriptionStatus,
  normalizeStatus,
  SUBSCRIPTION_PLAN,
  PLAN_PRICE_NOK,
  PLAN_DISPLAY_NAME,
} from "../lib/subscription";
import { isVippsConfigured, isBillingEnforcementEnabled } from "../lib/vipps/config";
import { createVippsAgreement, getVippsAgreement, stopVippsAgreement } from "../lib/vipps/agreements";
import { verifyVippsWebhookHmac, parseVippsWebhookEvent, mapWebhookEventToStatus } from "../lib/vipps/webhooks";
import { VippsNotConfiguredError, VippsDuplicateAgreementError, VippsWebhookAuthError } from "../lib/vipps/errors";
import type { SubscriptionStatus } from "@workspace/db";

const router = Router();

// ── GET /billing/subscription ─────────────────────────────────────────────────

router.get("/billing/subscription", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;
  const sub    = await getEffectiveSubscription(userId);

  res.json({
    status:               sub.status,
    plan:                 sub.plan ?? SUBSCRIPTION_PLAN,
    provider:             "vipps",
    vippsConfigured:      isVippsConfigured(),
    enforcementEnabled:   isBillingEnforcementEnabled(),
    currentPeriodEndsAt:  sub.currentPeriodEndsAt?.toISOString() ?? null,
    canceledAt:           sub.canceledAt?.toISOString() ?? null,
    cancelAtPeriodEnd:    sub.cancelAtPeriodEnd,
    expiresAt:            sub.expiresAt?.toISOString() ?? null,
    subscriptionId:       sub.subscriptionId,
  });
});

// ── GET /billing/prices ───────────────────────────────────────────────────────

router.get("/billing/prices", (_req, res): void => {
  res.json({
    prices: [
      {
        plan:        SUBSCRIPTION_PLAN,
        displayName: PLAN_DISPLAY_NAME,
        amount:      PLAN_PRICE_NOK,
        currency:    "NOK",
        interval:    "month",
        label:       `${PLAN_DISPLAY_NAME} — ${PLAN_PRICE_NOK} kr/mnd`,
      },
    ],
  });
});

// ── POST /billing/vipps/start-agreement ───────────────────────────────────────

router.post("/billing/vipps/start-agreement", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;

  try {
    // Prevent duplicate agreements — if any agreementId is stored, query Vipps first.
    const current = await getEffectiveSubscription(userId);
    if (current.status === "active") {
      throw new VippsDuplicateAgreementError();
    }

    if (current.vippsAgreementId && isVippsConfigured()) {
      try {
        const existing = await getVippsAgreement(current.vippsAgreementId);
        if (existing.status === "ACTIVE" || existing.status === "PENDING") {
          throw new VippsDuplicateAgreementError();
        }
        // STOPPED or EXPIRED — allow a fresh agreement
      } catch (err) {
        if (err instanceof VippsDuplicateAgreementError) throw err;
        // Vipps API unreachable — log and fall through to create new agreement
        req.log.warn({ err, agreementId: current.vippsAgreementId }, "Could not verify existing agreement status — allowing new agreement");
      }
    }

    const sub            = await getOrCreateSubscriptionRow(userId);
    const idempotencyKey = crypto.randomUUID();

    const { agreementId, vippsConfirmationUrl } = await createVippsAgreement({
      userId,
      idempotencyKey,
    });

    // Persist agreement ID immediately so it survives webhook before redirect
    await db
      .update(subscriptionsTable)
      .set({ vippsAgreementId: agreementId, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, sub.id));

    await db
      .update(usersTable)
      .set({ vippsAgreementId: agreementId, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    req.log.info({ userId, agreementId }, "Vipps agreement initiated");

    res.json({ redirectUrl: vippsConfirmationUrl });
  } catch (err) {
    if (err instanceof VippsNotConfiguredError) {
      res.status(503).json({ error: err.message, code: err.code });
      return;
    }
    if (err instanceof VippsDuplicateAgreementError) {
      res.status(409).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

// ── GET /billing/vipps/status ─────────────────────────────────────────────────
// Accepts optional ?agreementId= from the Vipps redirect URL so the frontend
// can reconcile immediately after the user approves in Vipps.

router.get("/billing/vipps/status", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;
  const sub    = await getEffectiveSubscription(userId);

  // Prefer agreementId from DB; fall back to query param passed after Vipps redirect
  const queryAgreementId = typeof req.query.agreementId === "string"
    ? req.query.agreementId
    : null;
  const agreementId = sub.vippsAgreementId ?? queryAgreementId;

  if (!agreementId || !isVippsConfigured()) {
    res.json({ status: sub.status, agreementStatus: null });
    return;
  }

  try {
    const agreement = await getVippsAgreement(agreementId);

    // Reconcile: Vipps is ACTIVE but our local record is not → update DB now.
    // This handles the case where the webhook was missed or rejected.
    if (agreement.status === "ACTIVE" && sub.status !== "active") {
      const subRow = await getOrCreateSubscriptionRow(userId);
      const now    = new Date();
      await updateSubscriptionStatus({
        subscriptionId:       subRow.id,
        userId,
        status:               "active",
        vippsAgreementId:     agreementId,
        currentPeriodEndsAt:  new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
      });
      req.log.info({ userId, agreementId }, "Subscription reconciled to active via status poll");
      res.json({ status: "active", agreementStatus: "ACTIVE" });
      return;
    }

    res.json({
      status:          sub.status,
      agreementStatus: agreement.status,
    });
  } catch {
    res.json({ status: sub.status, agreementStatus: null });
  }
});

// ── POST /billing/vipps/cancel ────────────────────────────────────────────────

router.post("/billing/vipps/cancel", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;
  const sub    = await getEffectiveSubscription(userId);

  if (!sub.subscriptionId) {
    res.status(400).json({ error: "Ingen aktiv abonnementsrad funnet." });
    return;
  }

  if (!["active", "past_due", "canceled"].includes(sub.status)) {
    res.status(400).json({ error: "Abonnementet kan ikke kanselleres i nåværende tilstand." });
    return;
  }

  try {
    if (sub.vippsAgreementId && isVippsConfigured()) {
      await stopVippsAgreement(sub.vippsAgreementId, crypto.randomUUID());
    }

    const now            = new Date();
    const finalAccessAt  = sub.currentPeriodEndsAt ?? now;

    await updateSubscriptionStatus({
      subscriptionId:     sub.subscriptionId,
      userId,
      status:             "canceled",
      vippsAgreementId:   sub.vippsAgreementId ?? undefined,
      currentPeriodEndsAt: finalAccessAt,
      canceledAt:         now,
      cancelAtPeriodEnd:  true,
    });

    req.log.info({ userId, finalAccessAt }, "Subscription canceled");

    res.json({
      status:         "canceled",
      finalAccessAt:  finalAccessAt.toISOString(),
      message:        `Abonnementet er kansellert. Du beholder tilgang til ${finalAccessAt.toLocaleDateString("no-NO")}.`,
    });
  } catch (err) {
    if (err instanceof VippsNotConfiguredError) {
      res.status(503).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

// ── POST /billing/vipps/webhook ───────────────────────────────────────────────
// No user auth — Vipps calls this directly.

router.post("/billing/vipps/webhook", async (req, res): Promise<void> => {
  // req.body is a Buffer here — app.ts applies express.raw() to this path
  const rawBody = req.body as Buffer;

  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
    req.log.warn({ type: typeof req.body }, "Vipps webhook: body is not a Buffer — check app.ts raw body middleware");
    res.status(400).json({ error: "Raw body required" });
    return;
  }

  // 1. Verify HMAC-SHA256 signature — reject immediately if invalid
  try {
    verifyVippsWebhookHmac(req, rawBody);
  } catch (err) {
    if (err instanceof VippsWebhookAuthError) {
      req.log.warn({ ip: req.ip }, "Rejected Vipps webhook: HMAC verification failed");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    throw err;
  }

  let event;
  try {
    event = parseVippsWebhookEvent(rawBody);
  } catch (parseErr) {
    req.log.warn({ err: parseErr }, "Rejected Vipps webhook: parse error");
    res.status(400).json({ error: "Malformed payload" });
    return;
  }

  req.log.info(
    { eventType: event.eventType, agreementId: event.agreementId, ref: event.reference },
    "Vipps webhook received",
  );

  // 2. Find subscription by Vipps agreementId
  const agreementId = event.agreementId ?? event.reference;

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.vippsAgreementId, agreementId))
    .limit(1);

  // Record event regardless of whether we found the subscription
  const providerEventId = `${event.eventType}:${agreementId}:${event.timestamp}`;

  // 3. Idempotency check — skip duplicate events
  const [existingEvent] = await db
    .select({ id: subscriptionEventsTable.id })
    .from(subscriptionEventsTable)
    .where(eq(subscriptionEventsTable.providerEventId, providerEventId))
    .limit(1);

  if (existingEvent) {
    req.log.info({ providerEventId }, "Duplicate Vipps webhook event — skipped");
    res.status(200).json({ received: true, duplicate: true });
    return;
  }

  // 4. Insert event record
  const [eventRow] = await db
    .insert(subscriptionEventsTable)
    .values({
      subscriptionId: sub?.id ?? null,
      userId:         sub?.userId ?? 0,  // 0 = unlinked; resolved below
      providerEventId,
      eventType:      event.eventType,
      processingStatus: "pending",
      payload: {
        eventType:   event.eventType,
        agreementId: event.agreementId,
        chargeId:    event.chargeId,
        reference:   event.reference,
        msn:         event.msn,
        timestamp:   event.timestamp,
      },
      receivedAt: new Date(),
    })
    .returning();

  if (!sub) {
    req.log.warn({ agreementId }, "Vipps webhook: no subscription found for agreementId");
    await db
      .update(subscriptionEventsTable)
      .set({ processingStatus: "failed", error: "subscription_not_found", processedAt: new Date() })
      .where(eq(subscriptionEventsTable.id, eventRow!.id));
    res.status(200).json({ received: true });
    return;
  }

  // 5. Apply event-specific state transitions
  const now = new Date();
  let statusChanged = false;

  try {
    // ── Charge-level events: update billing_charges table ───────────────────
    const chargeId = event.chargeId;

    if (event.eventType === "recurring.charge-captured.v1" && chargeId) {
      await db
        .update(billingChargesTable)
        .set({ status: "charged", chargedAt: now, updatedAt: now })
        .where(eq(billingChargesTable.vippsChargeId, chargeId));

      // Restore to active only if previously past_due (recovered failed payment)
      if (sub.status === "past_due") {
        await updateSubscriptionStatus({
          subscriptionId:       sub.id,
          userId:               sub.userId,
          status:               "active",
          vippsAgreementId:     agreementId,
          currentPeriodEndsAt:  new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
        });
        req.log.info({ userId: sub.userId, chargeId }, "Subscription restored to active after charge capture");
        statusChanged = true;
      }
    } else if (event.eventType === "recurring.charge-failed.v1" && chargeId) {
      await db
        .update(billingChargesTable)
        .set({ status: "failed", failedAt: now, updatedAt: now })
        .where(eq(billingChargesTable.vippsChargeId, chargeId));

      // Mark subscription past_due
      await updateSubscriptionStatus({
        subscriptionId:   sub.id,
        userId:           sub.userId,
        status:           "past_due",
        vippsAgreementId: agreementId,
      });
      req.log.info({ userId: sub.userId, chargeId }, "Subscription marked past_due after charge failure");
      statusChanged = true;

    } else if (event.eventType === "recurring.charge-canceled.v1" && chargeId) {
      await db
        .update(billingChargesTable)
        .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
        .where(eq(billingChargesTable.vippsChargeId, chargeId));

    } else {
      // ── Agreement-level events ─────────────────────────────────────────────
      const newStatus = mapWebhookEventToStatus(event.eventType);
      if (newStatus && newStatus !== "active") {
        // "active" from agreement-activated is handled normally
        await updateSubscriptionStatus({
          subscriptionId:      sub.id,
          userId:              sub.userId,
          status:              newStatus as SubscriptionStatus,
          vippsAgreementId:    agreementId,
          currentPeriodEndsAt: sub.currentPeriodEndsAt ?? undefined,
          canceledAt:          newStatus === "canceled" ? now : sub.canceledAt ?? undefined,
        });
        req.log.info({ userId: sub.userId, agreementId, newStatus }, "Subscription status updated via webhook");
        statusChanged = true;
      } else if (newStatus === "active") {
        // agreement-activated: set active and extend period
        await updateSubscriptionStatus({
          subscriptionId:       sub.id,
          userId:               sub.userId,
          status:               "active",
          vippsAgreementId:     agreementId,
          currentPeriodEndsAt:  new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
        });
        req.log.info({ userId: sub.userId, agreementId }, "Agreement activated — subscription active");
        statusChanged = true;
      }
    }

    await db
      .update(subscriptionEventsTable)
      .set({ processingStatus: "processed", processedAt: now })
      .where(eq(subscriptionEventsTable.id, eventRow!.id));

    res.status(200).json({ received: true, statusChanged });
  } catch (updateErr) {
    req.log.error({ err: updateErr, agreementId }, "Webhook processing error");
    await db
      .update(subscriptionEventsTable)
      .set({
        processingStatus: "failed",
        error:            String(updateErr),
        processedAt:      now,
      })
      .where(eq(subscriptionEventsTable.id, eventRow!.id));

    res.status(200).json({ received: true });  // Always 200 to prevent Vipps retry storm
  }
});

export default router;
