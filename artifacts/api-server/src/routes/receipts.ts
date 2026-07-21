import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, receiptsTable } from "@workspace/db";
import {
  CreateReceiptBody,
  CreateReceiptParams,
  ListReceiptsParams,
  DeleteReceiptParams,
} from "@workspace/api-zod";
import { parseUserAuth, requireUser } from "../middleware/userAuth";
import { assertVehicleOwnership } from "../lib/vehicleOwnership";
import { ERRORS } from "../lib/errors";

const router: IRouter = Router();

router.get("/vehicles/:vehicleId/receipts", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = ListReceiptsParams.safeParse(req.params);
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
  const items = await db
    .select()
    .from(receiptsTable)
    .where(eq(receiptsTable.vehicleId, params.data.vehicleId))
    .orderBy(receiptsTable.receiptDate);
  res.json(items);
});

router.post("/vehicles/:vehicleId/receipts", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = CreateReceiptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: ERRORS.VALIDATION_ERROR });
    return;
  }
  const parsed = CreateReceiptBody.safeParse(req.body);
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
  const [receipt] = await db
    .insert(receiptsTable)
    .values({
      ...parsed.data,
      vehicleId: params.data.vehicleId,
      amount: parsed.data.amount != null ? String(parsed.data.amount) : null,
    })
    .returning();
  res.status(201).json(receipt);
});

router.delete("/vehicles/:vehicleId/receipts/:id", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const params = DeleteReceiptParams.safeParse(req.params);
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
  const [receipt] = await db
    .delete(receiptsTable)
    .where(and(eq(receiptsTable.id, params.data.id), eq(receiptsTable.vehicleId, params.data.vehicleId)))
    .returning();
  if (!receipt) {
    res.status(404).json({ error: "Kvittering ikke funnet" });
    return;
  }
  res.sendStatus(204);
});

export default router;
