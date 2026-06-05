import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vehiclesRouter from "./vehicles";
import serviceRecordsRouter from "./serviceRecords";
import receiptsRouter from "./receipts";
import tripLogsRouter from "./tripLogs";
import statsRouter from "./stats";
import authRouter from "./auth";
import clubsRouter from "./clubs";
import clubInvitationsRouter from "./clubInvitations";
import clubGarageRouter from "./clubGarage";
import forumRouter from "./forum";
import clubDashboardRouter from "./clubDashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(vehiclesRouter);
router.use(serviceRecordsRouter);
router.use(receiptsRouter);
router.use(tripLogsRouter);
router.use(statsRouter);
router.use(clubInvitationsRouter);
router.use(clubGarageRouter);
router.use(forumRouter);
router.use(clubDashboardRouter);
router.use(clubsRouter);

export default router;
