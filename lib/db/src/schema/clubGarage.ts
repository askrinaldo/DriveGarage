import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { clubsTable } from "./clubs";
import { vehiclesTable } from "./vehicles";

export const clubGarageEntriesTable = pgTable("club_garage_entries", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
  vehicleId: integer("vehicle_id").notNull().references(() => vehiclesTable.id, { onDelete: "cascade" }),
  memberName: text("member_name").notNull(),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ClubGarageEntry = typeof clubGarageEntriesTable.$inferSelect;
