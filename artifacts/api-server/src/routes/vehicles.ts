import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, vehiclesTable, serviceRecordsTable, receiptsTable, tripLogsTable } from "@workspace/db";
import {
  CreateVehicleBody,
  UpdateVehicleBody,
  GetVehicleParams,
  UpdateVehicleParams,
  DeleteVehicleParams,
  ExportVehicleDataParams,
} from "@workspace/api-zod";
import { sql, count } from "drizzle-orm";
import { parseUserAuth, requireUser } from "../middleware/userAuth";
import { getUserTier } from "../lib/subscriptionTier";

const router: IRouter = Router();

router.get("/vehicles", async (_req, res): Promise<void> => {
  const vehicles = await db
    .select()
    .from(vehiclesTable)
    .orderBy(vehiclesTable.createdAt);
  res.json(vehicles);
});

router.post("/vehicles", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const parsed = CreateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.userAuth!.userId;
  const tier = await getUserTier(userId);

  if (tier === "free") {
    const [{ value: vehicleCount }] = await db
      .select({ value: count() })
      .from(vehiclesTable)
      .where(eq(vehiclesTable.userId, userId));

    if (vehicleCount >= 1) {
      res.status(403).json({
        error: "Gratis-planen er begrenset til 1 kjøretøy. Oppgrader til Standard for ubegrenset antall.",
        code: "SUBSCRIPTION_LIMIT",
        upgradeUrl: "/billing",
      });
      return;
    }
  }

  const [vehicle] = await db.insert(vehiclesTable).values({ ...parsed.data, userId }).returning();
  res.status(201).json(vehicle);
});

router.get("/vehicles/:id", async (req, res): Promise<void> => {
  const params = GetVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, params.data.id));
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json(vehicle);
});

router.get("/vehicles/:id/export", async (req, res): Promise<void> => {
  const params = ExportVehicleDataParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, params.data.id));
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }

  const [serviceRecords, receipts, tripLogs] = await Promise.all([
    db.select().from(serviceRecordsTable).where(eq(serviceRecordsTable.vehicleId, params.data.id)),
    db.select().from(receiptsTable).where(eq(receiptsTable.vehicleId, params.data.id)),
    db.select().from(tripLogsTable).where(eq(tripLogsTable.vehicleId, params.data.id)),
  ]);

  const totalServiceCost = serviceRecords.reduce((sum, r) => sum + parseFloat(r.cost ?? "0"), 0);
  const totalTripKm = tripLogs.reduce((sum, t) => sum + parseFloat(t.distanceKm ?? "0"), 0);

  res.json({
    vehicle,
    serviceRecords,
    receipts,
    tripLogs,
    exportedAt: new Date().toISOString(),
    totalServiceCost,
    totalTripKm,
  });
});

router.patch("/vehicles/:id", async (req, res): Promise<void> => {
  const params = UpdateVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [vehicle] = await db
    .update(vehiclesTable)
    .set(parsed.data)
    .where(eq(vehiclesTable.id, params.data.id))
    .returning();
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.json(vehicle);
});

router.delete("/vehicles/:id", async (req, res): Promise<void> => {
  const params = DeleteVehicleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [vehicle] = await db.delete(vehiclesTable).where(eq(vehiclesTable.id, params.data.id)).returning();
  if (!vehicle) {
    res.status(404).json({ error: "Vehicle not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
