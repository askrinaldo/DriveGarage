/**
 * Vipps webhook authentication and parsing.
 *
 * ─── Authentication ───────────────────────────────────────────────────────────
 * Vipps signs webhooks using the same HMAC-SHA256 scheme as Azure Event Grid.
 * The secret is NOT something we generate — it is returned by Vipps when the
 * webhook is registered via POST /webhooks/v1/webhooks and must be stored
 * securely in VIPPS_WEBHOOK_SECRET.
 *
 * Required headers from Vipps:
 *   x-ms-date              ISO 8601 / RFC 1123 timestamp
 *   x-ms-content-sha256    base64(SHA-256(rawRequestBody))
 *   Authorization          HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=<base64>
 *
 * String to sign (UTF-8):
 *   POST\n
 *   <requestPathAndQuery>\n
 *   <x-ms-date>;<host>;<x-ms-content-sha256>
 *
 * Signature = base64(HMAC-SHA256(key=webhookSecret, data=stringToSign))
 *
 * ─── Raw body requirement ─────────────────────────────────────────────────────
 * The webhook route MUST receive the raw request body as a Buffer (before JSON
 * parsing). In app.ts, express.raw() is applied to the webhook path instead of
 * express.json(). The route handler parses JSON manually after verification.
 *
 * ─── Proxy / Host header ──────────────────────────────────────────────────────
 * Replit routes requests through a shared proxy. Use x-forwarded-host if present
 * (set by the Replit proxy) to reconstruct the public host Vipps signed against.
 * Set VIPPS_WEBHOOK_EXPECTED_HOST to override if x-forwarded-host is unreliable.
 */

import crypto from "crypto";
import type { Request } from "express";
import { getVippsWebhookSecret } from "./config";
import { VippsWebhookAuthError } from "./errors";
import type { VippsWebhookEvent } from "./types";
import { logger } from "../logger";

// ─── HMAC helpers ─────────────────────────────────────────────────────────────

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Returns the effective host Vipps used when signing the request.
 * Priority: VIPPS_WEBHOOK_EXPECTED_HOST > x-forwarded-host > req.hostname
 *
 * Replit routes requests through a reverse proxy. The internal Host header
 * does not match the public domain Vipps signed against. Set
 * VIPPS_WEBHOOK_EXPECTED_HOST to your public Replit domain if HMAC fails.
 */
function getEffectiveHost(req: Request): string {
  if (process.env.VIPPS_WEBHOOK_EXPECTED_HOST) {
    return process.env.VIPPS_WEBHOOK_EXPECTED_HOST;
  }
  const forwarded = req.headers["x-forwarded-host"];
  if (forwarded) {
    const h = Array.isArray(forwarded) ? forwarded[0]! : forwarded;
    return h.split(",")[0]!.trim();
  }
  return req.hostname;
}

// ─── Main verification ────────────────────────────────────────────────────────

/**
 * Verifies the Vipps webhook request using HMAC-SHA256.
 *
 * Vipps signs webhooks with the same scheme as Azure Event Grid:
 *   Authorization: HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=<base64>
 *
 * String to sign:
 *   POST\n<requestPathAndQuery>\n<x-ms-date>;<host>;<x-ms-content-sha256>
 *
 * @param req     - Express request with raw Buffer body (not JSON-parsed).
 * @param rawBody - Unmodified request body as a Buffer.
 * @throws VippsWebhookAuthError on any verification failure.
 */
