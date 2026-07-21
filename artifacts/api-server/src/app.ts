import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middleware/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { ERRORS, AppError, isDatabaseError } from "./lib/errors";
import { validateEnv } from "./lib/envValidation";
import { parseAuth, resolveClubActorFromUser } from "./middleware/auth";
import { parseUserAuth } from "./middleware/userAuth";
import { clerkUserAuth } from "./middleware/clerkUserAuth";
import { globalRateLimit, writeRateLimit } from "./middleware/rateLimiter";
import { requirePaidAccess } from "./middleware/billingAccess";

// Fail fast on startup if required env vars are missing
validateEnv();

// REPLIT_DEPLOYMENT is set to "1" by the Replit platform in reserved/autoscale deployments.
// NODE_ENV=production can also be set explicitly via Replit Secrets for the deployed environment.
const IS_PROD =
  process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";

// ─── CORS ─────────────────────────────────────────────────────────────────────
// In production: only allow origins listed in REPLIT_DOMAINS.
// In development: allow all origins so the Vite dev server can connect.
function buildCorsOrigin() {
  if (!IS_PROD) return true;
  const domains = process.env.REPLIT_DOMAINS;
  if (!domains) return true; // fallback if not set
  const allowed = domains
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .flatMap((d) => [`https://${d}`, `http://${d}`]);
  return (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowed.includes(origin)) {
      cb(null, true);
    } else {
      logger.warn({ origin }, "CORS blocked request from disallowed origin");
      cb(new Error("Not allowed by CORS"));
    }
  };
}

const app: Express = express();

// Clerk proxy must be mounted before body parsers (streams raw bytes)
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: buildCorsOrigin() }));

// ─── Security headers ─────────────────────────────────────────────────────────
// Inline equivalent of helmet with a safe config for a JSON API behind Clerk/Vite.
// CSP/COEP/X-Frame-Options intentionally omitted — this server only responds with
// JSON, not HTML, so those headers are meaningless here. HSTS only in production
// where HTTPS is guaranteed by the Replit deployment layer.
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (IS_PROD) {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
});

// Global API rate limit — all /api/* requests (300 req/min per IP, skipped in dev)
app.use(globalRateLimit);

app.use(cookieParser());
// Webhook path must receive the raw Buffer body for HMAC-SHA256 verification.
// All other routes use standard JSON parsing.
const VIPPS_WEBHOOK_PATH = "/api/billing/vipps/webhook";
app.use((req, res, next) => {
  if (req.method === "POST" && req.path === VIPPS_WEBHOOK_PATH) {
    // express.raw captures the body as a Buffer, preserving exact bytes for HMAC
    express.raw({ type: () => true, limit: "2mb" })(req, res, next);
  } else {
    express.json({ limit: "2mb" })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Clerk middleware — populates req.auth from session cookie/token.
app.use(
  clerkMiddleware({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  }),
);

// Club JWT auth (separate auth system for clubs)
app.use(parseAuth);

// User auth: JWT header first (admin fallback), then Clerk session
app.use(parseUserAuth);
app.use(clerkUserAuth);

// Bridge: if there is no club JWT but the Clerk/user identity maps to a club
// member, populate req.auth so owners/admins can manage their club via Clerk.
app.use(resolveClubActorFromUser);

// Global write-rate-limit for all state-changing requests
app.use((req, res, next) => {
  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    writeRateLimit(req, res, next);
    return;
  }
  next();
});

// Billing access gate — requires paid subscription for authenticated feature routes.
// No-op when BILLING_ENFORCEMENT_ENABLED != "true" (hasPaidAccess returns true).
// Unauthenticated routes (no req.userAuth.userId) pass through immediately.
// Billing, account, auth, admin, and health routes are excluded by path prefix.
const BILLING_EXCLUDED_PREFIXES = [
  "/api/billing",
  "/api/account",
  "/api/auth",
  "/api/user-auth",
  "/api/admin",
  "/api/health",
  "/api/tenants",
];
app.use((req: Request, res: Response, next: NextFunction) => {
  if (BILLING_EXCLUDED_PREFIXES.some(p => req.path.startsWith(p))) {
    next();
    return;
  }
  requirePaidAccess(req, res, next);
});

app.use("/api", router);

// ─── Global error handler ────────────────────────────────────────────────────
// Must be registered AFTER all routes.
// Rules:
//   • Database errors (pg/Drizzle) → always ERRORS.INTERNAL, even in dev,
//     so table names, column names, and query fragments never reach the client.
//   • AppError (structured throws from route handlers) → use the message as-is
//     in dev; use ERRORS.INTERNAL in prod for 5xx, message for 4xx.
//   • All other errors → dev gets message+stack for debugging; prod gets
//     ERRORS.INTERNAL (5xx) or message (4xx).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: number; statusCode?: number })?.status
    ?? (err as { status?: number; statusCode?: number })?.statusCode
    ?? 500;

  // Always log the full error server-side so engineers can diagnose
  logger.error({ err, method: req.method, url: req.url?.split("?")[0], status }, "Unhandled error");

  // Database errors must never expose internals — applies in all environments.
  // This covers pg SQLSTATE errors, Node network errors (ECONNRESET etc.),
  // named Drizzle/pg error classes, and wrapped errors in the cause chain.
  if (isDatabaseError(err)) {
    res.status(500).json({ error: ERRORS.INTERNAL });
    return;
  }

  // AppError = structured throws from route handlers with an explicit status code.
  // 4xx: the message is already safe and user-facing, surface it in all environments.
  // 5xx: hide implementation details in production.
  // Optional meta fields (e.g. code, feature, limit) are merged into the body for 4xx.
  if (err instanceof AppError) {
    const isClientError = err.status >= 400 && err.status < 500;
    const message = isClientError || !IS_PROD ? err.message : ERRORS.INTERNAL;
    res.status(err.status).json({
      error: message,
      ...(isClientError && err.meta ? err.meta : {}),
    });
    return;
  }

  const message = (err as { message?: string })?.message ?? ERRORS.INTERNAL;
  const isClientError = status >= 400 && status < 500;

  if (IS_PROD) {
    // In production: expose message only for 4xx (already user-facing); hide 5xx details
    res.status(status).json({ error: isClientError ? message : ERRORS.INTERNAL });
  } else {
    // In development: expose message + stack for non-DB application errors
    res.status(status).json({
      error: message,
      stack: (err as { stack?: string })?.stack,
    });
  }
});

export default app;
