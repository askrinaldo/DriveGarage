import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vehiclesTable } from "./vehicles";

export const tripLogsTable = pgTable("trip_logs", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehiclesTable.id, { onDelete: "cascade" }),
  tripDate: timestamp("trip_date", { withTimezone: true }).notNull().defaultNow(),
  fromLocation: text("from_location").notNull(),
  toLocation: text("to_location").notNull(),
  distanceKm: numeric("distance_km", { precision: 8, scale: 1 }),
  mileageStart: integer("mileage_start"),
  mileageEnd: integer("mileage_end"),
  fuelUsedLiters: numeric("fuel_used_liters", { precision: 6, scale: 2 }),
  notes: text("notes"),
  weather: text("weather"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTripLogSchema = createInsertSchema(tripLogsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTripLog = z.infer<typeof insertTripLogSchema>;
export type TripLog = typeof tripLogsTable.$inferSelect;