export function verifyVippsWebhookHmac(req: Request, rawBody: Buffer): void {
  const secret = getVippsWebhookSecret();
  if (!secret) {
    logger.error("VIPPS_WEBHOOK_SECRET not configured — rejecting webhook");
    throw new VippsWebhookAuthError();
  }

  const msDate      = req.headers["x-ms-date"];
  const contentHash = req.headers["x-ms-content-sha256"];
  const authHeader  = req.headers["authorization"];

  if (!msDate || !contentHash || !authHeader) {
    logger.warn(
      { hasDate: !!msDate, hasHash: !!contentHash, hasAuth: !!authHeader },
      "Vipps webhook missing required HMAC headers",
    );
    throw new VippsWebhookAuthError();
  }

  const msDateStr      = Array.isArray(msDate)      ? msDate[0]!      : msDate;
  const contentHashStr = Array.isArray(contentHash) ? contentHash[0]! : contentHash;
  const authStr        = Array.isArray(authHeader)  ? authHeader[0]!  : authHeader;

  // 1. Verify content hash: base64(SHA-256(rawBody))
  const expectedContentHash = crypto
    .createHash("sha256")
    .update(rawBody)
    .digest("base64");

  if (!timingSafeStringEqual(contentHashStr, expectedContentHash)) {
    logger.warn("Vipps webhook content hash mismatch — body modified in transit");
    throw new VippsWebhookAuthError();
  }

  // 2. Reconstruct string to sign
  const host         = getEffectiveHost(req);
  const pathAndQuery = req.originalUrl;
  const stringToSign = `POST\n${pathAndQuery}\n${msDateStr};${host};${contentHashStr}`;

  // 3. Compute expected signature
  const expectedSig = crypto
    .createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(stringToSign, "utf8")
    .digest("base64");

  // 4. Extract actual signature from Authorization header
  //    Format: HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=<base64>
  const sigMatch = authStr.match(/Signature=([A-Za-z0-9+/=]+)\s*$/);
  if (!sigMatch?.[1]) {
    logger.warn({ prefix: authStr.slice(0, 40) }, "Vipps webhook Authorization header format invalid");
    throw new VippsWebhookAuthError();
  }

  if (!timingSafeStringEqual(sigMatch[1], expectedSig)) {
    logger.warn("Vipps webhook HMAC signature mismatch");
    throw new VippsWebhookAuthError();
  }
}

// ─── Body parsing ─────────────────────────────────────────────────────────────

/**
 * Parses and lightly validates the webhook event from a raw Buffer.
 * MUST be called after verifyVippsWebhookHmac.
 */
export function parseVippsWebhookEvent(rawBody: Buffer): VippsWebhookEvent {
  let body: unknown;
  try {
    body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new Error("Webhook body is not valid JSON");
  }

  if (typeof body !== "object" || body === null) {
    throw new Error("Webhook body is not an object");
  }
  const b = body as Record<string, unknown>;

  const eventType = b.eventType as string | undefined;
  const reference = b.reference as string | undefined;
  const msn       = b.msn as string | undefined;
  const timestamp = b.timestamp as string | undefined;

  if (!eventType || !reference || !msn || !timestamp) {
    throw new Error(`Malformed webhook payload — missing fields. Got: ${Object.keys(b).join(", ")}`);
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

// ─── Status mapping ───────────────────────────────────────────────────────────

/**
 * Maps a Vipps webhook event type to the corresponding subscription status update.
 * Returns null if the event type does not affect subscription status.
 *
 * recurring.charge-captured.v1 — restore to "active" only when the subscription
 * was in past_due state (failed payment recovered). If already active, no change.
 * The caller applies this conditionally.
 */
export function mapWebhookEventToStatus(
  eventType: VippsWebhookEvent["eventType"],
): "active" | "canceled" | "expired" | "past_due" | "payment_failed" | "pending_payment_setup" | null {
  switch (eventType) {
    case "recurring.agreement-activated.v1":  return "active";
    case "recurring.agreement-stopped.v1":    return "canceled";
    case "recurring.agreement-expired.v1":    return "expired";
    case "recurring.agreement-rejected.v1":   return "pending_payment_setup";
    case "recurring.charge-failed.v1":        return "past_due";
    case "recurring.charge-captured.v1":      return "active";  // conditional — see route handler
    default:                                  return null;
  }
}
