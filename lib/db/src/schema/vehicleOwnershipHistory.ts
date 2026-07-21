import { pgTable, serial, integer, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { vehiclesTable } from "./vehicles";

export const vehicleOwnershipHistoryTable = pgTable("vehicle_ownership_history", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehiclesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id"),
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
  fromDate: timestamp("from_date", { withTimezone: true }).notNull(),
  toDate: timestamp("to_date", { withTimezone: true }),
  consentToShow: boolean("consent_to_show").notNull().default(true),
  transferId: integer("transfer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_vehicle_ownership_history_vehicle_id").on(t.vehicleId),
]);

export type VehicleOwnershipHistory = typeof vehicleOwnershipHistoryTable.$inferSelect;
export type NewVehicleOwnershipHistory = typeof vehicleOwnershipHistoryTable.$inferInsert;
