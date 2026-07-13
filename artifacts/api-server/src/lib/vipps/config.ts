/**
 * Vipps environment configuration.
 *
 * All values are read from process.env at call time.
 * Never log or expose these values outside this module.
 */

import { VippsNotConfiguredError } from "./errors";

export type VippsEnvironment = "test" | "production";

const BASE_URLS: Record<VippsEnvironment, string> = {
  test:       "https://apitest.vipps.no",
  production: "https://api.vipps.no",
};

export function getVippsEnv(): VippsEnvironment {
  const env = process.env.VIPPS_ENVIRONMENT;
  if (env === "production") return "production";
  return "test";
}

export function getVippsBaseUrl(): string {
  return BASE_URLS[getVippsEnv()];
}

export interface VippsCredentials {
  clientId: string;
  clientSecret: string;
  subscriptionKey: string;
  merchantSerialNumber: string;
  callbackUrl: string;
  returnUrl: string;
}

/**
 * Returns Vipps credentials from environment variables.
 * Throws VippsNotConfiguredError if any required variable is missing.
 * NEVER expose the returned object to frontend or logs.
 */
export function getVippsCredentials(): VippsCredentials {
  const clientId              = process.env.VIPPS_CLIENT_ID;
  const clientSecret          = process.env.VIPPS_CLIENT_SECRET;
  const subscriptionKey       = process.env.VIPPS_SUBSCRIPTION_KEY;
  const merchantSerialNumber  = process.env.VIPPS_MERCHANT_SERIAL_NUMBER;
  const callbackUrl           = process.env.VIPPS_CALLBACK_URL;
  const returnUrl             = process.env.VIPPS_RETURN_URL;

  if (!clientId || !clientSecret || !subscriptionKey || !merchantSerialNumber || !callbackUrl || !returnUrl) {
    throw new VippsNotConfiguredError();
  }

  return { clientId, clientSecret, subscriptionKey, merchantSerialNumber, callbackUrl, returnUrl };
}

/** Returns true if all required Vipps vars are present. */
export function isVippsConfigured(): boolean {
  try {
    getVippsCredentials();
    return true;
  } catch {
    return false;
  }
}

/** Returns the webhook secret used to verify incoming webhook requests. */
export function getVippsWebhookSecret(): string | null {
  return process.env.VIPPS_WEBHOOK_SECRET ?? null;
}

/**
 * Returns whether billing enforcement is enabled.
 * When false: subscriptions are shown in UI but access is not locked.
 * Set BILLING_ENFORCEMENT_ENABLED=true only after Vipps e2e testing passes.
 */
export function isBillingEnforcementEnabled(): boolean {
  return process.env.BILLING_ENFORCEMENT_ENABLED === "true";
}
