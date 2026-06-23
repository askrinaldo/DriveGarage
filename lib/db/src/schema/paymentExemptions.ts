import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const EXEMPTION_TYPES = ["internal", "partner", "test", "manual"] as const;
export type ExemptionType = (typeof EXEMPTION_TYPES)[number];

export const paymentExemptionsTable = pgTable("payment_exemptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type", { enum: EXEMPTION_TYPES }).notNull(),
  reason: text("reason").notNull(),
  createdByUserId: integer("created_by_user_id")
    .notNull()
    .references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedByUserId: integer("revoked_by_user_id")
    .references(() => usersTable.id),
  revokeReason: text("revoke_reason"),
});

export type PaymentExemption = typeof paymentExemptionsTable.$inferSelect;
export type NewPaymentExemption = typeof paymentExemptionsTable.$inferInsert;
