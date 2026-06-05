import { createServer } from "node:http";
import { runMigrations } from "stripe-replit-sync";
import app from "./app";
import { initSocket } from "./socket";
import { logger } from "./lib/logger";
import { seedSuperAdmin } from "./lib/seedAdmin";
import { getStripeSync } from "./stripeClient";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);
initSocket(httpServer);

async function initStripe(): Promise<void> {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) { logger.warn("DATABASE_URL not set — skipping Stripe init"); return; }
    await runMigrations({ databaseUrl });
    const sync = await getStripeSync();
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    await sync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
    await sync.syncBackfill();
    logger.info("Stripe init complete");
  } catch (err: unknown) {
    logger.warn({ err }, "Stripe init failed — continuing without Stripe");
  }
}

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  seedSuperAdmin().catch((e) => logger.warn({ err: e }, "seedSuperAdmin failed"));
  initStripe().catch((e) => logger.warn({ err: e }, "initStripe failed"));
});
