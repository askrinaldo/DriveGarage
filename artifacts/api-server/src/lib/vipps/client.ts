/**
 * Base Vipps HTTP client.
 *
 * Handles:
 *   - Auth header injection (Bearer token)
 *   - Ocp-Apim-Subscription-Key header
 *   - Request timeout (15 s default)
 *   - Structured error normalisation
 *   - No retry on mutating operations; single retry on GET
 *
 * NEVER pass secrets in URL params or log response bodies.
 */

import { getVippsBaseUrl, getVippsCredentials } from "./config";
import { getVippsAccessToken } from "./auth";
import { parseVippsErrorResponse, VippsApiError } from "./errors";
import { logger } from "../logger";

const DEFAULT_TIMEOUT_MS = 15_000;

interface VippsRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  /** Idempotency key for POST requests. */
  idempotencyKey?: string;
  timeoutMs?: number;
}

async function doRequest<T>(opts: VippsRequestOptions, attempt: number): Promise<T> {
  const token        = await getVippsAccessToken();
  const creds        = getVippsCredentials();
  const base         = getVippsBaseUrl();
  const method       = opts.method ?? "GET";
  const url          = `${base}${opts.path}`;
  const timeoutMs    = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const headers: Record<string, string> = {
    "Authorization":               `Bearer ${token}`,
    "Ocp-Apim-Subscription-Key":   creds.subscriptionKey,
    "Merchant-Serial-Number":      creds.merchantSerialNumber,
    "Vipps-System-Name":           "drivegarage",
    "Vipps-System-Version":        "1.0",
    "Accept":                      "application/json",
  };

  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (opts.idempotencyKey) {
    headers["Idempotency-Key"] = opts.idempotencyKey;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    let errorBody: unknown;
    try { errorBody = await res.json(); } catch { errorBody = null; }
    const err = parseVippsErrorResponse(res.status, errorBody);
    logger.error(
      { status: res.status, code: err.code, path: opts.path, attempt },
      "Vipps API error",
    );
    throw err;
  }

  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

/**
 * Sends a Vipps API request.
 * GET requests are retried once on network error.
 * POST/PATCH are not retried to preserve idempotency guarantees.
 */
export async function vippsRequest<T>(opts: VippsRequestOptions): Promise<T> {
  try {
    return await doRequest<T>(opts, 1);
  } catch (err) {
    const isGet      = (opts.method ?? "GET") === "GET";
    const isNetError = !(err instanceof VippsApiError);

    if (isGet && isNetError) {
      logger.warn({ path: opts.path }, "Vipps GET retry after network error");
      return doRequest<T>(opts, 2);
    }

    throw err;
  }
}
