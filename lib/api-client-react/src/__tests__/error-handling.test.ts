/**
 * Error handling tests — verifies that Norwegian error strings returned by the
 * backend are correctly surfaced through ApiError and customFetch so that
 * frontend toast messages show the right text instead of a generic fallback.
 *
 * Covers the three most common user-visible failures:
 *   - 404 Not Found       → "Ikke funnet"
 *   - 401 Unauthorized    → "Ikke autorisert"
 *   - 400 Bad Request     → "Ugyldig forespørsel" / "Valideringsfeil"
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { ApiError, customFetch } from "../custom-fetch.js";

// Mirror the backend ERRORS constants so tests stay in sync with errors.ts
const ERRORS = {
  NOT_FOUND: "Ikke funnet",
  UNAUTHORIZED: "Ikke autorisert",
  FORBIDDEN: "Ingen tilgang",
  BAD_REQUEST: "Ugyldig forespørsel",
  VALIDATION_ERROR: "Valideringsfeil",
  CONFLICT: "Ressursen finnes allerede",
  INTERNAL: "En intern feil oppstod. Prøv igjen.",
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJsonResponse(status: number, body: unknown): Response {
  const json = JSON.stringify(body);
  return new Response(json, {
    status,
    headers: { "content-type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// ApiError — construction and data access
// ---------------------------------------------------------------------------

describe("ApiError", () => {
  it("stores the parsed JSON body on .data so pages can read err.data.error", () => {
    const body = { error: ERRORS.NOT_FOUND };
    const response = makeJsonResponse(404, body);
    const err = new ApiError(response, body, { method: "GET", url: "/api/vehicles/999" });

    expect(err.status).toBe(404);
    expect((err.data as { error: string }).error).toBe(ERRORS.NOT_FOUND);
  });

  it("includes the Norwegian message in err.message for 401 responses", () => {
    const body = { error: ERRORS.UNAUTHORIZED };
    const response = makeJsonResponse(401, body);
    const err = new ApiError(response, body, { method: "GET", url: "/api/vehicles" });

    expect(err.status).toBe(401);
    expect(err.message).toContain(ERRORS.UNAUTHORIZED);
  });

  it("includes the Norwegian message in err.message for 400 bad request", () => {
    const body = { error: ERRORS.BAD_REQUEST };
    const response = makeJsonResponse(400, body);
    const err = new ApiError(response, body, { method: "POST", url: "/api/vehicles" });

    expect(err.status).toBe(400);
    expect(err.message).toContain(ERRORS.BAD_REQUEST);
  });

  it("includes the Norwegian message in err.message for 400 validation error", () => {
    const body = { error: ERRORS.VALIDATION_ERROR };
    const response = makeJsonResponse(400, body);
    const err = new ApiError(response, body, { method: "POST", url: "/api/vehicles" });

    expect(err.message).toContain(ERRORS.VALIDATION_ERROR);
  });

  it("includes the Norwegian message in err.message for 403 forbidden", () => {
    const body = { error: ERRORS.FORBIDDEN };
    const response = makeJsonResponse(403, body);
    const err = new ApiError(response, body, { method: "GET", url: "/api/vehicles" });

    expect(err.status).toBe(403);
    expect(err.message).toContain(ERRORS.FORBIDDEN);
  });

  it("includes the Norwegian message in err.message for 409 conflict", () => {
    const body = { error: ERRORS.CONFLICT };
    const response = makeJsonResponse(409, body);
    const err = new ApiError(response, body, { method: "POST", url: "/api/vehicles" });

    expect(err.status).toBe(409);
    expect(err.message).toContain(ERRORS.CONFLICT);
  });

  it("includes the Norwegian message in err.message for 500 internal error", () => {
    const body = { error: ERRORS.INTERNAL };
    const response = makeJsonResponse(500, body);
    const err = new ApiError(response, body, {
      method: "GET",
      url: "/api/vehicles",
    });

    expect(err.status).toBe(500);
    expect(err.message).toContain(ERRORS.INTERNAL);
  });

  it("falls back to HTTP status text when body is empty", () => {
    const response = new Response(null, { status: 404, statusText: "Not Found" });
    const err = new ApiError(response, null, { method: "GET", url: "/api/vehicles/999" });

    expect(err.message).toBe("HTTP 404 Not Found");
    expect(err.data).toBeNull();
  });

  it("preserves the full body object on .data for rich error access", () => {
    const body = { error: ERRORS.VALIDATION_ERROR, details: ["title is required"] };
    const response = makeJsonResponse(400, body);
    const err = new ApiError(response, body, { method: "POST", url: "/api/vehicles" });

    expect(err.data).toEqual(body);
  });
});

// ---------------------------------------------------------------------------
// customFetch — throws ApiError with Norwegian message from response body
// ---------------------------------------------------------------------------

describe("customFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws ApiError with Norwegian 404 message when vehicle is not found", async () => {
    const body = { error: ERRORS.NOT_FOUND };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeJsonResponse(404, body)),
    );

    await expect(customFetch("/api/vehicles/999")).rejects.toSatisfy(
      (err: unknown) => {
        if (!(err instanceof ApiError)) return false;
        return (
          err.status === 404 &&
          err.message.includes(ERRORS.NOT_FOUND) &&
          (err.data as { error: string }).error === ERRORS.NOT_FOUND
        );
      },
    );
  });

  it("throws ApiError with Norwegian 401 message when user is not authenticated", async () => {
    const body = { error: ERRORS.UNAUTHORIZED };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeJsonResponse(401, body)),
    );

    await expect(customFetch("/api/vehicles")).rejects.toSatisfy(
      (err: unknown) => {
        if (!(err instanceof ApiError)) return false;
        return (
          err.status === 401 &&
          err.message.includes(ERRORS.UNAUTHORIZED) &&
          (err.data as { error: string }).error === ERRORS.UNAUTHORIZED
        );
      },
    );
  });

  it("throws ApiError with Norwegian 400 message on bad input", async () => {
    const body = { error: ERRORS.BAD_REQUEST };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeJsonResponse(400, body)),
    );

    await expect(customFetch("/api/vehicles", { method: "POST", body: "{}" })).rejects.toSatisfy(
      (err: unknown) => {
        if (!(err instanceof ApiError)) return false;
        return (
          err.status === 400 &&
          err.message.includes(ERRORS.BAD_REQUEST) &&
          (err.data as { error: string }).error === ERRORS.BAD_REQUEST
        );
      },
    );
  });

  it("throws ApiError with Norwegian validation error message on 400 validation failure", async () => {
    const body = { error: ERRORS.VALIDATION_ERROR };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeJsonResponse(400, body)),
    );

    await expect(customFetch("/api/vehicles", { method: "POST", body: "{}" })).rejects.toSatisfy(
      (err: unknown) => {
        if (!(err instanceof ApiError)) return false;
        return (
          err.status === 400 &&
          err.message.includes(ERRORS.VALIDATION_ERROR)
        );
      },
    );
  });

  it("resolves successfully when the response is 200 OK", async () => {
    const payload = { id: "1", make: "BMW", model: "R90S", year: 1974 };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeJsonResponse(200, payload)),
    );

    const result = await customFetch<typeof payload>("/api/vehicles/1");
    expect(result).toEqual(payload);
  });
});
