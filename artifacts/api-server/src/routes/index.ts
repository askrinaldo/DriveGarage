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

// ─── Clubs domain ─────────────────────────────────────────────────────────────
// TODO Phase 6: redesign clubs to use Clerk userId instead of string memberName.
// TODO Phase 2: merge club route files into routes/clubs/ subfolder.
import clubsRouter from "./clubs";
import clubInvitationsRouter from "./clubInvitations";
import clubGarageRouter from "./clubGarage";
import clubDashboardRouter from "./clubDashboard";
import clubEventsRouter from "./clubEvents";
import forumRouter from "./forum";
import badgesRouter from "./badges";
import marketplaceRouter from "./marketplace";

// ─── AI / assistant domain ────────────────────────────────────────────────────
import maintenanceAdviceRouter from "./maintenanceAdvice";
import chatRouter from "./chat";
import chatHistoryRouter from "./chatHistory";
import financeInsightRouter from "./financeInsight";

// ─── System / admin domain ────────────────────────────────────────────────────
import adminRouter from "./admin";
import supportRouter from "./support";
import projectsRouter from "./projects";
import billingRouter from "./billing"; // Vipps placeholder — routes return pending_integration

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

// Clubs domain
router.use(clubsRouter);
router.use(clubInvitationsRouter);
router.use(clubGarageRouter);
router.use(clubDashboardRouter);
router.use(clubEventsRouter);
router.use(forumRouter);
router.use(badgesRouter);
router.use(marketplaceRouter);

// AI / assistant domain
router.use(maintenanceAdviceRouter);
router.use(chatRouter);
router.use(chatHistoryRouter);
router.use(financeInsightRouter);

// System / admin domain
router.use(adminRouter);
router.use(supportRouter);
router.use(projectsRouter);
router.use(billingRouter); // Vipps placeholder active

export default router;
