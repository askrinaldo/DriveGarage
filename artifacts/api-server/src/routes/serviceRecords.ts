import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, serviceRecordsTable } from "@workspace/db";
import {
  CreateServiceRecordBody,
  CreateServiceRecordParams,
  ListServiceRecordsParams,
  GetServiceRecordParams,
  UpdateServiceRecordParams,
  UpdateServiceRecordBody,
  DeleteServiceRecordParams,
} from "@workspace/api-zod";
import { parseUserAuth, requireUser } from "../middleware/userAuth";
import { assertVehicleOwnership } from "../lib/vehicleOwnership";
import { ERRORS } from "../lib/errors";

const router: IRouter = Router();

router.get("/vehicles/:vehicleId/service-records", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = ListServiceRecordsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: ERRORS.VALIDATION_ERROR });
    return;
  }
  const { tenantId, userId } = req.userAuth!;
  const owned = await assertVehicleOwnership(params.data.vehicleId, tenantId, userId);
  if (!owned) {
    res.status(404).json({ error: "Kjøretøy ikke funnet" });
    return;
  }
  const records = await db
    .select()
    .from(serviceRecordsTable)
    .where(eq(serviceRecordsTable.vehicleId, params.data.vehicleId))
    .orderBy(serviceRecordsTable.serviceDate);
  res.json(records);
});

router.post("/vehicles/:vehicleId/service-records", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = CreateServiceRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: ERRORS.VALIDATION_ERROR });
    return;
  }
  const parsed = CreateServiceRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: ERRORS.VALIDATION_ERROR });
    return;
  }
  const { tenantId, userId } = req.userAuth!;
  const owned = await assertVehicleOwnership(params.data.vehicleId, tenantId, userId);
  if (!owned) {
    res.status(404).json({ error: "Kjøretøy ikke funnet" });
    return;
  }
  const [record] = await db
    .insert(serviceRecordsTable)
    .values({
      ...parsed.data,
      vehicleId: params.data.vehicleId,
      cost: parsed.data.cost != null ? String(parsed.data.cost) : null,
    })
    .returning();
  res.status(201).json(record);
});

router.get("/vehicles/:vehicleId/service-records/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = GetServiceRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: ERRORS.VALIDATION_ERROR });
    return;
  }
  const { tenantId, userId } = req.userAuth!;
  const owned = await assertVehicleOwnership(params.data.vehicleId, tenantId, userId);
  if (!owned) {
    res.status(404).json({ error: "Kjøretøy ikke funnet" });
    return;
  }
  const [record] = await db
    .select()
    .from(serviceRecordsTable)
    .where(and(eq(serviceRecordsTable.id, params.data.id), eq(serviceRecordsTable.vehicleId, params.data.vehicleId)));
  if (!record) {
    res.status(404).json({ error: "Serviceoppføring ikke funnet" });
    return;
  }
  res.json(record);
});

router.patch("/vehicles/:vehicleId/service-records/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = UpdateServiceRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: ERRORS.VALIDATION_ERROR });
    return;
  }
  const parsed = UpdateServiceRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: ERRORS.VALIDATION_ERROR });
    return;
  }
  const { tenantId, userId } = req.userAuth!;
  const owned = await assertVehicleOwnership(params.data.vehicleId, tenantId, userId);
  if (!owned) {
    res.status(404).json({ error: "Kjøretøy ikke funnet" });
    return;
  }
  const [record] = await db
    .update(serviceRecordsTable)
    .set({
      ...parsed.data,
      cost: parsed.data.cost != null ? String(parsed.data.cost) : null,
    })
    .where(and(eq(serviceRecordsTable.id, params.data.id), eq(serviceRecordsTable.vehicleId, params.data.vehicleId)))
    .returning();
  if (!record) {
    res.status(404).json({ error: "Serviceoppføring ikke funnet" });
    return;
  }
  res.json(record);
});

router.delete("/vehicles/:vehicleId/service-records/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = DeleteServiceRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: ERRORS.VALIDATION_ERROR });
    return;
  }
  const { tenantId, userId } = req.userAuth!;
  const owned = await assertVehicleOwnership(params.data.vehicleId, tenantId, userId);
  if (!owned) {
    res.status(404).json({ error: "Kjøretøy ikke funnet" });
    return;
  }
  const [record] = await db
    .delete(serviceRecordsTable)
    .where(and(eq(serviceRecordsTable.id, params.data.id), eq(serviceRecordsTable.vehicleId, params.data.vehicleId)))
    .returning();
  if (!record) {
    res.status(404).json({ error: "Serviceoppføring ikke funnet" });
    return;
  }
  res.sendStatus(204);
});

export default router;
