import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, serviceRemindersTable, vehiclesTable } from "@workspace/db";
import { parseUserAuth, requireUser } from "../middleware/userAuth";
import { assertVehicleOwnership } from "../lib/vehicleOwnership";

const router: IRouter = Router();

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
  async (req, res): Promise<void> => {
    const vehicleId = parseInt(String(req.params.vehicleId), 10);
    const { tenantId, userId } = req.userAuth!;

    const owned = await assertVehicleOwnership(vehicleId, tenantId, userId);
    if (!owned) {
      res.status(404).json({ error: "Kjøretøy ikke funnet" });
      return;
    }

    const {
      title, description, type, dueMileage, dueDate,
      intervalMonths, intervalMileage, notifyBefore,
    } = req.body as {
      title: string;
      description?: string;
      type?: "mileage" | "date" | "both";
      dueMileage?: number;
      dueDate?: string;
      intervalMonths?: number;
      intervalMileage?: number;
      notifyBefore?: number;
    };

    if (!title?.trim()) {
      res.status(400).json({ error: "Tittel er påkrevd" });
      return;
    }

    const [reminder] = await db
      .insert(serviceRemindersTable)
      .values({
        vehicleId,
        title: title.trim(),
        description: description?.trim() ?? null,
        type: type ?? "date",
        dueMileage: dueMileage ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        intervalMonths: intervalMonths ?? null,
        intervalMileage: intervalMileage ?? null,
        notifyBefore: notifyBefore ?? 30,
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

    const { title, description, dueMileage, dueDate, isActive, intervalMonths, intervalMileage } =
      req.body as Partial<{
        title: string;
        description: string;
        dueMileage: number;
        dueDate: string;
        isActive: boolean;
        intervalMonths: number;
        intervalMileage: number;
      }>;

    const [updated] = await db
      .update(serviceRemindersTable)
      .set({
        title: title?.trim() ?? existing.title,
        description: description !== undefined ? description?.trim() ?? null : existing.description,
        dueMileage: dueMileage ?? existing.dueMileage,
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        isActive: isActive !== undefined ? isActive : existing.isActive,
        intervalMonths: intervalMonths ?? existing.intervalMonths,
        intervalMileage: intervalMileage ?? existing.intervalMileage,
        updatedAt: new Date(),
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
  async (req, res): Promise<void> => {
    const vehicleId = parseInt(String(req.params.vehicleId), 10);
    const reminderId = parseInt(String(req.params.reminderId), 10);
    const { tenantId, userId } = req.userAuth!;

    const owned = await assertVehicleOwnership(vehicleId, tenantId, userId);
    if (!owned) {
      res.status(404).json({ error: "Kjøretøy ikke funnet" });
      return;
    }

    const { mileage } = req.body as { mileage?: number };

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
      existing.intervalMileage && mileage
        ? mileage + existing.intervalMileage
        : existing.dueMileage;

    const [updated] = await db
      .update(serviceRemindersTable)
      .set({
        lastCompleted: now,
        lastCompletedMileage: mileage ?? null,
        dueDate: nextDueDate ?? existing.dueDate,
        dueMileage: nextDueMileage ?? null,
        updatedAt: now,
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
