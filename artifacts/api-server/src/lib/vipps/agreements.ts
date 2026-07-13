/**
 * Vipps Recurring Agreements API — v3
 *
 * Verified against the official spec (July 2026):
 *   POST   /recurring/v3/agreements                    — create draft agreement
 *   GET    /recurring/v3/agreements/{agreementId}       — retrieve agreement
 *   PATCH  /recurring/v3/agreements/{agreementId}       — update/stop agreement
 *
 * DraftAgreementV3 required fields: pricing, merchantRedirectUrl, productName.
 * merchantAgreementUrl is required for Norwegian merchants.
 * externalId is NOT a DraftAgreementV3 body field — use Idempotency-Key header only.
 *
 * Creating an ACTIVE agreement does NOT create monthly charges automatically.
 * DriveGarage must schedule each charge via createVippsCharge() in charges.ts.
 */

import crypto from "crypto";
import { vippsRequest } from "./client";
import { getVippsCredentials } from "./config";
import type {
  VippsCreateAgreementRequest,
  VippsCreateAgreementResponse,
  VippsAgreementResponse,
  VippsAgreementStatus,
  VippsUpdateAgreementRequest,
} from "./types";

const BASE = "/recurring/v3/agreements";

/**
 * Creates a new recurring agreement draft.
 * The user must approve it in the Vipps app via vippsConfirmationUrl.
 * Poll GET /recurring/v3/agreements/{agreementId} for status — do not rely on redirect.
 *
 * Pricing: fixed 100 NOK/month (10 000 øre), LEGACY type, monthly interval.
 * No initialCharge — first charge is scheduled after agreement becomes ACTIVE.
 */
export async function createVippsAgreement(params: {
  userId: number;
  idempotencyKey?: string;
}): Promise<VippsCreateAgreementResponse> {
  const creds = getVippsCredentials();
  const key   = params.idempotencyKey ?? crypto.randomUUID();

  const body: VippsCreateAgreementRequest = {
    pricing: {
      type:     "LEGACY",
      amount:   10_000,   // 100 NOK in øre
      currency: "NOK",
    },
    interval: {
      unit:  "MONTH",
      count: 1,
    },
    merchantAgreementUrl: creds.returnUrl,   // "My page" — required for Norwegian merchants
    merchantRedirectUrl:  creds.returnUrl,   // redirect after approval/rejection
    productName:          "DriveGarage",
    productDescription:   "Full tilgang til DriveGarage for 100 kr per måned.",
  };

  return vippsRequest<VippsCreateAgreementResponse>({
    method:         "POST",
    path:           BASE,
    body,
    idempotencyKey: key,
  });
}

/**
 * Retrieves the current state of an agreement.
 * Use for polling after redirect from Vipps app (do not rely on redirect alone).
 */
export async function getVippsAgreement(agreementId: string): Promise<VippsAgreementResponse> {
  return vippsRequest<VippsAgreementResponse>({
    method: "GET",
    path:   `${BASE}/${encodeURIComponent(agreementId)}`,
  });
}

/**
 * Lists agreements for this merchant, optionally filtered by status.
 * Use status="ACTIVE" to find the user's current active agreement.
 *
 * Vipps returns only agreements belonging to this merchant serial number.
 * Use productName to distinguish DriveGarage agreements from others.
 */
export async function listVippsAgreements(
  statusFilter?: VippsAgreementStatus,
): Promise<VippsAgreementResponse[]> {
  const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
  const data  = await vippsRequest<VippsAgreementResponse[]>({
    method: "GET",
    path:   `${BASE}${query}`,
  });
  return Array.isArray(data) ? data : [];
}

/**
 * Stops (cancels) an agreement by setting status to STOPPED.
 * Idempotent — safe to call if already STOPPED or EXPIRED.
 */
export async function stopVippsAgreement(
  agreementId: string,
  idempotencyKey?: string,
): Promise<void> {
  const body: VippsUpdateAgreementRequest = { status: "STOPPED" };
  await vippsRequest<void>({
    method:         "PATCH",
    path:           `${BASE}/${encodeURIComponent(agreementId)}`,
    body,
    idempotencyKey: idempotencyKey ?? crypto.randomUUID(),
  });
}
