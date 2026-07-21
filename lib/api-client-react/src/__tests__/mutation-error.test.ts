/**
 * extractMutationError — form toast error extraction tests
 *
 * Verifies that the four form mutation failure paths (add-vehicle, edit-vehicle,
 * add-service, edit-service) correctly prefer the backend's Norwegian error
 * string (err.data.error) over the hardcoded fallback when ApiError carries a
 * structured body.
 *
 * When the backend returns { error: "..." } the user should see that specific
 * message, not the generic hardcoded fallback.  When no structured error is
 * available, the fallback is used so the user always sees Norwegian text.
 */

import { describe, it, expect } from "vitest";
import { ApiError, extractMutationError } from "../custom-fetch.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeApiError(status: number, body: unknown, url: string, method = "POST"): ApiError {
  const json = JSON.stringify(body);
  const response = new Response(json, {
    status,
    headers: { "content-type": "application/json" },
  });
  return new ApiError(response, body, { method, url });
}

// Norwegian fallbacks used by the forms
const FALLBACKS = {
  addVehicle: "Kunne ikke legge til kjøretøy",
  updateVehicle: "Kunne ikke oppdatere kjøretøy",
  addService: "Kunne ikke legge til servicepost",
  updateService: "Kunne ikke oppdatere",
} as const;

// Backend ERRORS constants (mirrors artifacts/api-server/src/lib/errors.ts)
const ERRORS = {
  VALIDATION_ERROR: "Valideringsfeil",
  BAD_REQUEST: "Ugyldig forespørsel",
  NOT_FOUND: "Ikke funnet",
  CONFLICT: "Ressursen finnes allerede",
  INTERNAL: "En intern feil oppstod. Prøv igjen.",
  FORBIDDEN: "Ingen tilgang",
  UNAUTHORIZED: "Ikke autorisert",
} as const;

// ---------------------------------------------------------------------------
// Add vehicle — POST /api/vehicles
// ---------------------------------------------------------------------------

describe("extractMutationError — add-vehicle failure paths", () => {
  it("prefers err.data.error over fallback when backend sends a validation error", () => {
    const err = makeApiError(400, { error: ERRORS.VALIDATION_ERROR }, "/api/vehicles");
    expect(extractMutationError(err, FALLBACKS.addVehicle)).toBe(ERRORS.VALIDATION_ERROR);
  });

  it("prefers err.data.error over fallback when backend sends a bad-request error", () => {
    const err = makeApiError(400, { error: ERRORS.BAD_REQUEST }, "/api/vehicles");
    expect(extractMutationError(err, FALLBACKS.addVehicle)).toBe(ERRORS.BAD_REQUEST);
  });

  it("prefers err.data.error over fallback when backend sends an internal error", () => {
    const err = makeApiError(500, { error: ERRORS.INTERNAL }, "/api/vehicles");
    expect(extractMutationError(err, FALLBACKS.addVehicle)).toBe(ERRORS.INTERNAL);
  });

  it("falls back to Norwegian hardcoded string when ApiError has no .data.error", () => {
    const err = makeApiError(500, null, "/api/vehicles");
    expect(extractMutationError(err, FALLBACKS.addVehicle)).toBe(FALLBACKS.addVehicle);
  });

  it("falls back when .data.error is an empty string", () => {
    const err = makeApiError(400, { error: "" }, "/api/vehicles");
    expect(extractMutationError(err, FALLBACKS.addVehicle)).toBe(FALLBACKS.addVehicle);
  });

  it("falls back when the error is not an ApiError (e.g. network error)", () => {
    const err = new TypeError("Failed to fetch");
    expect(extractMutationError(err, FALLBACKS.addVehicle)).toBe(FALLBACKS.addVehicle);
  });
});

// ---------------------------------------------------------------------------
// Edit vehicle — PATCH /api/vehicles/:id
// ---------------------------------------------------------------------------

