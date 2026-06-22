import { eq, and } from "drizzle-orm";
import { db, vehiclesTable } from "@workspace/db";

/**
 * Verifies that a vehicle belongs to the authenticated user/tenant.
 *
 * Use this before accessing any sub-resource (service records, receipts,
 * trip logs) to ensure the caller owns the parent vehicle.
 *
 * Returns true if owned, false otherwise.
 * Route handlers should return 404 (not 403) to avoid leaking resource existence.
 *
 * @see ARCHITECTURE.md — R2 (extracted from serviceRecords.ts, receipts.ts, tripLogs.ts)
 */
export async function assertVehicleOwnership(
  vehicleId: number,
  tenantId: number | null | undefined,
  userId: number,
): Promise<boolean> {
  const clause = tenantId
    ? and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.tenantId, tenantId))
    : and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.userId, userId));
  const [vehicle] = await db.select({ id: vehiclesTable.id }).from(vehiclesTable).where(clause);
  return !!vehicle;
}
