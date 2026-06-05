import { pgTable, serial, integer, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { vehiclesTable } from "./vehicles";

export const reminderTypeEnum = pgEnum("reminder_type", [
  "mileage",
  "date",
  "both",
]);

export const serviceRemindersTable = pgTable("service_reminders", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull().references(() => vehiclesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: reminderTypeEnum("type").notNull().default("date"),
  dueMileage: integer("due_mileage"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  intervalMonths: integer("interval_months"),
  intervalMileage: integer("interval_mileage"),
  isActive: boolean("is_active").notNull().default(true),
  lastCompleted: timestamp("last_completed", { withTimezone: true }),
  lastCompletedMileage: integer("last_completed_mileage"),
  notifyBefore: integer("notify_before_days").notNull().default(30),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ServiceReminder = typeof serviceRemindersTable.$inferSelect;
