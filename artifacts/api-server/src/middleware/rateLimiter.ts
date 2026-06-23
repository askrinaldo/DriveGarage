import rateLimit from "express-rate-limit";

// IS_DEV: rate limiting is skipped entirely in local development (NODE_ENV=development).
// In Replit deployed environments, NODE_ENV is not "development", so limiting is active.
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

/** Global API limit — covers all /api/* requests (300 req/min per IP) */
export const globalRateLimit = makeLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: "For mange forespørsler. Prøv igjen snart.",
});

/** Tight limit for auth/login endpoints — brute-force protection (20 req/15min per IP) */
export const authRateLimit = makeLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "For mange forsøk. Prøv igjen om 15 minutter.",
});

/** General write-endpoint limit — POST/PATCH/DELETE (60 req/min per IP) */
export const writeRateLimit = makeLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: "For mange forespørsler. Prøv igjen snart.",
});

/** AI endpoint limit — prevents quota drain (10 req/min per IP) */
export const aiRateLimit = makeLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "For mange AI-forespørsler. Vent litt og prøv igjen.",
});

/** Invite/code endpoint limit — prevents enumeration (20 req/min per IP) */
export const inviteRateLimit = makeLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: "For mange invitasjonsforsøk. Prøv igjen snart.",
});
