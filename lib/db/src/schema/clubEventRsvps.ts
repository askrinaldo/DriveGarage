import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { clubEventsTable } from "./clubEvents";

export const rsvpStatusEnum = pgEnum("rsvp_status", ["going", "maybe", "not_going"]);

export const clubEventRsvpsTable = pgTable("club_event_rsvps", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => clubEventsTable.id, { onDelete: "cascade" }),
  memberName: text("member_name").notNull(),
  status: rsvpStatusEnum("status").notNull().default("going"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ClubEventRsvp = typeof clubEventRsvpsTable.$inferSelect;
