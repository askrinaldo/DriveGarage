import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "./logger";

export async function seedSuperAdmin(): Promise<void> {
  const email = process.env["ADMIN_EMAIL"];
  const password = process.env["ADMIN_PASSWORD"];

  if (!email || !password) {
    return;
  }

  const existing = await db
    .select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()));

  if (existing.length > 0) {
    if (existing[0]?.role !== "super_admin") {
      await db
        .update(usersTable)
        .set({ role: "super_admin" })
        .where(eq(usersTable.email, email.toLowerCase()));
      logger.info("Upgraded existing user to super_admin");
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(usersTable).values({
    name: "Super Admin",
    email: email.toLowerCase(),
    passwordHash,
    role: "super_admin",
    isActive: true,
  });

  logger.info({ email }, "Super admin created");
}
