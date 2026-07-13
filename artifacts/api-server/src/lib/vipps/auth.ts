/**
 * Vipps OAuth token management.
 * Caches token in memory and refreshes automatically before expiry.
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
}

let tokenCache: CachedToken | null = null;

/** Margin before token expiry to trigger early refresh (30 seconds). */
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
      "Content-Type":            "application/json",
      "client_id":               creds.clientId,
      "client_secret":           creds.clientSecret,
      "Ocp-Apim-Subscription-Key": creds.subscriptionKey,
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
    value:       data.access_token,
    // expires_in is seconds; use expires_on (Unix seconds) when available
    expiresAtMs: data.expires_on
      ? data.expires_on * 1000
      : now + (data.expires_in ?? 3600) * 1000,
  };

  logger.info("Vipps access token refreshed");
  return tokenCache.value;
}

/** Clears the in-memory token cache (useful for tests). */
export function clearVippsTokenCache(): void {
  tokenCache = null;
}
