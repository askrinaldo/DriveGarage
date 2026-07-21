import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";
import { db, tripLogsTable } from "@workspace/db";
import {
  CreateTripLogParams,
  ListTripLogsParams,
  GetTripLogParams,
  UpdateTripLogParams,
  DeleteTripLogParams,
} from "@workspace/api-zod";
import { parseUserAuth, requireUser } from "../middleware/userAuth";
import { assertVehicleOwnership } from "../lib/vehicleOwnership";
import { validate } from "../middleware/validate";
import { ERRORS } from "../lib/errors";

const router: IRouter = Router();

// Local zod/v4 body schemas — structurally equivalent to the generated api-zod
// Zod-v3 schemas, but compatible with the validate() middleware (zod/v4 only).

const CreateTripLogBodySchema = z.object({
  tripDate:       z.coerce.date(),
  fromLocation:   z.string().min(1, "Fra-sted er påkrevd"),
  toLocation:     z.string().min(1, "Til-sted er påkrevd"),
  distanceKm:     z.number().nullable().optional(),
  mileageStart:   z.number().int().nullable().optional(),
  mileageEnd:     z.number().int().nullable().optional(),
  fuelUsedLiters: z.number().nullable().optional(),
  notes:          z.string().nullable().optional(),
  weather:        z.string().nullable().optional(),
});

const UpdateTripLogBodySchema = z.object({
  tripDate:       z.coerce.date().optional(),
  fromLocation:   z.string().min(1).optional(),
  toLocation:     z.string().min(1).optional(),
  distanceKm:     z.number().nullable().optional(),
  mileageStart:   z.number().int().nullable().optional(),
  mileageEnd:     z.number().int().nullable().optional(),
  fuelUsedLiters: z.number().nullable().optional(),
  notes:          z.string().nullable().optional(),
  weather:        z.string().nullable().optional(),
});

router.get("/vehicles/:vehicleId/trip-logs", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = ListTripLogsParams.safeParse(req.params);
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
  const logs = await db
    .select()
    .from(tripLogsTable)
    .where(eq(tripLogsTable.vehicleId, params.data.vehicleId))
    .orderBy(tripLogsTable.tripDate);
  res.json(logs);
});

router.post("/vehicles/:vehicleId/trip-logs", parseUserAuth, requireUser, validate(CreateTripLogBodySchema), async (req, res): Promise<void> => {
  const params = CreateTripLogParams.safeParse(req.params);
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
  const body = req.body as z.infer<typeof CreateTripLogBodySchema>;
  const [log] = await db
    .insert(tripLogsTable)
    .values({
      ...body,
      vehicleId:      params.data.vehicleId,
      distanceKm:     body.distanceKm != null ? String(body.distanceKm) : null,
      fuelUsedLiters: body.fuelUsedLiters != null ? String(body.fuelUsedLiters) : null,
    })
    .returning();
  res.status(201).json(log);
});

router.get("/vehicles/:vehicleId/trip-logs/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = GetTripLogParams.safeParse(req.params);
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
  const [log] = await db
    .select()
    .from(tripLogsTable)
    .where(and(eq(tripLogsTable.id, params.data.id), eq(tripLogsTable.vehicleId, params.data.vehicleId)));
  if (!log) {
    res.status(404).json({ error: "Turlogg ikke funnet" });
    return;
  }
  res.json(log);
});

router.patch("/vehicles/:vehicleId/trip-logs/:id", parseUserAuth, requireUser, validate(UpdateTripLogBodySchema), async (req, res): Promise<void> => {
  const params = UpdateTripLogParams.safeParse(req.params);
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
  const body = req.body as z.infer<typeof UpdateTripLogBodySchema>;
  const [log] = await db
    .update(tripLogsTable)
    .set({
      ...body,
      distanceKm:     body.distanceKm != null ? String(body.distanceKm) : null,
      fuelUsedLiters: body.fuelUsedLiters != null ? String(body.fuelUsedLiters) : null,
    })
    .where(and(eq(tripLogsTable.id, params.data.id), eq(tripLogsTable.vehicleId, params.data.vehicleId)))
    .returning();
  if (!log) {
    res.status(404).json({ error: "Turlogg ikke funnet" });
    return;
  }
  res.json(log);
});

router.delete("/vehicles/:vehicleId/trip-logs/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = DeleteTripLogParams.safeParse(req.params);
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
  const [log] = await db
    .delete(tripLogsTable)
    .where(and(eq(tripLogsTable.id, params.data.id), eq(tripLogsTable.vehicleId, params.data.vehicleId)))
    .returning();
  if (!log) {
    res.status(404).json({ error: "Turlogg ikke funnet" });
    return;
  }
  res.sendStatus(204);
});

export default router;
