/**
 * Vipps Recurring Charges API — v3
 *
 * Charges are initiated by the merchant 2+ days before the due date.
 * Vipps Recurring handles retries and notifies via webhook.
 */

import crypto from "crypto";
import { vippsRequest } from "./client";
import type { VippsCreateChargeRequest, VippsCharge } from "./types";

function chargesBase(agreementId: string): string {
  return `/recurring/v3/agreements/${encodeURIComponent(agreementId)}/charges`;
}

/** Creates a charge for an active agreement. Due date must be at least 2 calendar days ahead. */
export async function createVippsCharge(params: {
  agreementId: string;
  amountNok: number;
  description: string;
  dueDate: Date;
  idempotencyKey?: string;
}): Promise<VippsCharge> {
  const key  = params.idempotencyKey ?? crypto.randomUUID();
  const body: VippsCreateChargeRequest = {
    amount:          Math.round(params.amountNok * 100),  // convert to øre
    currency:        "NOK",
    description:     params.description,
    due:             params.dueDate.toISOString().split("T")[0]!, // YYYY-MM-DD
    transactionType: "DIRECT_CAPTURE",
    externalId:      key,
  };

  return vippsRequest<VippsCharge>({
    method:         "POST",
    path:           chargesBase(params.agreementId),
    body,
    idempotencyKey: key,
  });
}

/** Lists charges for a given agreement. */
export async function listVippsCharges(agreementId: string): Promise<VippsCharge[]> {
  return vippsRequest<VippsCharge[]>({
    method: "GET",
    path:   chargesBase(agreementId),
  });
}

/** Retrieves a single charge. */
export async function getVippsCharge(agreementId: string, chargeId: string): Promise<VippsCharge> {
  return vippsRequest<VippsCharge>({
    method: "GET",
    path:   `${chargesBase(agreementId)}/${encodeURIComponent(chargeId)}`,
  });
}
