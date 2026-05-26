import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vehiclesRouter from "./vehicles";
import serviceRecordsRouter from "./serviceRecords";
import receiptsRouter from "./receipts";
import tripLogsRouter from "./tripLogs";
import statsRouter from "./stats";
import clubsRouter from "./clubs";
import clubInvitationsRouter from "./clubInvitations";
import clubGarageRouter from "./clubGarage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vehiclesRouter);
router.use(serviceRecordsRouter);
router.use(receiptsRouter);
router.use(tripLogsRouter);
router.use(statsRouter);
router.use(clubInvitationsRouter);
router.use(clubGarageRouter);
router.use(clubsRouter);

export default router;
