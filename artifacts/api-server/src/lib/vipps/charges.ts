/**
 * Vipps Recurring Charges API — v3
 *
 * Key rules per official spec:
 * - `due` must be at least 1 day in the future (production AND test)
 * - `retryDays` is required for RECURRING charges; recommend ≥ 5 (max 14)
 * - Currency is NOT sent in the charge request body (it is set at agreement level)
 * - `type: "RECURRING"` must be set for scheduled monthly charges
 * - Creating an active agreement does NOT auto-create charges; DriveGarage must
 *   schedule each monthly charge explicitly.
 */

import crypto from "crypto";
import { vippsRequest } from "./client";
import type {
  VippsCreateChargeRequest,
  VippsCharge,
  VippsChargeReference,
} from "./types";

function chargesBase(agreementId: string): string {
  return `/recurring/v3/agreements/${encodeURIComponent(agreementId)}/charges`;
}

/**
 * Creates a scheduled recurring charge for an active agreement.
 *
 * @param params.dueDate - Must be at least 1 day in the future.
 * @param params.retryDays - Days to retry on failure. Default 5 (recommended).
 * @param params.idempotencyKey - Passed as Idempotency-Key header; also used
 *   as `orderId` to make the chargeId predictable for reconciliation.
 */
export async function createVippsCharge(params: {
  agreementId: string;
  amountNok: number;
  description: string;
  dueDate: Date;
  retryDays?: number;
  idempotencyKey?: string;
}): Promise<VippsChargeReference> {
  const key  = params.idempotencyKey ?? crypto.randomUUID();
  // orderId becomes the chargeId; must match ^[a-zA-Z\d-]+, max 64 chars
  const orderId = key.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 64);

  const body: VippsCreateChargeRequest = {
    amount:          Math.round(params.amountNok * 100),  // NOK → øre
    description:     params.description,
    transactionType: "DIRECT_CAPTURE",
    type:            "RECURRING",
    due:             params.dueDate.toISOString().split("T")[0]!, // YYYY-MM-DD
    retryDays:       params.retryDays ?? 5,
    orderId,
  };

  return vippsRequest<VippsChargeReference>({
    method:         "POST",
    path:           chargesBase(params.agreementId),
    body,
    idempotencyKey: key,
  });
}

/** Lists all charges for a given agreement. */
export async function listVippsCharges(agreementId: string): Promise<VippsCharge[]> {
  return vippsRequest<VippsCharge[]>({
    method: "GET",
    path:   chargesBase(agreementId),
  });
}

/** Retrieves a single charge by chargeId. */
export async function getVippsCharge(
  agreementId: string,
  chargeId: string,
): Promise<VippsCharge> {
  return vippsRequest<VippsCharge>({
    method: "GET",
    path:   `${chargesBase(agreementId)}/${encodeURIComponent(chargeId)}`,
  });
}

/**
 * Cancels a PENDING or DUE charge.
 * Idempotent — safe to call multiple times.
 */
export async function cancelVippsCharge(
  agreementId: string,
  chargeId: string,
  idempotencyKey?: string,
): Promise<void> {
  await vippsRequest<void>({
    method:         "DELETE",
    path:           `${chargesBase(agreementId)}/${encodeURIComponent(chargeId)}`,
    idempotencyKey: idempotencyKey ?? crypto.randomUUID(),
  });
}

/**
 * Refunds a CHARGED charge, partially or fully.
 *
 * @param amount      - Amount to refund in øre. Must be ≤ the original charge amount.
 * @param description - Required description shown to the user (max 45 chars per spec).
 *
 * Idempotent per idempotencyKey — supply the same key to safely retry.
 * Returns void (HTTP 200 with no body per spec).
 */
export async function refundVippsCharge(
  agreementId: string,
  chargeId: string,
  params: { amountOre: number; description: string; idempotencyKey?: string },
): Promise<void> {
  await vippsRequest<void>({
    method:         "POST",
    path:           `${chargesBase(agreementId)}/${encodeURIComponent(chargeId)}/refund`,
    body: {
      amount:      params.amountOre,
      description: params.description.slice(0, 45),
    },
    idempotencyKey: params.idempotencyKey ?? crypto.randomUUID(),
  });
}
