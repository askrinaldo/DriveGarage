import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { validateEnv } from "./lib/envValidation";
import { parseAuth } from "./middleware/auth";
import { parseUserAuth } from "./middleware/userAuth";
import { clerkUserAuth } from "./middleware/clerkUserAuth";
import { WebhookHandlers } from "./webhookHandlers";
import { writeRateLimit } from "./middleware/rateLimiter";

// Fail fast on startup if required env vars are missing
validateEnv();

const IS_PROD = process.env.NODE_ENV === "production";

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

// Stripe webhook MUST be registered before express.json() — needs raw Buffer body
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0]! : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: unknown) {
      logger.error({ err }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

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
