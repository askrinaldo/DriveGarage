/**
 * Vipps OAuth access token management.
 *
 * Token endpoint: POST /accesstoken/get (Access Token API)
 * Required headers per official Quick Start guide:
 *   client_id, client_secret, Ocp-Apim-Subscription-Key, Merchant-Serial-Number
 *
 * Token is cached in memory and refreshed 30 s before expiry.
 * NEVER log or expose the token value.
 */

import { getVippsBaseUrl, getVippsCredentials } from "./config";
import { VippsAuthError } from "./errors";
import type { VippsTokenResponse } from "./types";
import { logger } from "../logger";

interface CachedToken {
  value: string;
  /** Unix timestamp (ms) after which the token must be refreshed. */
  expiresAtMs: number;
  /** Unix timestamp (ms) when the token was last fetched from Vipps. */
  refreshedAtMs: number;
}

let tokenCache: CachedToken | null = null;

export interface VippsTokenCacheInfo {
  /** Whether a valid cached token exists. */
  hasCachedToken: boolean;
  /** ISO string of the last successful token refresh, or null if never refreshed. */
  lastRefreshedAt: string | null;
  /** ISO string of token expiry, or null if no cached token. */
  expiresAt: string | null;
}

/** Returns current in-memory token cache state without triggering a refresh. */
export function getVippsTokenCacheInfo(): VippsTokenCacheInfo {
  if (!tokenCache) {
    return { hasCachedToken: false, lastRefreshedAt: null, expiresAt: null };
  }
  return {
    hasCachedToken: true,
    lastRefreshedAt: new Date(tokenCache.refreshedAtMs).toISOString(),
    expiresAt: new Date(tokenCache.expiresAtMs).toISOString(),
  };
}

/** Refresh margin before token expiry (30 seconds). */
const REFRESH_MARGIN_MS = 30_000;

export async function getVippsAccessToken(): Promise<string> {
  const now = Date.now();

  if (tokenCache && now < tokenCache.expiresAtMs - REFRESH_MARGIN_MS) {
    return tokenCache.value;
  }

  const creds = getVippsCredentials();
  const base  = getVippsBaseUrl();

  const res = await fetch(`${base}/accesstoken/get`, {
    method: "POST",
    headers: {
      "Content-Type":               "application/json",
      "client_id":                  creds.clientId,
      "client_secret":              creds.clientSecret,
      "Ocp-Apim-Subscription-Key":  creds.subscriptionKey,
      // Merchant-Serial-Number is included per official Quick Start documentation
      "Merchant-Serial-Number":     creds.merchantSerialNumber,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error({ status: res.status }, "Vipps token fetch failed");
    throw new VippsAuthError(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as VippsTokenResponse;

  if (!data.access_token) {
    throw new VippsAuthError("No access_token in response");
  }

  tokenCache = {
    value: data.access_token,
    // expires_on is Unix seconds; fall back to expires_in seconds from now
    expiresAtMs: data.expires_on
      ? data.expires_on * 1000
      : now + (data.expires_in ?? 3600) * 1000,
    refreshedAtMs: now,
  };

  logger.info("Vipps access token refreshed");
  return tokenCache.value;
}

/** Clears the in-memory token cache (useful in tests or after credential rotation). */
export function clearVippsTokenCache(): void {
  tokenCache = null;
}
