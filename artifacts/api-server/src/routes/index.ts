import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vehiclesRouter from "./vehicles";
import serviceRecordsRouter from "./serviceRecords";
import receiptsRouter from "./receipts";
import tripLogsRouter from "./tripLogs";
import statsRouter from "./stats";
import authRouter from "./auth";
import userAuthRouter from "./userAuth";

import clubsRouter from "./clubs";
import clubInvitationsRouter from "./clubInvitations";
import clubGarageRouter from "./clubGarage";
import forumRouter from "./forum";
import clubDashboardRouter from "./clubDashboard";
import clubEventsRouter from "./clubEvents";
import badgesRouter from "./badges";
import marketplaceRouter from "./marketplace";
import serviceRemindersRouter from "./serviceReminders";
import maintenanceAdviceRouter from "./maintenanceAdvice";
import supportRouter from "./support";
import chatRouter from "./chat";
import chatHistoryRouter from "./chatHistory";
import vehicleTransfersRouter from "./vehicleTransfers";
// import billingRouter from "./billing"; // temporarily disabled
import adminRouter from "./admin";
import financeInsightRouter from "./financeInsight";
import projectsRouter from "./projects";
import tenantsRouter from "./tenants";

const router: IRouter = Router();

router.use(healthRouter);

router.use(authRouter);
router.use(userAuthRouter);
router.use(vehiclesRouter);
router.use(serviceRecordsRouter);
router.use(receiptsRouter);
router.use(tripLogsRouter);
router.use(statsRouter);
router.use(clubInvitationsRouter);
router.use(clubGarageRouter);
router.use(forumRouter);
router.use(clubDashboardRouter);
router.use(clubEventsRouter);
router.use(badgesRouter);
router.use(marketplaceRouter);
router.use(serviceRemindersRouter);
router.use(maintenanceAdviceRouter);
router.use(supportRouter);
router.use(chatRouter);
router.use(chatHistoryRouter);
router.use(vehicleTransfersRouter);
router.use(clubsRouter);
// router.use(billingRouter); // temporarily disabled
router.use(adminRouter);
router.use(financeInsightRouter);
router.use(projectsRouter);
router.use(tenantsRouter);

export default router;
