import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod/v4";
import { db, vehiclesTable, vehicleTransfersTable, vehicleOwnershipHistoryTable, usersTable } from "@workspace/db";
import { parseUserAuth, requireUser, requireSuperAdmin } from "../middleware/userAuth";
import { validate } from "../middleware/validate";
import { randomBytes } from "crypto";

const router: IRouter = Router();

// ─── Schemas ───────────────────────────────────────────────────────────────
const createTransferSchema = z.object({
  toEmail: z.email("Ugyldig e-postadresse for mottaker"),
});

function generateCode(): string {
  return randomBytes(4).toString("hex").toUpperCase(); // e.g. "A1B2C3D4"
}

function generateToken(): string {
  return randomBytes(20).toString("hex"); // 40-char URL-safe token
}

function expiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7); // 7-day expiry
  return d;
}

// ─── Create transfer ──────────────────────────────────────────────────────────
router.post("/vehicles/:vehicleId/transfer", parseUserAuth, requireUser, validate(createTransferSchema), async (req, res): Promise<void> => {
  const vehicleId = parseInt(String(req.params.vehicleId), 10);
  const { toEmail } = req.body as z.infer<typeof createTransferSchema>;

  if (toEmail.toLowerCase() === req.userAuth!.email.toLowerCase()) {
    res.status(400).json({ error: "Du kan ikke overføre til deg selv" });
    return;
  }

  const [vehicle] = await db
    .select()
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, req.userAuth!.userId)));

  if (!vehicle) {
    res.status(404).json({ error: "Kjøretøy ikke funnet eller du eier det ikke" });
    return;
  }

  // Cancel any existing pending transfer for this vehicle
  await db
    .update(vehicleTransfersTable)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(and(
      eq(vehicleTransfersTable.vehicleId, vehicleId),
      eq(vehicleTransfersTable.status, "pending")
    ));

  const [transfer] = await db
    .insert(vehicleTransfersTable)
    .values({
      vehicleId,
      fromUserId: req.userAuth!.userId,
      fromUserName: req.userAuth!.name,
      fromUserEmail: req.userAuth!.email,
      toEmail: toEmail.trim().toLowerCase(),
      transferCode: generateCode(),
      transferToken: generateToken(),
      expiresAt: expiresAt(),
    })
    .returning();

  res.status(201).json(transfer);
});

// ─── Get transfer by token (public — for accept page) ─────────────────────────
router.get("/vehicle-transfer/:token", async (req, res): Promise<void> => {
  const [transfer] = await db
    .select()
    .from(vehicleTransfersTable)
    .where(eq(vehicleTransfersTable.transferToken, String(req.params.token)));

  if (!transfer) {
    res.status(404).json({ error: "Overføringen ble ikke funnet" });
    return;
  }

  if (transfer.status !== "pending") {
    res.status(410).json({ error: "Overføringen er allerede brukt, avbrutt eller utløpt", status: transfer.status });
    return;
  }

  if (new Date() > transfer.expiresAt) {
    await db.update(vehicleTransfersTable).set({ status: "expired" }).where(eq(vehicleTransfersTable.id, transfer.id));
    res.status(410).json({ error: "Overføringskoden har utløpt", status: "expired" });
    return;
  }

  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, transfer.vehicleId));

  res.json({ transfer, vehicle });
});

// ─── Get transfer by code (public — for code-based entry) ─────────────────────
router.get("/vehicle-transfer/code/:code", async (req, res): Promise<void> => {
  const [transfer] = await db
    .select()
    .from(vehicleTransfersTable)
    .where(eq(vehicleTransfersTable.transferCode, req.params.code.toUpperCase()));

  if (!transfer) {
    res.status(404).json({ error: "Ugyldig overføringskode" });
    return;
  }

  if (transfer.status !== "pending" || new Date() > transfer.expiresAt) {
    res.status(410).json({ error: "Koden er ikke lenger gyldig", status: transfer.status });
    return;
  }

  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, transfer.vehicleId));

  res.json({ transfer, vehicle });
});

