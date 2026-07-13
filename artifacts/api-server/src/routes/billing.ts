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
import { db, usersTable, subscriptionsTable, subscriptionEventsTable } from "@workspace/db";
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
import { verifyVippsWebhookAuth, parseVippsWebhookEvent, mapWebhookEventToStatus } from "../lib/vipps/webhooks";
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
    // Prevent duplicate active agreements
    const current = await getEffectiveSubscription(userId);
    if (current.status === "active" && current.vippsAgreementId) {
      throw new VippsDuplicateAgreementError();
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

router.get("/billing/vipps/status", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const userId = req.userAuth!.userId;
  const sub    = await getEffectiveSubscription(userId);

  if (!sub.vippsAgreementId || !isVippsConfigured()) {
    res.json({ status: sub.status, agreementStatus: null });
    return;
  }

  try {
    const agreement = await getVippsAgreement(sub.vippsAgreementId);
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
  // 1. Verify webhook auth — reject immediately if invalid
  try {
    verifyVippsWebhookAuth(req);
  } catch (err) {
    if (err instanceof VippsWebhookAuthError) {
      req.log.warn({ ip: req.ip }, "Rejected Vipps webhook: auth failed");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    throw err;
  }

  let event;
  try {
    event = parseVippsWebhookEvent(req.body);
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

  // 5. Map event to new status and apply
  const newStatus = mapWebhookEventToStatus(event.eventType);

  try {
    if (newStatus) {
      const now = new Date();
      await updateSubscriptionStatus({
        subscriptionId: sub.id,
        userId:         sub.userId,
        status:         newStatus as SubscriptionStatus,
        vippsAgreementId: agreementId,
        currentPeriodEndsAt: newStatus === "active"
          ? new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
          : sub.currentPeriodEndsAt ?? undefined,
        canceledAt: newStatus === "canceled" ? now : sub.canceledAt ?? undefined,
      });

      req.log.info({ userId: sub.userId, agreementId, newStatus }, "Subscription status updated via webhook");
    }

    await db
      .update(subscriptionEventsTable)
      .set({ processingStatus: "processed", processedAt: new Date() })
      .where(and(eq(subscriptionEventsTable.id, eventRow!.id)));

    res.status(200).json({ received: true });
  } catch (updateErr) {
    req.log.error({ err: updateErr, agreementId }, "Webhook processing error");
    await db
      .update(subscriptionEventsTable)
      .set({
        processingStatus: "failed",
        error:            String(updateErr),
        processedAt:      new Date(),
      })
      .where(eq(subscriptionEventsTable.id, eventRow!.id));

    res.status(200).json({ received: true });  // Always 200 to prevent Vipps retry storm
  }
});

export default router;
