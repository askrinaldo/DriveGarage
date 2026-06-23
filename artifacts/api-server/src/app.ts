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
import { validateEnv } from "./lib/envValidation";
import { parseAuth } from "./middleware/auth";
import { parseUserAuth } from "./middleware/userAuth";
import { clerkUserAuth } from "./middleware/clerkUserAuth";
import { globalRateLimit, writeRateLimit } from "./middleware/rateLimiter";

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
app.use(express.json({ limit: "2mb" }));
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

// Global write-rate-limit for all state-changing requests
app.use((req, res, next) => {
  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    writeRateLimit(req, res, next);
    return;
  }
  next();
});

app.use("/api", router);

// ─── Global error handler ────────────────────────────────────────────────────
// Must be registered AFTER all routes.
// In production: never leak stack traces or internal error messages.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: number; statusCode?: number })?.status
    ?? (err as { status?: number; statusCode?: number })?.statusCode
    ?? 500;

  // Always log the full error server-side
  logger.error({ err, method: req.method, url: req.url?.split("?")[0] }, "Unhandled error");

  if (IS_PROD) {
    // Never expose internal details in production
    res.status(status).json({ error: status === 500 ? "Internal server error" : (err as { message?: string })?.message ?? "Error" });
  } else {
    res.status(status).json({
      error: (err as { message?: string })?.message ?? "Error",
      stack: (err as { stack?: string })?.stack,
    });
  }
});

export default app;
