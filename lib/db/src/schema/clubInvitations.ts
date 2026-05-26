import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { clubsTable } from "./clubs";

export const clubInvitationsTable = pgTable("club_invitations", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  email: text("email"),
  createdBy: text("created_by").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  usedBy: text("used_by"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ClubInvitation = typeof clubInvitationsTable.$inferSelect;
