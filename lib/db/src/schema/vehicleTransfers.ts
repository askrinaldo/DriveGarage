import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { vehiclesTable } from "./vehicles";

export const vehicleTransfersTable = pgTable("vehicle_transfers", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehiclesTable.id, { onDelete: "cascade" }),
  fromUserId: integer("from_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  fromUserName: text("from_user_name").notNull(),
  fromUserEmail: text("from_user_email").notNull(),
  toEmail: text("to_email").notNull(),
  toUserId: integer("to_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  toUserName: text("to_user_name"),
  transferCode: text("transfer_code").notNull().unique(),
  transferToken: text("transfer_token").notNull().unique(),
  status: text("status", { enum: ["pending", "accepted", "cancelled", "expired"] }).notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VehicleTransfer = typeof vehicleTransfersTable.$inferSelect;
export type NewVehicleTransfer = typeof vehicleTransfersTable.$inferInsert;
