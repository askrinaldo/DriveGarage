import rateLimit from "express-rate-limit";

const IS_DEV = process.env.NODE_ENV === "development";

function makeLimit(opts: { windowMs: number; max: number; message: string }) {
  return rateLimit({
    windowMs: opts.windowMs,
    max: IS_DEV ? 10_000 : opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: opts.message },
    skip: () => IS_DEV,
  });
}

/** Tight limit for auth/login endpoints (brute-force protection) */
export const authRateLimit = makeLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "For mange forsøk. Prøv igjen om 15 minutter.",
});

/** General write-endpoint limit (POST/PATCH/DELETE) */
export const writeRateLimit = makeLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: "For mange forespørsler. Prøv igjen snart.",
});

/** Loose limit for read endpoints */
export const readRateLimit = makeLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: "For mange forespørsler. Prøv igjen snart.",
});
