/**
 * One-time migration: create a personal tenant for every existing user
 * and backfill tenantId on their vehicles.
 *
 * Run with:
 *   pnpm --filter @workspace/scripts run migrate:tenants
 */
import { db, usersTable, vehiclesTable, tenantsTable, tenantMembershipsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";

async function main() {
  console.log("Starting tenant migration...");

  const users = await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable);
  console.log(`Found ${users.length} user(s).`);

  for (const user of users) {
    const slug = `personal-${user.id}`;

    // Check if personal tenant already exists
    const [existing] = await db
      .select({ id: tenantsTable.id })
      .from(tenantsTable)
      .where(eq(tenantsTable.slug, slug));

    let tenantId: number;

    if (existing) {
      tenantId = existing.id;
      console.log(`  [skip] User ${user.id} (${user.name}) already has tenant ${tenantId}`);
    } else {
      const [tenant] = await db
        .insert(tenantsTable)
        .values({
          name: `${user.name}'s Garasje`,
          slug,
          isPersonal: true,
          ownerUserId: user.id,
        })
        .returning({ id: tenantsTable.id });

      if (!tenant) throw new Error(`Failed to create tenant for user ${user.id}`);
      tenantId = tenant.id;

      await db.insert(tenantMembershipsTable).values({
        tenantId,
        userId: user.id,
        role: "owner",
      });

      console.log(`  [created] Tenant ${tenantId} for user ${user.id} (${user.name})`);
    }

    // Backfill vehicles
    const updated = await db
      .update(vehiclesTable)
      .set({ tenantId })
      .where(eq(vehiclesTable.userId, user.id))
      .returning({ id: vehiclesTable.id });

    if (updated.length > 0) {
      console.log(`    → Backfilled ${updated.length} vehicle(s) with tenantId=${tenantId}`);
    }
  }

  // Also fix vehicles with no userId (orphaned)
  const orphans = await db
    .select({ id: vehiclesTable.id })
    .from(vehiclesTable)
    .where(isNull(vehiclesTable.tenantId));

  if (orphans.length > 0) {
    console.log(`\nWARNING: ${orphans.length} vehicle(s) still have no tenantId (orphaned). Manual review needed.`);
  }

  console.log("\nMigration complete ✓");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
