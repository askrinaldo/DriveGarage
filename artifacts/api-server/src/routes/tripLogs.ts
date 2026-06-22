import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, tripLogsTable } from "@workspace/db";
import {
  CreateTripLogBody,
  CreateTripLogParams,
  ListTripLogsParams,
  GetTripLogParams,
  UpdateTripLogParams,
  UpdateTripLogBody,
  DeleteTripLogParams,
} from "@workspace/api-zod";
import { parseUserAuth, requireUser } from "../middleware/userAuth";
import { assertVehicleOwnership } from "../lib/vehicleOwnership";

const router: IRouter = Router();

router.get("/vehicles/:vehicleId/trip-logs", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = ListTripLogsParams.safeParse(req.params);
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
  const logs = await db
    .select()
    .from(tripLogsTable)
    .where(eq(tripLogsTable.vehicleId, params.data.vehicleId))
    .orderBy(tripLogsTable.tripDate);
  res.json(logs);
});

router.post("/vehicles/:vehicleId/trip-logs", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = CreateTripLogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateTripLogBody.safeParse(req.body);
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
  const [log] = await db
    .insert(tripLogsTable)
    .values({
      ...parsed.data,
      vehicleId: params.data.vehicleId,
      distanceKm: parsed.data.distanceKm != null ? String(parsed.data.distanceKm) : null,
      fuelUsedLiters: parsed.data.fuelUsedLiters != null ? String(parsed.data.fuelUsedLiters) : null,
    })
    .returning();
  res.status(201).json(log);
});

router.get("/vehicles/:vehicleId/trip-logs/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = GetTripLogParams.safeParse(req.params);
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
  const [log] = await db
    .select()
    .from(tripLogsTable)
    .where(and(eq(tripLogsTable.id, params.data.id), eq(tripLogsTable.vehicleId, params.data.vehicleId)));
  if (!log) {
    res.status(404).json({ error: "Trip log not found" });
    return;
  }
  res.json(log);
});

router.patch("/vehicles/:vehicleId/trip-logs/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = UpdateTripLogParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTripLogBody.safeParse(req.body);
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
  const [log] = await db
    .update(tripLogsTable)
    .set({
      ...parsed.data,
      distanceKm: parsed.data.distanceKm != null ? String(parsed.data.distanceKm) : null,
      fuelUsedLiters: parsed.data.fuelUsedLiters != null ? String(parsed.data.fuelUsedLiters) : null,
    })
    .where(and(eq(tripLogsTable.id, params.data.id), eq(tripLogsTable.vehicleId, params.data.vehicleId)))
    .returning();
  if (!log) {
    res.status(404).json({ error: "Trip log not found" });
    return;
  }
  res.json(log);
});

router.delete("/vehicles/:vehicleId/trip-logs/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = DeleteTripLogParams.safeParse(req.params);
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
  const [log] = await db
    .delete(tripLogsTable)
    .where(and(eq(tripLogsTable.id, params.data.id), eq(tripLogsTable.vehicleId, params.data.vehicleId)))
    .returning();
  if (!log) {
    res.status(404).json({ error: "Trip log not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
