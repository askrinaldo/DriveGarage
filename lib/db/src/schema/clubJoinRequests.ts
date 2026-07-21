import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { clubsTable } from "./clubs";

export const clubJoinRequestsTable = pgTable("club_join_requests", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
  memberName: text("member_name").notNull(),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_club_join_requests_club_id").on(t.clubId),
]);

export type ClubJoinRequest = typeof clubJoinRequestsTable.$inferSelect;
