import { Router, type IRouter } from "express";
import { db, vehiclesTable, serviceRecordsTable } from "@workspace/db";
import { sql, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats/dashboard", async (_req, res): Promise<void> => {
  const [vehicleStats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vehiclesTable);

  const [serviceStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalSpent: sql<number>`coalesce(sum(cost::numeric), 0)::float`,
    })
    .from(serviceRecordsTable);

  const [vehiclesWithFinn] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(vehiclesTable)
    .where(sql`finn_url is not null and finn_url != ''`);

  const categoryRows = await db
    .select({
      category: serviceRecordsTable.category,
      count: sql<number>`count(*)::int`,
    })
    .from(serviceRecordsTable)
    .groupBy(serviceRecordsTable.category);

  res.json({
    totalVehicles: vehicleStats?.count ?? 0,
    totalServiceRecords: serviceStats?.count ?? 0,
    totalSpent: serviceStats?.totalSpent ?? 0,
    vehiclesWithFinnUrl: vehiclesWithFinn?.count ?? 0,
    servicesByCategory: categoryRows,
  });
});

router.get("/stats/recent-activity", async (_req, res): Promise<void> => {
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
    .orderBy(desc(serviceRecordsTable.serviceDate))
    .limit(10);

  res.json(rows);
});

export default router;
