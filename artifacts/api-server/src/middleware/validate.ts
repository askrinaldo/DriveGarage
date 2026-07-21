import type { Request, Response, NextFunction } from "express";
import { z } from "zod/v4";

/**
 * Maps a single Zod v4 issue to a safe, human-readable Norwegian message.
 * No raw Zod codes or English defaults are exposed to callers.
 *
 * Zod v4 issue code differences from v3:
 *   - too_small / too_big  → use `origin` (not `type`) for the value kind
 *   - invalid_string       → renamed to `invalid_format`, uses `format` field
 *   - invalid_enum_value   → renamed to `invalid_value`
 */
function toNorwegianMessage(issue: z.ZodIssue): string {
  switch (issue.code) {
    case "invalid_type":
      return "Ugyldig verdi";

    case "too_small": {
      const min = issue.minimum;
      const origin = (issue as { origin?: string }).origin;
      if (origin === "string") {
        return Number(min) <= 1
          ? "Feltet kan ikke være tomt"
          : `Feltet må ha minst ${min} tegn`;
      }
      if (origin === "number" || origin === "bigint") {
        return `Verdien må være minst ${min}`;
      }
      if (origin === "array" || origin === "set") {
        return `Listen må ha minst ${min} element${Number(min) === 1 ? "" : "er"}`;
      }
      return "Verdien er for liten";
    }

    case "too_big": {
      const max = issue.maximum;
      const origin = (issue as { origin?: string }).origin;
      if (origin === "string") {
        return `Feltet kan ha maks ${max} tegn`;
      }
      if (origin === "number" || origin === "bigint") {
        return `Verdien kan være maks ${max}`;
      }
      if (origin === "array" || origin === "set") {
        return `Listen kan ha maks ${max} element${Number(max) === 1 ? "" : "er"}`;
      }
      return "Verdien er for stor";
    }

    case "invalid_format": {
      const fmt = (issue as { format?: string }).format;
      if (fmt === "email") return "Ugyldig e-postadresse";
      if (fmt === "url") return "Ugyldig nettadresse";
      if (fmt === "uuid") return "Ugyldig identifikator";
      if (fmt === "datetime") return "Ugyldig dato eller tid";
      if (fmt === "date") return "Ugyldig dato";
      if (fmt === "time") return "Ugyldig klokkeslett";
      if (fmt === "regex") return "Ugyldig format";
      return "Ugyldig tekstformat";
    }

    case "invalid_value":
      return "Ugyldig valg";

    case "unrecognized_keys":
      return "Ukjent felt";

    case "not_multiple_of":
      return "Ugyldig tall";

    case "invalid_key":
      return "Ugyldig nøkkel";

    case "invalid_element":
      return "Ugyldig element";

    case "invalid_union":
      return "Ugyldig verdi";

    case "custom": {
      const msg = issue.message;
      if (
        msg &&
        !/^(invalid|expected|required|must|too|not\s)/i.test(msg)
      ) {
        return msg;
      }
      return "Ugyldig verdi";
    }

    default:
      return "Ugyldig verdi";
  }
}

/**
 * Express middleware factory that validates `req.body` against a Zod schema.
 * On success, replaces `req.body` with the parsed (coerced) output.
 * On failure, responds with 400 and a structured error payload.
 *
 * The response never contains raw Zod error codes or English default messages.
 * All field-level messages are Norwegian.
 */
export function validate<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "_root";
        if (!fields[key]) fields[key] = toNorwegianMessage(issue);
      }

      const firstKey = Object.keys(fields)[0];
      const message = firstKey ? fields[firstKey] : "Ugyldig forespørsel";

      res.status(400).json({
        error: "validation_error",
        message,
        fields,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
