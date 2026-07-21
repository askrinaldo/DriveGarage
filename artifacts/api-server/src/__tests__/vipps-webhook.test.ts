/**
 * Vipps HMAC-SHA256 webhook verification — unit tests.
 *
 * Tests the verifyVippsWebhookHmac() function without any network or DB calls.
 * All signing is done locally with a test secret.
 *
 * Reference: Vipps Webhooks API HMAC authentication (Azure Event Grid scheme)
 *   Authorization: HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=<base64>
 *   String to sign: POST\n<path>\n<date>;<host>;<contentHash>
 */

import crypto from "crypto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyVippsWebhookHmac, parseVippsWebhookEvent, mapWebhookEventToStatus } from "../lib/vipps/webhooks";
import { VippsWebhookAuthError } from "../lib/vipps/errors";
import { currentBillingPeriod } from "../lib/billing/monthlyCharges";

// Prevent real pg.Pool creation when monthlyCharges is dynamically imported below.
vi.mock("@workspace/db", () => {
  const sym = (name: string) => ({ _name: name });
  return {
    db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
    subscriptionsTable:   sym("subscriptions"),
    billingChargesTable:  sym("billingCharges"),
    usersTable:           sym("users"),
    eq: vi.fn(() => true),
    and: vi.fn(() => true),
    sql: Object.assign(vi.fn(), { raw: vi.fn() }),
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TEST_SECRET = "test-webhook-secret-32-bytes-ok!";
const TEST_HOST   = "example.replit.app";
const TEST_PATH   = "/api/billing/vipps/webhook";

function signRequest(body: Buffer, secret: string, path: string, host: string): {
  msDate: string;
  contentHash: string;
  authorization: string;
} {
  const msDate      = new Date().toUTCString();
  const contentHash = crypto.createHash("sha256").update(body).digest("base64");
  const stringToSign = `POST\n${path}\n${msDate};${host};${contentHash}`;
  const signature    = crypto
    .createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(stringToSign, "utf8")
    .digest("base64");

  return {
    msDate,
    contentHash,
    authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
  };
}

/** Creates a minimal mock Express request with the required HMAC headers. */
function makeRequest(
  headers: Record<string, string>,
  originalUrl = TEST_PATH,
  hostname = TEST_HOST,
) {
  return {
    headers,
    originalUrl,
    hostname,
  } as unknown as import("express").Request;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("verifyVippsWebhookHmac", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      VIPPS_WEBHOOK_SECRET: TEST_SECRET,
      VIPPS_WEBHOOK_EXPECTED_HOST: TEST_HOST,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("accepts a valid HMAC-signed request", () => {
    const body     = Buffer.from(JSON.stringify({ eventType: "recurring.agreement-activated.v1" }));
    const { msDate, contentHash, authorization } = signRequest(body, TEST_SECRET, TEST_PATH, TEST_HOST);

    const req = makeRequest({
      "x-ms-date":              msDate,
      "x-ms-content-sha256":    contentHash,
      "authorization":          authorization,
    });

    expect(() => verifyVippsWebhookHmac(req, body)).not.toThrow();
  });

  it("rejects a request with a wrong signature", () => {
    const body    = Buffer.from(JSON.stringify({ eventType: "recurring.agreement-activated.v1" }));
    const { msDate, contentHash } = signRequest(body, TEST_SECRET, TEST_PATH, TEST_HOST);

    const req = makeRequest({
      "x-ms-date":           msDate,
      "x-ms-content-sha256": contentHash,
      "authorization":       "HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=invalidsignature==",
    });

    expect(() => verifyVippsWebhookHmac(req, body)).toThrow(VippsWebhookAuthError);
  });

  it("rejects a request with a modified body (content hash mismatch)", () => {
    const body        = Buffer.from(JSON.stringify({ eventType: "recurring.agreement-activated.v1" }));
    const modifiedBody = Buffer.from(JSON.stringify({ eventType: "recurring.agreement-stopped.v1" }));
    const { msDate, contentHash, authorization } = signRequest(body, TEST_SECRET, TEST_PATH, TEST_HOST);

    const req = makeRequest({
      "x-ms-date":           msDate,
      "x-ms-content-sha256": contentHash,
      "authorization":       authorization,
    });

    // Pass modified body — content hash of modified body won't match the header
    expect(() => verifyVippsWebhookHmac(req, modifiedBody)).toThrow(VippsWebhookAuthError);
  });

  it("rejects when x-ms-date header is missing", () => {
    const body = Buffer.from("{}");
    const { contentHash, authorization } = signRequest(body, TEST_SECRET, TEST_PATH, TEST_HOST);

    const req = makeRequest({
      "x-ms-content-sha256": contentHash,
      "authorization":       authorization,
      // x-ms-date intentionally omitted
    });

    expect(() => verifyVippsWebhookHmac(req, body)).toThrow(VippsWebhookAuthError);
  });

  it("rejects when x-ms-content-sha256 header is missing", () => {
    const body = Buffer.from("{}");
    const { msDate, authorization } = signRequest(body, TEST_SECRET, TEST_PATH, TEST_HOST);

    const req = makeRequest({
      "x-ms-date":     msDate,
      "authorization": authorization,
      // x-ms-content-sha256 intentionally omitted
    });

    expect(() => verifyVippsWebhookHmac(req, body)).toThrow(VippsWebhookAuthError);
  });

  it("rejects when authorization header is missing", () => {
    const body = Buffer.from("{}");
    const { msDate, contentHash } = signRequest(body, TEST_SECRET, TEST_PATH, TEST_HOST);

    const req = makeRequest({
      "x-ms-date":           msDate,
      "x-ms-content-sha256": contentHash,
      // authorization intentionally omitted
    });

    expect(() => verifyVippsWebhookHmac(req, body)).toThrow(VippsWebhookAuthError);
  });

  it("rejects when VIPPS_WEBHOOK_SECRET is not configured", () => {
    delete process.env.VIPPS_WEBHOOK_SECRET;
    const body = Buffer.from("{}");
    const req  = makeRequest({
      "x-ms-date":           "Mon, 13 Jul 2026 12:00:00 GMT",
      "x-ms-content-sha256": "fakehash==",
      "authorization":       "HMAC-SHA256 Signature=fake",
    });

    expect(() => verifyVippsWebhookHmac(req, body)).toThrow(VippsWebhookAuthError);
  });

  it("rejects when signed with a different secret", () => {
    const body = Buffer.from(JSON.stringify({ eventType: "recurring.charge-captured.v1" }));
    const { msDate, contentHash, authorization } = signRequest(body, "wrong-secret-entirely", TEST_PATH, TEST_HOST);

    const req = makeRequest({
      "x-ms-date":           msDate,
      "x-ms-content-sha256": contentHash,
      "authorization":       authorization,
    });

    expect(() => verifyVippsWebhookHmac(req, body)).toThrow(VippsWebhookAuthError);
  });

  it("rejects when Authorization header has wrong format (Bearer token instead of HMAC)", () => {
    const body = Buffer.from("{}");
    const { msDate, contentHash } = signRequest(body, TEST_SECRET, TEST_PATH, TEST_HOST);

    const req = makeRequest({
      "x-ms-date":           msDate,
      "x-ms-content-sha256": contentHash,
      "authorization":       `Bearer ${TEST_SECRET}`,  // wrong format — old incorrect approach
    });

    expect(() => verifyVippsWebhookHmac(req, body)).toThrow(VippsWebhookAuthError);
  });

  it("rejects a request with a stale x-ms-date (older than 5 minutes)", () => {
    const body = Buffer.from(JSON.stringify({ eventType: "recurring.agreement-activated.v1" }));
    // Use a date 6 minutes in the past
    const staleDate = new Date(Date.now() - 6 * 60 * 1000).toUTCString();
    const contentHash = crypto.createHash("sha256").update(body).digest("base64");
    const stringToSign = `POST\n${TEST_PATH}\n${staleDate};${TEST_HOST};${contentHash}`;
    const signature = crypto
      .createHmac("sha256", Buffer.from(TEST_SECRET, "utf8"))
      .update(stringToSign, "utf8")
      .digest("base64");

    const req = makeRequest({
      "x-ms-date":           staleDate,
      "x-ms-content-sha256": contentHash,
      "authorization":       `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
    });

    // Signature is cryptographically valid but timestamp is stale → replay rejected
    expect(() => verifyVippsWebhookHmac(req, body)).toThrow(VippsWebhookAuthError);
  });

  it("rejects a request with an unparseable x-ms-date", () => {
    const body = Buffer.from("{}");
    const { contentHash, authorization } = signRequest(body, TEST_SECRET, TEST_PATH, TEST_HOST);

    const req = makeRequest({
      "x-ms-date":           "not-a-date",
      "x-ms-content-sha256": contentHash,
      "authorization":       authorization,
    });

    expect(() => verifyVippsWebhookHmac(req, body)).toThrow(VippsWebhookAuthError);
  });

  it("rejects a request more than 1 minute in the future", () => {
    const body = Buffer.from("{}");
    const futureDate = new Date(Date.now() + 2 * 60 * 1000).toUTCString();
    const contentHash = crypto.createHash("sha256").update(body).digest("base64");
    const stringToSign = `POST\n${TEST_PATH}\n${futureDate};${TEST_HOST};${contentHash}`;
    const signature = crypto
      .createHmac("sha256", Buffer.from(TEST_SECRET, "utf8"))
      .update(stringToSign, "utf8")
      .digest("base64");

    const req = makeRequest({
      "x-ms-date":           futureDate,
      "x-ms-content-sha256": contentHash,
      "authorization":       `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
    });

    expect(() => verifyVippsWebhookHmac(req, body)).toThrow(VippsWebhookAuthError);
  });
});

// ─── parseVippsWebhookEvent tests ─────────────────────────────────────────────

describe("parseVippsWebhookEvent", () => {
  it("parses a valid agreement-activated event", () => {
    const payload = {
      msn:         "123456",
      reference:   "agr-abc123",
      eventType:   "recurring.agreement-activated.v1",
      agreementId: "agr-abc123",
      timestamp:   "2026-07-13T12:00:00Z",
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const event   = parseVippsWebhookEvent(rawBody);

    expect(event.eventType).toBe("recurring.agreement-activated.v1");
    expect(event.agreementId).toBe("agr-abc123");
    expect(event.msn).toBe("123456");
  });

  it("parses a valid charge-captured event with chargeId", () => {
    const payload = {
      msn:         "123456",
      reference:   "chr-xyz789",
      eventType:   "recurring.charge-captured.v1",
      agreementId: "agr-abc123",
      chargeId:    "chr-xyz789",
      timestamp:   "2026-07-13T12:00:00Z",
    };
    const event = parseVippsWebhookEvent(Buffer.from(JSON.stringify(payload)));
    expect(event.chargeId).toBe("chr-xyz789");
  });

  it("throws on invalid JSON body", () => {
    expect(() => parseVippsWebhookEvent(Buffer.from("not json"))).toThrow("not valid JSON");
  });

  it("throws when required fields are missing", () => {
    const partial = { msn: "123456" }; // missing eventType, reference, timestamp
    expect(() => parseVippsWebhookEvent(Buffer.from(JSON.stringify(partial)))).toThrow("missing fields");
  });
});

// ─── mapWebhookEventToStatus tests ────────────────────────────────────────────

describe("mapWebhookEventToStatus", () => {
  it("maps agreement-activated to active", () => {
    expect(mapWebhookEventToStatus("recurring.agreement-activated.v1")).toBe("active");
  });

  it("maps agreement-stopped to canceled", () => {
    expect(mapWebhookEventToStatus("recurring.agreement-stopped.v1")).toBe("canceled");
  });

  it("maps agreement-expired to expired", () => {
    expect(mapWebhookEventToStatus("recurring.agreement-expired.v1")).toBe("expired");
  });

  it("maps agreement-rejected to pending_payment_setup", () => {
    expect(mapWebhookEventToStatus("recurring.agreement-rejected.v1")).toBe("pending_payment_setup");
  });

  it("maps charge-failed to past_due", () => {
    expect(mapWebhookEventToStatus("recurring.charge-failed.v1")).toBe("past_due");
  });

  it("maps charge-captured to active (caller applies conditionally)", () => {
    expect(mapWebhookEventToStatus("recurring.charge-captured.v1")).toBe("active");
  });

  it("returns null for charge-canceled (no subscription status change)", () => {
    expect(mapWebhookEventToStatus("recurring.charge-canceled.v1")).toBeNull();
  });
});

// ─── Monthly charge idempotency logic tests ───────────────────────────────────

describe("currentBillingPeriod", () => {
  it("returns YYYY-MM format matching current date", () => {
    const period = currentBillingPeriod();
    expect(period).toMatch(/^\d{4}-\d{2}$/);

    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(period).toBe(expected);
  });
});
