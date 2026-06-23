import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clubsTable = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  location: text("location"),
  clubType: text("club_type").notNull().default("both"),
  ownerName: text("owner_name").notNull(),
  isPrivate: boolean("is_private").notNull().default(false),
  isSuspended: boolean("is_suspended").notNull().default(false),
  suspendedReason: text("suspended_reason"),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClubSchema = createInsertSchema(clubsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClub = z.infer<typeof insertClubSchema>;
export type Club = typeof clubsTable.$inferSelect;