// ─── Accept transfer ──────────────────────────────────────────────────────────
router.post("/vehicle-transfer/:token/accept", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const [transfer] = await db
    .select()
    .from(vehicleTransfersTable)
    .where(eq(vehicleTransfersTable.transferToken, String(req.params.token)));

  if (!transfer || transfer.status !== "pending") {
    res.status(410).json({ error: "Overføringen er ikke tilgjengelig" });
    return;
  }

  if (new Date() > transfer.expiresAt) {
    await db.update(vehicleTransfersTable).set({ status: "expired" }).where(eq(vehicleTransfersTable.id, transfer.id));
    res.status(410).json({ error: "Overføringskoden har utløpt" });
    return;
  }

  const userId = req.userAuth!.userId;

  // Close previous owner's history entry or create one if missing
  const now = new Date();
  const [fromUser] = await db.select().from(usersTable).where(eq(usersTable.id, transfer.fromUserId));
  const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, transfer.vehicleId));

  const existingHistory = await db
    .select()
    .from(vehicleOwnershipHistoryTable)
    .where(and(
      eq(vehicleOwnershipHistoryTable.vehicleId, transfer.vehicleId),
      sql`${vehicleOwnershipHistoryTable.userId} = ${transfer.fromUserId}`
    ));

  if (existingHistory.length === 0 && fromUser && vehicle) {
    await db.insert(vehicleOwnershipHistoryTable).values({
      vehicleId: transfer.vehicleId,
      userId: transfer.fromUserId,
      userName: fromUser.name,
      userEmail: fromUser.email,
      fromDate: vehicle.createdAt,
      toDate: now,
      consentToShow: true,
      transferId: transfer.id,
    });
  } else {
    await db
      .update(vehicleOwnershipHistoryTable)
      .set({ toDate: now })
      .where(and(
        eq(vehicleOwnershipHistoryTable.vehicleId, transfer.vehicleId),
        sql`${vehicleOwnershipHistoryTable.userId} = ${transfer.fromUserId}`
      ));
  }

  // Add new owner history entry
  const newUser = req.userAuth!;
  await db.insert(vehicleOwnershipHistoryTable).values({
    vehicleId: transfer.vehicleId,
    userId,
    userName: newUser.name,
    userEmail: newUser.email,
    fromDate: now,
    consentToShow: true,
    transferId: transfer.id,
  });

  // Transfer vehicle to new owner
  await db
    .update(vehiclesTable)
    .set({ userId })
    .where(eq(vehiclesTable.id, transfer.vehicleId));

  // Mark transfer as accepted
  await db
    .update(vehicleTransfersTable)
    .set({ status: "accepted", acceptedAt: now, toUserId: userId, toUserName: newUser.name })
    .where(eq(vehicleTransfersTable.id, transfer.id));

  res.json({ ok: true, vehicleId: transfer.vehicleId });
});

// ─── Cancel transfer (by vehicle owner) ───────────────────────────────────────
router.delete("/vehicles/:vehicleId/transfer", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const vehicleId = parseInt(String(req.params.vehicleId), 10);

  const [vehicle] = await db
    .select()
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, req.userAuth!.userId)));

  if (!vehicle) {
    res.status(404).json({ error: "Kjøretøy ikke funnet eller du eier det ikke" });
    return;
  }

  const result = await db
    .update(vehicleTransfersTable)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(and(
      eq(vehicleTransfersTable.vehicleId, vehicleId),
      eq(vehicleTransfersTable.status, "pending")
    ))
    .returning();

  if (result.length === 0) {
    res.status(404).json({ error: "Ingen aktiv overføring funnet" });
    return;
  }

  res.json({ ok: true });
});

// ─── Get pending transfer for vehicle ─────────────────────────────────────────
router.get("/vehicles/:vehicleId/transfer", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const vehicleId = parseInt(String(req.params.vehicleId), 10);

  const [vehicle] = await db
    .select()
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, req.userAuth!.userId)));

  if (!vehicle) {
    res.status(404).json({ error: "Kjøretøy ikke funnet" });
    return;
  }

  const [transfer] = await db
    .select()
    .from(vehicleTransfersTable)
    .where(and(
      eq(vehicleTransfersTable.vehicleId, vehicleId),
      eq(vehicleTransfersTable.status, "pending")
    ));

  res.json(transfer ?? null);
});

// ─── Get ownership history for vehicle ────────────────────────────────────────
router.get("/vehicles/:vehicleId/ownership-history", async (req, res): Promise<void> => {
  const vehicleId = parseInt(String(req.params.vehicleId), 10);

  const history = await db
    .select()
    .from(vehicleOwnershipHistoryTable)
    .where(eq(vehicleOwnershipHistoryTable.vehicleId, vehicleId))
    .orderBy(desc(vehicleOwnershipHistoryTable.fromDate));

  res.json(history);
});

// ─── Admin: list all transfers ─────────────────────────────────────────────────
router.get("/admin/transfers", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const transfers = await db
    .select()
    .from(vehicleTransfersTable)
    .orderBy(desc(vehicleTransfersTable.createdAt));

  res.json(transfers);
});

// ─── Admin: cancel any transfer ────────────────────────────────────────────────
router.delete("/admin/transfers/:id", parseUserAuth, requireSuperAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);

  const [result] = await db
    .update(vehicleTransfersTable)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(and(eq(vehicleTransfersTable.id, id), eq(vehicleTransfersTable.status, "pending")))
    .returning();

  if (!result) {
    res.status(404).json({ error: "Overføring ikke funnet eller er ikke aktiv" });
    return;
  }

  res.json({ ok: true });
});

export default router;
