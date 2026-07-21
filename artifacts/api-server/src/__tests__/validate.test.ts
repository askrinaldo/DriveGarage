/**
 * Integration tests for the validate() middleware in src/middleware/validate.ts.
 *
 * Strategy:
 *   - Mount the real validate() middleware on a minimal Express app via supertest.
 *   - Use a schema that exercises each Zod issue code (invalid_type, too_small,
 *     too_big, invalid_format, invalid_value, custom).
 *   - Assert:
 *       1. The response message values NEVER contain raw Zod codes.
 *       2. The response message values NEVER contain English Zod default fragments.
 *       3. The message and fields values are Norwegian human-readable strings.
 *       4. The fields map uses the field path as key.
 *       5. Valid payloads pass through to the handler (no 400).
 *
 * NOTE: assertNoLeaks checks ONLY the message values (not keys), because field
 * names in the `fields` map legitimately contain words like "custom" or "type".
 */

import express from "express";
import request from "supertest";
import { z } from "zod/v4";
import { describe, it, expect, beforeAll } from "vitest";
import { validate } from "../middleware/validate";

// ─── Test schema ──────────────────────────────────────────────────────────────

const TestSchema = z.object({
  name:      z.string().min(1).max(50),
  age:       z.number().int().min(0).max(120),
  email:     z.string().email().optional(),
  role:      z.enum(["admin", "member"]).optional(),
  birthday:  z.string().date().nullable().optional(),
  tags:      z.array(z.string()).min(1).max(5).optional(),
  note:      z.string().refine((v) => v !== "bad", { message: "Feltet er ugyldig" }).optional(),
});

// ─── Raw Zod codes that MUST NOT appear in any message VALUE ─────────────────
// We check only values (not keys), because field names may contain these words.

const FORBIDDEN_IN_VALUES = [
  "invalid_type",
  "too_small",
  "too_big",
  "invalid_string",
  "invalid_format",
  "invalid_date",
  "invalid_value",
  "invalid_literal",
  "unrecognized_keys",
  "not_multiple_of",
  "not_finite",
  "invalid_union",
];

// English Zod default message patterns that MUST NOT appear in message values
const FORBIDDEN_ENGLISH_PATTERNS = [
  /Expected\s/i,
  /received\s/i,
  /must contain/i,
  /must be/i,
  /Invalid type/i,
  /Invalid string/i,
  /Invalid email/i,
  /Invalid date/i,
  /Invalid option/i,
  /String must/i,
  /Number must/i,
  /Array must/i,
  /Too small/i,
  /Too big/i,
];

/**
 * Extracts all string values from a nested object (not keys).
 * Used to verify that no Zod internals leak into message values.
 */
function collectValues(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (Array.isArray(obj)) return obj.flatMap(collectValues);
  if (obj && typeof obj === "object") {
    return Object.values(obj as Record<string, unknown>).flatMap(collectValues);
  }
  return [];
}

function assertNoLeaks(body: unknown): void {
  const values = collectValues(body);
  for (const val of values) {
    for (const code of FORBIDDEN_IN_VALUES) {
      expect(val, `Message value must not contain Zod code "${code}"`).not.toContain(code);
    }
    for (const pattern of FORBIDDEN_ENGLISH_PATTERNS) {
      expect(
        val,
        `Message value must not contain English Zod fragment matching ${pattern}`,
      ).not.toMatch(pattern);
    }
  }
}

// ─── Minimal Express app ──────────────────────────────────────────────────────

let app: express.Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.post(
    "/test",
    validate(TestSchema),
    (_req, res) => { res.status(200).json({ ok: true }); },
  );
});

// ─── Valid payloads ───────────────────────────────────────────────────────────

