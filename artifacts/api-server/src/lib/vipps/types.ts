/**
 * Vipps MobilePay Recurring Payments v3 — type definitions.
 *
 * Based on the official Vipps MobilePay API documentation:
 * https://developer.vippsmobilepay.com/docs/APIs/recurring-api/
 *
 * These types reflect the publicly documented v3 contract.
 * Update when the API changes.
 */

// ── OAuth ─────────────────────────────────────────────────────────────────────

export interface VippsTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  /** Unix timestamp (seconds) when the token expires. */
  expires_on: number;
}

// ── Agreements ────────────────────────────────────────────────────────────────

export type VippsAgreementStatus =
  | "PENDING"
  | "ACTIVE"
  | "STOPPED"
  | "EXPIRED";

export interface VippsCreateAgreementRequest {
  merchantAgreementUrl: string;
  merchantRedirectUrl: string;
  pricing: {
    type: "LEGACY";
    amount: number;     // øre — 10000 = 100 NOK
    currency: "NOK";
  };
  interval: {
    unit: "DAY" | "WEEK" | "MONTH" | "YEAR";
    count: number;
  };
  productName: string;
  productDescription?: string;
  /** ISO 8601 duration — omit for no initial charge (manual trial). */
  initialCharge?: {
    amount: number;
    currency: "NOK";
    description: string;
    transactionType: "DIRECT_CAPTURE" | "RESERVE_CAPTURE";
  };
  /** Idempotency key set by caller as Idempotency-Key header. */
  externalId?: string;
}

export interface VippsCreateAgreementResponse {
  agreementId: string;
  /** URL to redirect the user to for approval in Vipps. */
  vippsConfirmationUrl: string;
}

export interface VippsAgreement {
  id: string;
  status: VippsAgreementStatus;
  start?: string;   // ISO 8601
  stop?: string;    // ISO 8601
  productName: string;
  pricing: {
    amount: number;
    currency: string;
  };
  interval: {
    unit: string;
    count: number;
  };
  merchantAgreementUrl: string;
}

export interface VippsUpdateAgreementRequest {
  status?: "ACTIVE" | "STOPPED";
  productName?: string;
  productDescription?: string;
  pricing?: {
    type: "LEGACY";
    amount: number;
    currency: "NOK";
  };
}

// ── Charges ───────────────────────────────────────────────────────────────────

export type VippsChargeStatus =
  | "PENDING"
  | "RESERVED"
  | "CHARGED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "CANCELLED";

export interface VippsCreateChargeRequest {
  amount: number;       // øre
  currency: "NOK";
  description: string;
  due: string;          // ISO 8601 date — at least 2 days in the future
  transactionType: "DIRECT_CAPTURE" | "RESERVE_CAPTURE";
  externalId?: string;  // idempotency key
}

export interface VippsCharge {
  id: string;
  status: VippsChargeStatus;
  amount: number;
  currency: string;
  description: string;
  due?: string;
  createdAt?: string;
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

export type VippsWebhookEventType =
  | "recurring.agreement-activated.v1"
  | "recurring.agreement-stopped.v1"
  | "recurring.agreement-expired.v1"
  | "recurring.agreement-rejected.v1"
  | "recurring.charge-reserved.v1"
  | "recurring.charge-captured.v1"
  | "recurring.charge-failed.v1"
  | "recurring.charge-canceled.v1";

export interface VippsWebhookEvent {
  msn: string;
  reference: string;   // agreementId or chargeId
  eventType: VippsWebhookEventType;
  agreementId?: string;
  chargeId?: string;
  timestamp: string;   // ISO 8601
}
