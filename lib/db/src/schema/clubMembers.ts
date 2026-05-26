import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clubsTable } from "./clubs";

export const clubMembersTable = pgTable("club_members", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
  memberName: text("member_name").notNull(),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertClubMemberSchema = createInsertSchema(clubMembersTable).omit({ id: true, joinedAt: true });
export type InsertClubMember = z.infer<typeof insertClubMemberSchema>;
export type ClubMember = typeof clubMembersTable.$inferSelect;
