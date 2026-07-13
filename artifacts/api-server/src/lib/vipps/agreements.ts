/**
 * Vipps Recurring Agreements API — v3
 *
 * https://developer.vippsmobilepay.com/docs/APIs/recurring-api/
 */

import crypto from "crypto";
import { vippsRequest } from "./client";
import { getVippsCredentials } from "./config";
import type {
  VippsCreateAgreementRequest,
  VippsCreateAgreementResponse,
  VippsAgreement,
  VippsUpdateAgreementRequest,
} from "./types";

const BASE = "/recurring/v3/agreements";

/** Creates a new recurring agreement. Returns agreementId + vippsConfirmationUrl. */
export async function createVippsAgreement(params: {
  userId: number;
  idempotencyKey?: string;
}): Promise<VippsCreateAgreementResponse> {
  const creds = getVippsCredentials();
  const key   = params.idempotencyKey ?? crypto.randomUUID();

  const body: VippsCreateAgreementRequest = {
    merchantAgreementUrl: creds.returnUrl,
    merchantRedirectUrl:  creds.returnUrl,
    pricing: {
      type:     "LEGACY",
      amount:   10_000,   // 100 NOK in øre
      currency: "NOK",
    },
    interval: {
      unit:  "MONTH",
      count: 1,
    },
    productName:        "DriveGarage",
    productDescription: "Full tilgang til DriveGarage for 100 kr per måned.",
    externalId:         `user-${params.userId}-${key.slice(0, 8)}`,
  };

  return vippsRequest<VippsCreateAgreementResponse>({
    method:         "POST",
    path:           BASE,
    body,
    idempotencyKey: key,
  });
}

/** Retrieves a single agreement by ID. */
export async function getVippsAgreement(agreementId: string): Promise<VippsAgreement> {
  return vippsRequest<VippsAgreement>({
    method: "GET",
    path:   `${BASE}/${encodeURIComponent(agreementId)}`,
  });
}

/** Stops (cancels) an agreement. Idempotent — safe to call if already stopped. */
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
