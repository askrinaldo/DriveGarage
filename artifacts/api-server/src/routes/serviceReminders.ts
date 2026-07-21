import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { db, serviceRemindersTable, vehiclesTable } from "@workspace/db";
import { parseUserAuth, requireUser } from "../middleware/userAuth";
import { assertVehicleOwnership } from "../lib/vehicleOwnership";
import { validate } from "../middleware/validate";

const router: IRouter = Router();

const isoDateString = z.string().date();

const CreateReminderSchema = z.object({
  title:           z.string().trim().min(1, "Tittel er påkrevd").max(200),
  description:     z.string().max(1000).nullable().optional(),
  type:            z.enum(["mileage", "date", "both"]).optional(),
  dueMileage:      z.number().int().nonnegative().nullable().optional(),
  dueDate:         isoDateString.nullable().optional(),
  intervalMonths:  z.number().int().nonnegative().nullable().optional(),
  intervalMileage: z.number().int().nonnegative().nullable().optional(),
  notifyBefore:    z.number().int().nonnegative().optional(),
});

const UpdateReminderSchema = z.object({
  title:           z.string().trim().min(1, "Tittel er påkrevd").max(200).optional(),
  description:     z.string().max(1000).nullable().optional(),
  dueMileage:      z.number().int().nonnegative().nullable().optional(),
  dueDate:         isoDateString.nullable().optional(),
  isActive:        z.boolean().optional(),
  intervalMonths:  z.number().int().nonnegative().nullable().optional(),
  intervalMileage: z.number().int().nonnegative().nullable().optional(),
});

const CompleteReminderSchema = z.object({
  mileage: z.number().int().nonnegative().optional(),
});

// ─── Get reminders for a vehicle ─────────────────────────────────────────────
router.get(
  "/vehicles/:vehicleId/reminders",
  parseUserAuth,
  requireUser,
  async (req, res): Promise<void> => {
    const vehicleId = parseInt(String(req.params.vehicleId), 10);
    const { tenantId, userId } = req.userAuth!;

    const owned = await assertVehicleOwnership(vehicleId, tenantId, userId);
    if (!owned) {
      res.status(404).json({ error: "Kjøretøy ikke funnet" });
      return;
    }

    const reminders = await db
      .select()
      .from(serviceRemindersTable)
      .where(eq(serviceRemindersTable.vehicleId, vehicleId))
      .orderBy(desc(serviceRemindersTable.dueDate));

    const [vehicle] = await db
      .select({ mileage: vehiclesTable.mileage })
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, vehicleId));

    const now = new Date();
    const warnDate = new Date();
    warnDate.setDate(warnDate.getDate() + 30);

    const enriched = reminders.map((r) => {
      let status: "ok" | "due_soon" | "overdue" = "ok";

      if (r.dueDate) {
        const due = new Date(r.dueDate);
        if (due < now) status = "overdue";
        else if (due <= warnDate) status = "due_soon";
      }

      if (r.dueMileage && vehicle?.mileage) {
        const milesLeft = r.dueMileage - vehicle.mileage;
        if (milesLeft <= 0) status = "overdue";
        else if (milesLeft <= 1000 && status === "ok") status = "due_soon";
      }

      return { ...r, status };
    });

    res.json(enriched);
  }
);

// ─── Create reminder ──────────────────────────────────────────────────────────
router.post(
  "/vehicles/:vehicleId/reminders",
  parseUserAuth,
  requireUser,
  validate(CreateReminderSchema),
  async (req, res): Promise<void> => {
    const vehicleId = parseInt(String(req.params.vehicleId), 10);
    const { tenantId, userId } = req.userAuth!;

    const owned = await assertVehicleOwnership(vehicleId, tenantId, userId);
    if (!owned) {
      res.status(404).json({ error: "Kjøretøy ikke funnet" });
      return;
    }

    const body = req.body as z.infer<typeof CreateReminderSchema>;

    const [reminder] = await db
      .insert(serviceRemindersTable)
      .values({
        vehicleId,
        title:           body.title.trim(),
        description:     body.description?.trim() ?? null,
        type:            body.type ?? "date",
        dueMileage:      body.dueMileage ?? null,
        dueDate:         body.dueDate ? new Date(body.dueDate) : null,
        intervalMonths:  body.intervalMonths ?? null,
        intervalMileage: body.intervalMileage ?? null,
        notifyBefore:    body.notifyBefore ?? 30,
      })
      .returning();

    res.status(201).json(reminder);
  }
);