describe("extractMutationError — edit-vehicle failure paths", () => {
  it("prefers err.data.error over fallback when backend sends a validation error", () => {
    const err = makeApiError(400, { error: ERRORS.VALIDATION_ERROR }, "/api/vehicles/42", "PATCH");
    expect(extractMutationError(err, FALLBACKS.updateVehicle)).toBe(ERRORS.VALIDATION_ERROR);
  });

  it("prefers err.data.error over fallback when backend sends a not-found error", () => {
    const err = makeApiError(404, { error: ERRORS.NOT_FOUND }, "/api/vehicles/42", "PATCH");
    expect(extractMutationError(err, FALLBACKS.updateVehicle)).toBe(ERRORS.NOT_FOUND);
  });

  it("prefers err.data.error over fallback for a forbidden update attempt", () => {
    const err = makeApiError(403, { error: ERRORS.FORBIDDEN }, "/api/vehicles/42", "PATCH");
    expect(extractMutationError(err, FALLBACKS.updateVehicle)).toBe(ERRORS.FORBIDDEN);
  });

  it("falls back to Norwegian hardcoded string when ApiError has no .data.error", () => {
    const err = makeApiError(500, {}, "/api/vehicles/42", "PATCH");
    expect(extractMutationError(err, FALLBACKS.updateVehicle)).toBe(FALLBACKS.updateVehicle);
  });

  it("falls back when the error is not an ApiError", () => {
    const err = new Error("network timeout");
    expect(extractMutationError(err, FALLBACKS.updateVehicle)).toBe(FALLBACKS.updateVehicle);
  });
});

// ---------------------------------------------------------------------------
// Add service record — POST /api/vehicles/:vehicleId/service-records
// ---------------------------------------------------------------------------

describe("extractMutationError — add-service failure paths", () => {
  it("prefers err.data.error over fallback when backend sends a validation error", () => {
    const err = makeApiError(400, { error: ERRORS.VALIDATION_ERROR }, "/api/vehicles/1/service-records");
    expect(extractMutationError(err, FALLBACKS.addService)).toBe(ERRORS.VALIDATION_ERROR);
  });

  it("prefers err.data.error over fallback when backend sends an unauthorized error", () => {
    const err = makeApiError(401, { error: ERRORS.UNAUTHORIZED }, "/api/vehicles/1/service-records");
    expect(extractMutationError(err, FALLBACKS.addService)).toBe(ERRORS.UNAUTHORIZED);
  });

  it("prefers err.data.error over fallback when backend sends an internal error", () => {
    const err = makeApiError(500, { error: ERRORS.INTERNAL }, "/api/vehicles/1/service-records");
    expect(extractMutationError(err, FALLBACKS.addService)).toBe(ERRORS.INTERNAL);
  });

  it("falls back to Norwegian hardcoded string when ApiError body is null", () => {
    const err = makeApiError(503, null, "/api/vehicles/1/service-records");
    expect(extractMutationError(err, FALLBACKS.addService)).toBe(FALLBACKS.addService);
  });

  it("falls back when the error is not an ApiError", () => {
    expect(extractMutationError(undefined, FALLBACKS.addService)).toBe(FALLBACKS.addService);
  });
});

// ---------------------------------------------------------------------------
// Edit service record — PATCH /api/vehicles/:vehicleId/service-records/:id
// ---------------------------------------------------------------------------

describe("extractMutationError — edit-service failure paths", () => {
  it("prefers err.data.error over fallback when backend sends a validation error", () => {
    const err = makeApiError(400, { error: ERRORS.VALIDATION_ERROR }, "/api/vehicles/1/service-records/7", "PATCH");
    expect(extractMutationError(err, FALLBACKS.updateService)).toBe(ERRORS.VALIDATION_ERROR);
  });

  it("prefers err.data.error over fallback when backend sends a not-found error", () => {
    const err = makeApiError(404, { error: ERRORS.NOT_FOUND }, "/api/vehicles/1/service-records/7", "PATCH");
    expect(extractMutationError(err, FALLBACKS.updateService)).toBe(ERRORS.NOT_FOUND);
  });

  it("prefers err.data.error over fallback when backend sends a conflict error", () => {
    const err = makeApiError(409, { error: ERRORS.CONFLICT }, "/api/vehicles/1/service-records/7", "PATCH");
    expect(extractMutationError(err, FALLBACKS.updateService)).toBe(ERRORS.CONFLICT);
  });

  it("falls back to Norwegian hardcoded string when ApiError has no .data.error", () => {
    const err = makeApiError(500, { message: "oops" }, "/api/vehicles/1/service-records/7", "PATCH");
    expect(extractMutationError(err, FALLBACKS.updateService)).toBe(FALLBACKS.updateService);
  });

  it("falls back when .data.error is a non-string value", () => {
    const err = makeApiError(400, { error: 42 }, "/api/vehicles/1/service-records/7", "PATCH");
    expect(extractMutationError(err, FALLBACKS.updateService)).toBe(FALLBACKS.updateService);
  });

  it("falls back when the error is not an ApiError", () => {
    const err = null;
    expect(extractMutationError(err, FALLBACKS.updateService)).toBe(FALLBACKS.updateService);
  });
});
