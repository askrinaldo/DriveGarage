import { Router, type IRouter } from "express";
import healthRouter from "./health";
import vehiclesRouter from "./vehicles";
import serviceRecordsRouter from "./serviceRecords";
import receiptsRouter from "./receipts";
import tripLogsRouter from "./tripLogs";
import statsRouter from "./stats";
import clubsRouter from "./clubs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(vehiclesRouter);
router.use(serviceRecordsRouter);
router.use(receiptsRouter);
router.use(tripLogsRouter);
router.use(statsRouter);
router.use(clubsRouter);

export default router;
