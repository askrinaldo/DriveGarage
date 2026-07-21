import type { Request, Response, NextFunction } from "express";
import { z } from "zod/v4";

/**
 * Express middleware factory that validates `req.body` against a Zod schema.
 * On success, replaces `req.body` with the parsed (coerced) output.
 * On failure, responds with 400 and a structured error payload.
 */
export function validate<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstMessage = result.error.issues[0]?.message ?? "Ugyldig forespørsel";
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "_root";
        if (!fields[key]) fields[key] = issue.message;
      }
      res.status(400).json({
        error: "validation_error",
        message: firstMessage,
        fields,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
