import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vehiclesTable } from "./vehicles";

export const serviceRecordsTable = pgTable("service_records", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehiclesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  serviceDate: timestamp("service_date", { withTimezone: true }).notNull().defaultNow(),
  mileageAtService: integer("mileage_at_service"),
  cost: numeric("cost", { precision: 10, scale: 2 }),
  performedBy: text("performed_by"),
  category: text("category").notNull().default("other"),
  bodyArea: text("body_area"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertServiceRecordSchema = createInsertSchema(serviceRecordsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertServiceRecord = z.infer<typeof insertServiceRecordSchema>;
export type ServiceRecord = typeof serviceRecordsTable.$inferSelect;
