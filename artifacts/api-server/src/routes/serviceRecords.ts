import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, vehiclesTable, serviceRecordsTable } from "@workspace/db";
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

const router: IRouter = Router();

// TODO Phase 2: extract to lib/vehicleOwnership.ts — same function is duplicated
// in receipts.ts and tripLogs.ts. See ARCHITECTURE.md R2.
async function assertVehicleOwnership(
  vehicleId: number,
  tenantId: number | null | undefined,
  userId: number,
): Promise<boolean> {
  const clause = tenantId
    ? and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.tenantId, tenantId))
    : and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, userId));
  const [vehicle] = await db.select({ id: vehiclesTable.id }).from(vehiclesTable).where(clause);
  return !!vehicle;
}

router.get("/vehicles/:vehicleId/service-records", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = ListServiceRecordsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { tenantId, userId } = req.userAuth!;
  const owned = await assertVehicleOwnership(params.data.vehicleId, tenantId, userId);
  if (!owned) {
    res.status(404).json({ error: "Vehicle not found" });
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
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateServiceRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { tenantId, userId } = req.userAuth!;
  const owned = await assertVehicleOwnership(params.data.vehicleId, tenantId, userId);
  if (!owned) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  const [record] = await db
    .insert(serviceRecordsTable)
    .values({ ...parsed.data, vehicleId: params.data.vehicleId })
    .returning();
  res.status(201).json(record);
});

router.get("/vehicles/:vehicleId/service-records/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = GetServiceRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { tenantId, userId } = req.userAuth!;
  const owned = await assertVehicleOwnership(params.data.vehicleId, tenantId, userId);
  if (!owned) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  const [record] = await db
    .select()
    .from(serviceRecordsTable)
    .where(and(eq(serviceRecordsTable.id, params.data.id), eq(serviceRecordsTable.vehicleId, params.data.vehicleId)));
  if (!record) {
    res.status(404).json({ error: "Service record not found" });
    return;
  }
  res.json(record);
});

router.patch("/vehicles/:vehicleId/service-records/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = UpdateServiceRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateServiceRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { tenantId, userId } = req.userAuth!;
  const owned = await assertVehicleOwnership(params.data.vehicleId, tenantId, userId);
  if (!owned) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  const [record] = await db
    .update(serviceRecordsTable)
    .set(parsed.data)
    .where(and(eq(serviceRecordsTable.id, params.data.id), eq(serviceRecordsTable.vehicleId, params.data.vehicleId)))
    .returning();
  if (!record) {
    res.status(404).json({ error: "Service record not found" });
    return;
  }
  res.json(record);
});

router.delete("/vehicles/:vehicleId/service-records/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = DeleteServiceRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { tenantId, userId } = req.userAuth!;
  const owned = await assertVehicleOwnership(params.data.vehicleId, tenantId, userId);
  if (!owned) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  const [record] = await db
    .delete(serviceRecordsTable)
    .where(and(eq(serviceRecordsTable.id, params.data.id), eq(serviceRecordsTable.vehicleId, params.data.vehicleId)))
    .returning();
  if (!record) {
    res.status(404).json({ error: "Service record not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
