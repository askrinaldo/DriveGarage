/**
 * Vipps webhook handling.
 *
 * Authentication:
 *   Vipps sends "Authorization: Bearer <webhook-secret>" with each delivery.
 *   The secret is the value returned when registering the webhook via
 *   POST /webhooks/v1/webhooks, stored as VIPPS_WEBHOOK_SECRET.
 *
 * This module:
 *   1. Verifies the Authorization header.
 *   2. Parses and validates the event.
 *   3. Returns a structured event for the route handler to process idempotently.
 *
 * The route handler is responsible for DB writes and user-state transitions.
 */

import type { Request } from "express";
import { getVippsWebhookSecret } from "./config";
import { VippsWebhookAuthError } from "./errors";
import type { VippsWebhookEvent } from "./types";
import { logger } from "../logger";

/**
 * Verifies the webhook Authorization header matches the configured secret.
 * Throws VippsWebhookAuthError if verification fails.
 *
 * BLOCKER: If VIPPS_WEBHOOK_SECRET is not set, this rejects ALL webhook
 * requests with a 401. Set the secret after registering the webhook with Vipps.
 */
export function verifyVippsWebhookAuth(req: Request): void {
  const secret = getVippsWebhookSecret();

  if (!secret) {
    logger.error("VIPPS_WEBHOOK_SECRET not configured — rejecting webhook");
    throw new VippsWebhookAuthError();
  }

  const authHeader = req.headers["authorization"] ?? "";
  const expected   = `Bearer ${secret}`;

  if (authHeader !== expected) {
    logger.warn({ ip: req.ip }, "Vipps webhook auth failed — invalid secret");
    throw new VippsWebhookAuthError();
  }
}

/**
 * Parses and lightly validates the webhook request body.
 * Returns the typed event or throws if the payload is malformed.
 */
export function parseVippsWebhookEvent(body: unknown): VippsWebhookEvent {
  if (typeof body !== "object" || body === null) {
    throw new Error("Webhook body is not an object");
  }
  const b = body as Record<string, unknown>;

  const eventType = b.eventType as string | undefined;
  const reference = b.reference as string | undefined;
  const msn       = b.msn as string | undefined;
  const timestamp = b.timestamp as string | undefined;

  if (!eventType || !reference || !msn || !timestamp) {
    throw new Error(`Malformed webhook payload — missing required fields`);
  }

  return {
    msn,
    reference,
    eventType:   eventType as VippsWebhookEvent["eventType"],
    agreementId: b.agreementId as string | undefined,
    chargeId:    b.chargeId    as string | undefined,
    timestamp,
  };
}

/**
 * Maps a Vipps webhook event type to the corresponding subscription status update.
 * Returns null if the event does not affect subscription status.
 */
export function mapWebhookEventToStatus(
  eventType: VippsWebhookEvent["eventType"],
): "active" | "canceled" | "expired" | "past_due" | "payment_failed" | "pending_payment_setup" | null {
  switch (eventType) {
    case "recurring.agreement-activated.v1":
      return "active";
    case "recurring.agreement-stopped.v1":
      return "canceled";
    case "recurring.agreement-expired.v1":
      return "expired";
    case "recurring.agreement-rejected.v1":
      return "pending_payment_setup";
    case "recurring.charge-failed.v1":
      return "past_due";
    default:
      return null;
  }
}