// ─── Update reminder ──────────────────────────────────────────────────────────
router.patch(
  "/vehicles/:vehicleId/reminders/:reminderId",
  parseUserAuth,
  requireUser,
  validate(UpdateReminderSchema),
  async (req, res): Promise<void> => {
    const vehicleId = parseInt(String(req.params.vehicleId), 10);
    const reminderId = parseInt(String(req.params.reminderId), 10);
    const { tenantId, userId } = req.userAuth!;

    const owned = await assertVehicleOwnership(vehicleId, tenantId, userId);
    if (!owned) {
      res.status(404).json({ error: "Kjøretøy ikke funnet" });
      return;
    }

    const [existing] = await db
      .select()
      .from(serviceRemindersTable)
      .where(
        and(
          eq(serviceRemindersTable.id, reminderId),
          eq(serviceRemindersTable.vehicleId, vehicleId)
        )
      );

    if (!existing) { res.status(404).json({ error: "Påminnelse ikke funnet" }); return; }

    const body = req.body as z.infer<typeof UpdateReminderSchema>;

    const [updated] = await db
      .update(serviceRemindersTable)
      .set({
        title:           body.title?.trim() ?? existing.title,
        description:     body.description !== undefined ? (body.description?.trim() ?? null) : existing.description,
        dueMileage:      body.dueMileage !== undefined ? (body.dueMileage ?? null) : existing.dueMileage,
        dueDate:         body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : existing.dueDate,
        isActive:        body.isActive !== undefined ? body.isActive : existing.isActive,
        intervalMonths:  body.intervalMonths !== undefined ? (body.intervalMonths ?? null) : existing.intervalMonths,
        intervalMileage: body.intervalMileage !== undefined ? (body.intervalMileage ?? null) : existing.intervalMileage,
        updatedAt:       new Date(),
      })
      .where(eq(serviceRemindersTable.id, reminderId))
      .returning();

    res.json(updated);
  }
);

// ─── Mark reminder complete ───────────────────────────────────────────────────
router.post(
  "/vehicles/:vehicleId/reminders/:reminderId/complete",
  parseUserAuth,
  requireUser,
  validate(CompleteReminderSchema),
  async (req, res): Promise<void> => {
    const vehicleId = parseInt(String(req.params.vehicleId), 10);
    const reminderId = parseInt(String(req.params.reminderId), 10);
    const { tenantId, userId } = req.userAuth!;

    const owned = await assertVehicleOwnership(vehicleId, tenantId, userId);
    if (!owned) {
      res.status(404).json({ error: "Kjøretøy ikke funnet" });
      return;
    }

    const body = req.body as z.infer<typeof CompleteReminderSchema>;

    const [existing] = await db
      .select()
      .from(serviceRemindersTable)
      .where(
        and(
          eq(serviceRemindersTable.id, reminderId),
          eq(serviceRemindersTable.vehicleId, vehicleId)
        )
      );

    if (!existing) { res.status(404).json({ error: "Påminnelse ikke funnet" }); return; }

    const now = new Date();

    let nextDueDate: Date | null = null;
    if (existing.intervalMonths && existing.intervalMonths > 0) {
      nextDueDate = new Date(now);
      nextDueDate.setMonth(nextDueDate.getMonth() + existing.intervalMonths);
    }

    const nextDueMileage =
      existing.intervalMileage && body.mileage
        ? body.mileage + existing.intervalMileage
        : existing.dueMileage;

    const [updated] = await db
      .update(serviceRemindersTable)
      .set({
        lastCompleted:        now,
        lastCompletedMileage: body.mileage ?? null,
        dueDate:              nextDueDate ?? existing.dueDate,
        dueMileage:           nextDueMileage ?? null,
        updatedAt:            now,
      })
      .where(eq(serviceRemindersTable.id, reminderId))
      .returning();

    res.json(updated);
  }
);

// ─── Delete reminder ──────────────────────────────────────────────────────────
router.delete(
  "/vehicles/:vehicleId/reminders/:reminderId",
  parseUserAuth,
  requireUser,
  async (req, res): Promise<void> => {
    const vehicleId = parseInt(String(req.params.vehicleId), 10);
    const reminderId = parseInt(String(req.params.reminderId), 10);
    const { tenantId, userId } = req.userAuth!;

    const owned = await assertVehicleOwnership(vehicleId, tenantId, userId);
    if (!owned) {
      res.status(404).json({ error: "Kjøretøy ikke funnet" });
      return;
    }

    await db
      .delete(serviceRemindersTable)
      .where(
        and(
          eq(serviceRemindersTable.id, reminderId),
          eq(serviceRemindersTable.vehicleId, vehicleId)
        )
      );
    res.json({ ok: true });
  }
);

export default router;
