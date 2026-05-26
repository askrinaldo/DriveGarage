import { Router, type IRouter } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  db,
  clubGarageEntriesTable,
  vehiclesTable,
  serviceRecordsTable,
  clubMembersTable,
} from "@workspace/db";

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

  // Get all entries for this club joined with vehicles
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

  // Apply filters
  let filtered = entries;
  if (type) filtered = filtered.filter((e) => e.type === type);
  if (make) filtered = filtered.filter((e) => e.make.toLowerCase().includes(make.toLowerCase()));
  if (yearFrom) filtered = filtered.filter((e) => e.year >= parseInt(yearFrom, 10));
  if (yearTo) filtered = filtered.filter((e) => e.year <= parseInt(yearTo, 10));

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + ps);

  // Enrich with service stats
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

router.post("/clubs/:clubId/garage", async (req, res): Promise<void> => {
  const clubId = parseInt(req.params.clubId, 10);
  const { vehicleId, memberName } = req.body as { vehicleId: number; memberName: string };

  if (!vehicleId || !memberName?.trim()) {
    res.status(400).json({ error: "vehicleId og memberName er påkrevd" });
    return;
  }

  // Check membership
  const members = await db
    .select()
    .from(clubMembersTable)
    .where(eq(clubMembersTable.clubId, clubId));
  const isMember = members.some(
    (m) => m.memberName.toLowerCase() === memberName.trim().toLowerCase()
  );
  if (!isMember) {
    res.status(403).json({ error: "Kun klubbmedlemmer kan legge til kjøretøy" });
    return;
  }

  // Check vehicle exists
  const [vehicle] = await db
    .select()
    .from(vehiclesTable)
    .where(eq(vehiclesTable.id, vehicleId));
  if (!vehicle) {
    res.status(404).json({ error: "Kjøretøy ikke funnet" });
    return;
  }

  // Check not already added
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
    .values({ clubId, vehicleId, memberName: memberName.trim() })
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
});

router.delete("/clubs/:clubId/garage/:entryId", async (req, res): Promise<void> => {
  const entryId = parseInt(req.params.entryId, 10);
  const clubId = parseInt(req.params.clubId, 10);
  await db
    .delete(clubGarageEntriesTable)
    .where(
      and(
        eq(clubGarageEntriesTable.id, entryId),
        eq(clubGarageEntriesTable.clubId, clubId)
      )
    );
  res.status(204).send();
});

export default router;
