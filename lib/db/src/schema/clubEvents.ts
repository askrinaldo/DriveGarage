import { pgTable, serial, integer, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { clubsTable } from "./clubs";

export const eventStatusEnum = pgEnum("event_status", [
  "upcoming",
  "ongoing",
  "cancelled",
  "past",
]);

export const clubEventsTable = pgTable("club_events", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  createdBy: text("created_by").notNull(),
  maxAttendees: integer("max_attendees"),
  status: eventStatusEnum("status").notNull().default("upcoming"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ClubEvent = typeof clubEventsTable.$inferSelect;
