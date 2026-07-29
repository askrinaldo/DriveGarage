/**
 * Generate a long-lived admin JWT for use in external schedulers (e.g. GitHub Actions).
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run generate-admin-token
 *
 * Requirements:
 *   SESSION_SECRET and DATABASE_URL must be set in the environment.
 *
 * The token identifies the first super_admin user found in the DB and is valid
 * for 365 days. Store the output in GitHub → Settings → Secrets → ADMIN_TOKEN.
 *
 * Re-run this script to rotate the token; update the GitHub secret immediately after.
 */

import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const secret = process.env["SESSION_SECRET"];
if (!secret) {
  console.error("ERROR: SESSION_SECRET environment variable is not set.");
  process.exit(1);
}

// Find the first active super_admin
const [admin] = await db
  .select({
    id: usersTable.id,
    email: usersTable.email,
    name: usersTable.name,
    role: usersTable.role,
    isActive: usersTable.isActive,
  })
  .from(usersTable)
  .where(eq(usersTable.role, "super_admin"))
  .limit(1);

if (!admin) {
  console.error("ERROR: No super_admin user found in the database.");
  console.error("Make sure your account has role = 'super_admin' before running this script.");
  process.exit(1);
}

if (!admin.isActive) {
  console.error(`ERROR: super_admin user ${admin.email} is deactivated.`);
  process.exit(1);
}

// Mint a long-lived token (365 days). tenantId = 0 because requireSuperAdmin
// does not check tenantId — it only checks role from DB.
const payload = {
  userId:           admin.id,
  email:            admin.email,
  name:             admin.name,
  role:             "super_admin" as const,
  tenantId:         0,
  tenantName:       "admin",
  tenantRole:       "owner" as const,
  isPersonalTenant: false,
};

const token = jwt.sign(payload, secret, { expiresIn: "365d" });

const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 365);

console.log("");
console.log("✅ Admin token generated successfully.");
console.log("");
console.log(`   User:       ${admin.name} <${admin.email}>`);
console.log(`   User ID:    ${admin.id}`);
console.log(`   Expires:    ${expiresAt.toISOString().split("T")[0]} (365 days)`);
console.log("");
console.log("Add this token to GitHub → Settings → Secrets and variables → Actions:");
console.log("  Name:  ADMIN_TOKEN");
console.log("  Value:");
console.log("");
console.log(token);
console.log("");
console.log("⚠️  Treat this token like a password. It grants full super_admin API access.");
console.log("   Rotate it by re-running this script and updating the GitHub secret.");
