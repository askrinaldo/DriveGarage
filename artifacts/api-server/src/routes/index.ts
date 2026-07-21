import { Router, type IRouter } from "express";

// ─── Core vehicle domain ───────────────────────────────────────────────────────
import healthRouter from "./health";
import vehiclesRouter from "./vehicles";
import serviceRecordsRouter from "./serviceRecords";
import receiptsRouter from "./receipts";
import tripLogsRouter from "./tripLogs";
import serviceRemindersRouter from "./serviceReminders";
import statsRouter from "./stats";
import vehicleTransfersRouter from "./vehicleTransfers";

// ─── User / auth domain ────────────────────────────────────────────────────────
import authRouter from "./auth";
import userAuthRouter from "./userAuth";
import tenantsRouter from "./tenants";
import userProfileRouter from "./userProfile";

// ─── Clubs domain ─────────────────────────────────────────────────────────────
// TODO Phase 6: redesign clubs to use Clerk userId instead of string memberName.
// TODO Phase 2: merge club route files into routes/clubs/ subfolder.
import clubsRouter from "./clubs";
import clubInvitationsRouter from "./clubInvitations";
import clubGarageRouter from "./clubGarage";
import clubDashboardRouter from "./clubDashboard";
import clubEventsRouter from "./clubEvents";
import forumRouter from "./forum";
import marketplaceRouter from "./marketplace";

// ─── AI / assistant domain ────────────────────────────────────────────────────
import maintenanceAdviceRouter from "./maintenanceAdvice";

// ─── System / admin domain ────────────────────────────────────────────────────
import adminRouter from "./admin";
import billingRouter from "./billing"; // Vipps Recurring — subscription + webhook routes
import accountRouter from "./account"; // Account self-service: deletion request / cancel-deletion

const router: IRouter = Router();

// Core vehicle domain
router.use(healthRouter);
router.use(vehiclesRouter);
router.use(serviceRecordsRouter);
router.use(receiptsRouter);
router.use(tripLogsRouter);
router.use(serviceRemindersRouter);
router.use(statsRouter);
router.use(vehicleTransfersRouter);

// User / auth domain
router.use(authRouter);
router.use(userAuthRouter);
router.use(tenantsRouter);
router.use(userProfileRouter);

// Clubs domain
router.use(clubsRouter);
router.use(clubInvitationsRouter);
router.use(clubGarageRouter);
router.use(clubDashboardRouter);
router.use(clubEventsRouter);
router.use(forumRouter);
router.use(marketplaceRouter);

// AI / assistant domain
router.use(maintenanceAdviceRouter);

// System / admin domain
router.use(adminRouter);
router.use(billingRouter);
router.use(accountRouter);

export default router;
