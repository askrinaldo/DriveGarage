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
import { FAIR_USE_LIMITS } from "../lib/subscription";
import { ERRORS, AppError } from "../lib/errors";

const router: IRouter = Router();

function ownershipClause(tenantId: number | null | undefined, userId: number) {
  if (tenantId) return eq(vehiclesTable.tenantId, tenantId);
  return eq(vehiclesTable.userId, userId);
}

router.get("/vehicles", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const { tenantId, userId } = req.userAuth!;
  const vehicles = await db
    .select()
    .from(vehiclesTable)
    .where(ownershipClause(tenantId, userId))
    .orderBy(vehiclesTable.createdAt);
  res.json(vehicles);
});

router.post("/vehicles", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const parsed = CreateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, ERRORS.VALIDATION_ERROR);
  }

  const { userId, tenantId } = req.userAuth!;

  const [{ vehicleCount }] = await db
    .select({ vehicleCount: count() })
    .from(vehiclesTable)
    .where(ownershipClause(tenantId, userId));

  if (vehicleCount >= FAIR_USE_LIMITS.vehicles) {
    throw new AppError(
      403,
      `Du har nådd maks ${FAIR_USE_LIMITS.vehicles} kjøretøy. Slett et kjøretøy for å legge til et nytt.`,
      {
        code:    "FAIR_USE_LIMIT",
        feature: "vehicles",
        limit:   FAIR_USE_LIMITS.vehicles,
        upgradeUrl: "/billing",
      },
    );
  }

  const [vehicle] = await db
    .insert(vehiclesTable)
    .values({ ...parsed.data, userId, tenantId: tenantId ?? null })
    .returning();
  res.status(201).json(vehicle);
});

router.get("/vehicles/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = GetVehicleParams.safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, ERRORS.VALIDATION_ERROR);
  }
  const { tenantId, userId } = req.userAuth!;
  const [vehicle] = await db
    .select()
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, params.data.id), ownershipClause(tenantId, userId)));
  if (!vehicle) {
    throw new AppError(404, "Kjøretøy ikke funnet");
  }
  res.json(vehicle);
});

router.get("/vehicles/:id/export", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = ExportVehicleDataParams.safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, ERRORS.VALIDATION_ERROR);
  }
  const { tenantId, userId } = req.userAuth!;
  const [vehicle] = await db
    .select()
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, params.data.id), ownershipClause(tenantId, userId)));
  if (!vehicle) {
    throw new AppError(404, "Kjøretøy ikke funnet");
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

router.patch("/vehicles/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = UpdateVehicleParams.safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, ERRORS.VALIDATION_ERROR);
  }
  const parsed = UpdateVehicleBody.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, ERRORS.VALIDATION_ERROR);
  }
  const { tenantId, userId } = req.userAuth!;
  const [vehicle] = await db
    .update(vehiclesTable)
    .set(parsed.data)
    .where(and(eq(vehiclesTable.id, params.data.id), ownershipClause(tenantId, userId)))
    .returning();
  if (!vehicle) {
    throw new AppError(404, "Kjøretøy ikke funnet");
  }
  res.json(vehicle);
});

router.delete("/vehicles/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = DeleteVehicleParams.safeParse(req.params);
  if (!params.success) {
    throw new AppError(400, ERRORS.VALIDATION_ERROR);
  }
  const { tenantId, userId } = req.userAuth!;
  const [vehicle] = await db
    .delete(vehiclesTable)
    .where(and(eq(vehiclesTable.id, params.data.id), ownershipClause(tenantId, userId)))
    .returning();
  if (!vehicle) {
    throw new AppError(404, "Kjøretøy ikke funnet");
  }
  res.sendStatus(204);
});

export default router;
