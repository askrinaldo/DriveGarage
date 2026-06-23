import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  clubGarageEntriesTable,
  vehiclesTable,
  serviceRecordsTable,
} from "@workspace/db";
import { requireClubRole } from "../middleware/auth";

const router: IRouter = Router();

router.get("/clubs/:clubId/garage", async (req, res): Promise<void> => {
  const clubId = parseInt(req.params.clubId, 10);
  const {
    type,
    make,
    yearFrom,
    yearTo,
    page = "1",
    pageSize = "12",
  } = req.query as Record<string, string>;

  const pg = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(48, Math.max(1, parseInt(pageSize, 10) || 12));
  const offset = (pg - 1) * ps;

  const entries = await db
    .select({
      entryId: clubGarageEntriesTable.id,
      memberName: clubGarageEntriesTable.memberName,
      addedAt: clubGarageEntriesTable.addedAt,
      vehicleId: vehiclesTable.id,
      make: vehiclesTable.make,
      model: vehiclesTable.model,
      year: vehiclesTable.year,
      type: vehiclesTable.type,
      color: vehiclesTable.color,
      mileage: vehiclesTable.mileage,
      imageUrl: vehiclesTable.imageUrl,
      registrationNumber: vehiclesTable.registrationNumber,
    })
    .from(clubGarageEntriesTable)
    .innerJoin(vehiclesTable, eq(vehiclesTable.id, clubGarageEntriesTable.vehicleId))
    .where(eq(clubGarageEntriesTable.clubId, clubId))
    .orderBy(desc(clubGarageEntriesTable.addedAt));

  let filtered = entries;
  if (type) filtered = filtered.filter((e) => e.type === type);
  if (make) filtered = filtered.filter((e) => e.make.toLowerCase().includes(make.toLowerCase()));
  if (yearFrom) filtered = filtered.filter((e) => e.year >= parseInt(yearFrom, 10));
  if (yearTo) filtered = filtered.filter((e) => e.year <= parseInt(yearTo, 10));

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + ps);

  const vehicleIds = paginated.map((e) => e.vehicleId);
  const serviceStats: Record<number, { lastService: string | null; updateCount: number }> = {};

  for (const vid of vehicleIds) {
    const records = await db
      .select()
      .from(serviceRecordsTable)
      .where(eq(serviceRecordsTable.vehicleId, vid))
      .orderBy(desc(serviceRecordsTable.serviceDate));
    serviceStats[vid] = {
      lastService: records[0]?.serviceDate?.toISOString() ?? null,
      updateCount: records.length,
    };
  }

  const vehicles = paginated.map((e) => ({
    entryId: e.entryId,
    vehicleId: e.vehicleId,
    memberName: e.memberName,
    addedAt: e.addedAt,
    make: e.make,
    model: e.model,
    year: e.year,
    type: e.type,
    color: e.color,
    mileage: e.mileage,
    imageUrl: e.imageUrl,
    registrationNumber: e.registrationNumber,
    lastService: serviceStats[e.vehicleId]?.lastService ?? null,
    updateCount: serviceStats[e.vehicleId]?.updateCount ?? 0,
  }));

  res.json({
    vehicles,
    total,
    page: pg,
    pageSize: ps,
    totalPages: Math.ceil(total / ps),
  });
});

// ─── Protected: add vehicle — requires member+ ────────────────────────────────
// memberName is always derived from the authenticated session — never trusted from the body.
router.post(
  "/clubs/:clubId/garage",
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const clubId = parseInt(String(req.params.clubId), 10);
    const actor = req.auth!;
    const { vehicleId } = req.body as { vehicleId: number };

    if (!vehicleId) {
      res.status(400).json({ error: "vehicleId er påkrevd" });
      return;
    }

    const [vehicle] = await db
      .select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, vehicleId));
    if (!vehicle) {
      res.status(404).json({ error: "Kjøretøy ikke funnet" });
      return;
    }

    const [existing] = await db
      .select()
      .from(clubGarageEntriesTable)
      .where(
        and(
          eq(clubGarageEntriesTable.clubId, clubId),
          eq(clubGarageEntriesTable.vehicleId, vehicleId)
        )
      );
    if (existing) {
      res.status(409).json({ error: "Kjøretøyet er allerede i klubbgarasjen" });
      return;
    }

    const [entry] = await db
      .insert(clubGarageEntriesTable)
      .values({ clubId, vehicleId, memberName: actor.memberName })
      .returning();

    const serviceRecords = await db
      .select()
      .from(serviceRecordsTable)
      .where(eq(serviceRecordsTable.vehicleId, vehicleId))
      .orderBy(desc(serviceRecordsTable.serviceDate));

    res.status(201).json({
      entryId: entry.id,
      vehicleId: vehicle.id,
      memberName: entry.memberName,
      addedAt: entry.addedAt,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      type: vehicle.type,
      color: vehicle.color,
      mileage: vehicle.mileage,
      imageUrl: vehicle.imageUrl,
      registrationNumber: vehicle.registrationNumber,
      lastService: serviceRecords[0]?.serviceDate?.toISOString() ?? null,
      updateCount: serviceRecords.length,
    });
  }
);

// ─── Protected: remove vehicle — requires member+ ─────────────────────────────
// Members can only remove their own entries; admins/owners can remove any entry.
router.delete(
  "/clubs/:clubId/garage/:entryId",
  requireClubRole("member"),
  async (req, res): Promise<void> => {
    const entryId = parseInt(String(req.params.entryId), 10);
    const clubId = parseInt(String(req.params.clubId), 10);
    const actor = req.auth!;

    const [entry] = await db
      .select()
      .from(clubGarageEntriesTable)
      .where(
        and(
          eq(clubGarageEntriesTable.id, entryId),
          eq(clubGarageEntriesTable.clubId, clubId)
        )
      );

    if (!entry) {
      res.status(404).json({ error: "Oppføring ikke funnet" });
      return;
    }

    const isOwner = entry.memberName.toLowerCase() === actor.memberName.toLowerCase();
    const isAdmin = actor.role === "admin" || actor.role === "owner";

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: "Kun eier eller administrator kan fjerne denne oppføringen" });
      return;
    }

    await db
      .delete(clubGarageEntriesTable)
      .where(
        and(
          eq(clubGarageEntriesTable.id, entryId),
          eq(clubGarageEntriesTable.clubId, clubId)
        )
      );
    res.status(204).send();
  }
);

export default router;
