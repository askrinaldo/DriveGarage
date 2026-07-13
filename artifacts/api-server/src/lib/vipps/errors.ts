/**
 * Normalised Vipps error types.
 * Never include secrets or full request bodies in error messages.
 */

export class VippsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = "VippsError";
  }
}

export class VippsAuthError extends VippsError {
  constructor(detail?: string) {
    super("Vipps authentication failed", "VIPPS_AUTH_ERROR", 401, detail);
    this.name = "VippsAuthError";
  }
}

export class VippsApiError extends VippsError {
  constructor(statusCode: number, code: string, message: string) {
    super(message, code, statusCode);
    this.name = "VippsApiError";
  }
}

export class VippsWebhookAuthError extends VippsError {
  constructor() {
    super("Webhook signature verification failed", "VIPPS_WEBHOOK_AUTH_FAILED", 401);
    this.name = "VippsWebhookAuthError";
  }
}

export class VippsDuplicateAgreementError extends VippsError {
  constructor() {
    super("User already has an active Vipps agreement", "VIPPS_DUPLICATE_AGREEMENT", 409);
    this.name = "VippsDuplicateAgreementError";
  }
}

export class VippsNotConfiguredError extends VippsError {
  constructor() {
    super(
      "Vipps integration is not yet configured. Set VIPPS_* environment variables.",
      "VIPPS_NOT_CONFIGURED",
      503,
    );
    this.name = "VippsNotConfiguredError";
  }
}

/** Maps a Vipps HTTP error response to a typed VippsApiError. */
export function parseVippsErrorResponse(
  statusCode: number,
  body: unknown,
): VippsApiError {
  if (typeof body === "object" && body !== null) {
    const b = body as Record<string, unknown>;
    const code = String(b.errorCode ?? b.error ?? "VIPPS_ERROR");
    const msg = String(b.errorMessage ?? b.error_description ?? "Vipps API error");
    return new VippsApiError(statusCode, code, msg);
  }
  return new VippsApiError(statusCode, "VIPPS_ERROR", `Vipps API error (HTTP ${statusCode})`);
}
