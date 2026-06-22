import { Router, type IRouter } from "express";
import { db, vehiclesTable, serviceRecordsTable, tripLogsTable } from "@workspace/db";
import { sql, desc, eq, and, inArray } from "drizzle-orm";
import { parseUserAuth, requireUser } from "../middleware/userAuth";

const router: IRouter = Router();

function ownershipClause(tenantId: number | null | undefined, userId: number) {
  if (tenantId) return eq(vehiclesTable.tenantId, tenantId);
  return eq(vehiclesTable.userId, userId);
}

router.get("/stats/dashboard", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const { tenantId, userId } = req.userAuth!;

  const [vehicleStats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vehiclesTable)
    .where(ownershipClause(tenantId, userId));

  const userVehicleIds = await db
    .select({ id: vehiclesTable.id })
    .from(vehiclesTable)
    .where(ownershipClause(tenantId, userId));

  const vehicleIdList = userVehicleIds.map((v) => v.id);

  if (vehicleIdList.length === 0) {
    res.json({
      totalVehicles: 0,
      totalServiceRecords: 0,
      totalSpent: 0,
      vehiclesWithFinnUrl: 0,
      totalTripKm: 0,
      servicesByCategory: [],
    });
    return;
  }

  const [serviceStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalSpent: sql<number>`coalesce(sum(cost::numeric), 0)::float`,
    })
    .from(serviceRecordsTable)
    .where(inArray(serviceRecordsTable.vehicleId, vehicleIdList));

  const [vehiclesWithFinn] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vehiclesTable)
    .where(
      and(
        ownershipClause(tenantId, userId),
        sql`finn_url is not null and finn_url != ''`,
      ),
    );

  const [tripStats] = await db
    .select({
      totalTripKm: sql<number>`coalesce(sum(distance_km::numeric), 0)::float`,
    })
    .from(tripLogsTable)
    .where(inArray(tripLogsTable.vehicleId, vehicleIdList));

  const categoryRows = await db
    .select({
      category: serviceRecordsTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(serviceRecordsTable)
    .where(inArray(serviceRecordsTable.vehicleId, vehicleIdList))
    .groupBy(serviceRecordsTable.category);

  res.json({
    totalVehicles: vehicleStats?.count ?? 0,
    totalServiceRecords: serviceStats?.count ?? 0,
    totalSpent: serviceStats?.totalSpent ?? 0,
    vehiclesWithFinnUrl: vehiclesWithFinn?.count ?? 0,
    totalTripKm: tripStats?.totalTripKm ?? 0,
    servicesByCategory: categoryRows,
  });
});

router.get("/stats/recent-activity", parseUserAuth, requireUser, async (req, res): Promise<void> => {
  const { tenantId, userId } = req.userAuth!;

  const userVehicleIds = await db
    .select({ id: vehiclesTable.id })
    .from(vehiclesTable)
    .where(ownershipClause(tenantId, userId));

  const vehicleIdList = userVehicleIds.map((v) => v.id);

  if (vehicleIdList.length === 0) {
    res.json([]);
    return;
  }

  const rows = await db
    .select({
      id: serviceRecordsTable.id,
      vehicleId: serviceRecordsTable.vehicleId,
      vehicleName: sql<string>`concat(vehicles.make, ' ', vehicles.model, ' (', vehicles.year, ')')`,
      title: serviceRecordsTable.title,
      category: serviceRecordsTable.category,
      serviceDate: serviceRecordsTable.serviceDate,
      cost: serviceRecordsTable.cost,
    })
    .from(serviceRecordsTable)
    .leftJoin(vehiclesTable, sql`vehicles.id = service_records.vehicle_id`)
    .where(inArray(serviceRecordsTable.vehicleId, vehicleIdList))
    .orderBy(desc(serviceRecordsTable.serviceDate))
    .limit(10);

  res.json(rows);
});

export default router;