describe("validate() — valid payloads pass through", () => {
  it("200 for a minimal valid payload", async () => {
    const res = await request(app).post("/test").send({ name: "Ola", age: 30 });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("200 for a fully populated valid payload", async () => {
    const res = await request(app).post("/test").send({
      name: "Kari",
      age: 25,
      email: "kari@example.com",
      role: "admin",
      birthday: "1999-06-15",
      tags: ["bil", "klassisk"],
    });
    expect(res.status).toBe(200);
  });

  it("200 when nullable optional field is null", async () => {
    const res = await request(app).post("/test").send({ name: "Per", age: 0, birthday: null });
    expect(res.status).toBe(200);
  });
});

// ─── Invalid payloads — no leaks ─────────────────────────────────────────────

describe("validate() — invalid_type: wrong primitive types", () => {
  it("400 when name is a number instead of a string", async () => {
    const res = await request(app).post("/test").send({ name: 42, age: 30 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
    assertNoLeaks(res.body);
  });

  it("400 when age is a string instead of a number", async () => {
    const res = await request(app).post("/test").send({ name: "Ola", age: "tretti" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
    assertNoLeaks(res.body);
  });

  it("400 when tags is a string instead of an array", async () => {
    const res = await request(app).post("/test").send({ name: "Ola", age: 5, tags: "bil" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
    assertNoLeaks(res.body);
  });
});

describe("validate() — too_small: below minimum", () => {
  it("400 when name is empty string (min 1) — Norwegian 'tomt' message", async () => {
    const res = await request(app).post("/test").send({ name: "", age: 30 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
    assertNoLeaks(res.body);
    expect(res.body.fields?.name).toBe("Feltet kan ikke være tomt");
  });

  it("400 when age is below 0 (min 0) — Norwegian 'minst' message with bound", async () => {
    const res = await request(app).post("/test").send({ name: "Ola", age: -1 });
    expect(res.status).toBe(400);
    assertNoLeaks(res.body);
    expect(res.body.fields?.age).toContain("minst 0");
  });

  it("400 when tags array has 0 items (min 1) — Norwegian list message", async () => {
    const res = await request(app).post("/test").send({ name: "Ola", age: 5, tags: [] });
    expect(res.status).toBe(400);
    assertNoLeaks(res.body);
    expect(res.body.fields?.tags).toContain("minst 1");
  });
});

describe("validate() — too_big: above maximum", () => {
  it("400 when name exceeds 50 chars — Norwegian 'maks' message with bound", async () => {
    const res = await request(app).post("/test").send({ name: "A".repeat(51), age: 30 });
    expect(res.status).toBe(400);
    assertNoLeaks(res.body);
    expect(res.body.fields?.name).toContain("maks 50");
  });

  it("400 when age exceeds 120 — Norwegian 'maks' message with bound", async () => {
    const res = await request(app).post("/test").send({ name: "Ola", age: 121 });
    expect(res.status).toBe(400);
    assertNoLeaks(res.body);
    expect(res.body.fields?.age).toContain("maks 120");
  });

  it("400 when tags array has 6 items (max 5) — Norwegian list message", async () => {
    const res = await request(app).post("/test").send({
      name: "Ola", age: 5,
      tags: ["a", "b", "c", "d", "e", "f"],
    });
    expect(res.status).toBe(400);
    assertNoLeaks(res.body);
    expect(res.body.fields?.tags).toContain("maks 5");
  });
});

describe("validate() — invalid_format (Zod v4): string format validators", () => {
  it("400 when email format is invalid — Norwegian e-post message", async () => {
    const res = await request(app).post("/test").send({ name: "Ola", age: 30, email: "not-an-email" });
    expect(res.status).toBe(400);
    assertNoLeaks(res.body);
    expect(res.body.fields?.email).toBe("Ugyldig e-postadresse");
  });

  it("400 when birthday is not a valid date string", async () => {
    const res = await request(app).post("/test").send({ name: "Ola", age: 30, birthday: "not-a-date" });
    expect(res.status).toBe(400);
    assertNoLeaks(res.body);
    expect(res.body.fields?.birthday).toBe("Ugyldig dato");
  });
});

describe("validate() — invalid_value (Zod v4): enum values", () => {
  it("400 when role is an unrecognised enum value — Norwegian 'valg' message", async () => {
    const res = await request(app).post("/test").send({ name: "Ola", age: 30, role: "superuser" });
    expect(res.status).toBe(400);
    assertNoLeaks(res.body);
    expect(res.body.fields?.role).toBe("Ugyldig valg");
  });
});

describe("validate() — custom refinement", () => {
  it("400 when custom refinement fails — passes through Norwegian message unchanged", async () => {
    const res = await request(app).post("/test").send({ name: "Ola", age: 30, note: "bad" });
    expect(res.status).toBe(400);
    assertNoLeaks(res.body);
    expect(res.body.fields?.note).toBe("Feltet er ugyldig");
  });
});

// ─── Response shape contract ──────────────────────────────────────────────────

describe("validate() — response shape", () => {
  it("400 body always has error, message, and fields", async () => {
    const res = await request(app).post("/test").send({ name: "", age: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
    expect(typeof res.body.message).toBe("string");
    expect(res.body.message.length).toBeGreaterThan(0);
    expect(typeof res.body.fields).toBe("object");
    expect(res.body.fields).not.toBeNull();
  });

  it("fields map key is the field path, not a Zod code", async () => {
    const res = await request(app).post("/test").send({ name: "", age: 30 });
    expect(res.status).toBe(400);
    const keys = Object.keys(res.body.fields);
    expect(keys).toContain("name");
    for (const code of FORBIDDEN_IN_VALUES) {
      expect(keys).not.toContain(code);
    }
  });

  it("message matches the first field's Norwegian message", async () => {
    const res = await request(app).post("/test").send({ name: "", age: 30 });
    expect(res.status).toBe(400);
    const firstFieldValue = res.body.fields[Object.keys(res.body.fields)[0]];
    expect(res.body.message).toBe(firstFieldValue);
  });

  it("multiple field errors are all present in fields map", async () => {
    const res = await request(app).post("/test").send({ name: "", age: -1 });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields).length).toBeGreaterThanOrEqual(2);
    assertNoLeaks(res.body);
  });
});
