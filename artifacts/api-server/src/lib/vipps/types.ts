/**
 * Vipps MobilePay Recurring Payments v3 — type definitions.
 *
 * Verified against the official OpenAPI spec at:
 * https://developer.vippsmobilepay.com/redocusaurus/recurring-swagger-id.yaml
 * (downloaded July 2026)
 *
 * Update when the spec changes.
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

/** DraftAgreementV3.AgreementStatus — all values from spec. */
export type VippsAgreementStatus =
  | "PENDING"
  | "ACTIVE"
  | "STOPPED"
  | "EXPIRED";

/**
 * PricingRequestV3 — discriminated by `type`.
 * For DriveGarage's fixed 100 NOK/month plan use LegacyPricingRequestV3.
 */
export interface VippsLegacyPricing {
  type: "LEGACY";
  amount: number;    // øre — 10000 = 100 NOK
  currency: "NOK";
}

/**
 * DraftAgreementV3 request body.
 * Required: pricing, merchantRedirectUrl, productName.
 * merchantAgreementUrl is required for Norwegian merchants.
 */
export interface VippsCreateAgreementRequest {
  pricing: VippsLegacyPricing;
  merchantRedirectUrl: string;
  merchantAgreementUrl: string;
  productName: string;
  productDescription?: string;
  /** TimePeriod — optional but always set for monthly subscriptions. */
  interval?: {
    unit: "YEAR" | "MONTH" | "WEEK" | "DAY";
    count: number;
  };
  /** Pre-fill user's phone number in the landing page form (MSISDN format). */
  phoneNumber?: string;
  /**
   * Initial charge at agreement approval.
   * Omit for no upfront charge (user agrees now, first charge is scheduled separately).
   */
  initialCharge?: {
    amount: number;
    currency: "NOK";
    description: string;
    transactionType: "DIRECT_CAPTURE" | "RESERVE_CAPTURE";
  };
}

export interface VippsCreateAgreementResponse {
  agreementId: string;
  /** URL to redirect the user to for approval in Vipps. */
  vippsConfirmationUrl: string;
}

export interface VippsAgreementResponse {
  id: string;
  status: VippsAgreementStatus;
  start?: string;     // ISO 8601
  stop?: string;      // ISO 8601
  productName: string;
  productDescription?: string;
  pricing: {
    amount: number;
    currency: string;
    type: string;
  };
  interval?: {
    unit: string;
    count: number;
  };
  merchantAgreementUrl: string;
}

export interface VippsUpdateAgreementRequest {
  status?: "ACTIVE" | "STOPPED";
  productName?: string;
  productDescription?: string;
  pricing?: VippsLegacyPricing;
}

// ── Charges ───────────────────────────────────────────────────────────────────

/**
 * ChargeStatus — all values from the official spec ChargeStatus enum.
 * Note: British spelling "CANCELLED" matches the spec exactly.
 */
export type VippsChargeStatus =
  | "PENDING"
  | "DUE"
  | "RESERVED"
  | "CHARGED"
  | "PARTIALLY_CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED"
  | "PROCESSING";

/**
 * ChargeCreationTypeV3 — whether this is a scheduled recurring charge
 * or an ad-hoc unscheduled charge.
 */
export type VippsChargeCreationType = "RECURRING" | "UNSCHEDULED";

/**
 * CreateChargeV3 request body.
 *
 * Required: amount, description, transactionType.
 * For RECURRING charges: due and retryDays are also required.
 *
 * NOTE: currency is NOT a field in this request — it is set at agreement level.
 */
export interface VippsCreateChargeRequest {
  /** Amount in minor units (øre). */
  amount: number;
  description: string;
  transactionType: "DIRECT_CAPTURE" | "RESERVE_CAPTURE";
  /**
   * RECURRING (scheduled on due date) or UNSCHEDULED (immediate ad-hoc).
   * Default is RECURRING.
   */
  type?: VippsChargeCreationType;
  /**
   * ISO 8601 date (YYYY-MM-DD). Required for RECURRING charges.
   * Must be at least 1 day in the future.
   */
  due?: string;
  /**
   * Days Vipps retries on failure. Required for RECURRING.
   * Recommend at least 5 (max 14).
   */
  retryDays?: number;
  /**
   * Optional. If provided, this becomes the chargeId (used in all downstream
   * references including settlement reports). Must match ^[a-zA-Z\d-]+.
   */
  orderId?: string;
  /**
   * Optional external ID — appears in settlement reports separately from chargeId
   * without overriding it.
   */
  externalId?: string;
}

/** ChargeReference — response from POST /charges. */
export interface VippsChargeReference {
  chargeId: string;
}

export interface VippsCharge {
  id: string;
  status: VippsChargeStatus;
  amount: number;
  currency: string;
  description: string;
  due?: string;
  type?: VippsChargeCreationType;
  transactionType?: string;
  createdAt?: string;
  retryDays?: number;
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

/**
 * Webhook event types for the Vipps Recurring API.
 * Registered via POST /webhooks/v1/webhooks with the "recurring.*" events.
 */
export type VippsWebhookEventType =
  | "recurring.agreement-activated.v1"
  | "recurring.agreement-stopped.v1"
  | "recurring.agreement-expired.v1"
  | "recurring.agreement-rejected.v1"
  | "recurring.charge-reserved.v1"
  | "recurring.charge-captured.v1"
  | "recurring.charge-failed.v1"
  | "recurring.charge-canceled.v1";

/**
 * Vipps webhook event payload.
 * Delivered to your registered callback URL.
 * Authorization is Bearer <secret> (from RegisterResponse.secret).
 */
export interface VippsWebhookEvent {
  msn: string;
  reference: string;   // agreementId or chargeId depending on event type
  eventType: VippsWebhookEventType;
  agreementId?: string;
  chargeId?: string;
  timestamp: string;   // ISO 8601
}
