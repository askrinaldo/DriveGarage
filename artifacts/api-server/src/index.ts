import { createServer } from "node:http";
import app from "./app";
import { initSocket } from "./socket";
import { logger } from "./lib/logger";
import { seedSuperAdmin } from "./lib/seedAdmin";

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

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  seedSuperAdmin().catch((e) => logger.warn({ err: e }, "seedSuperAdmin failed"));
  // Stripe removed — Vipps integration pending. No payment provider active at startup.
});
