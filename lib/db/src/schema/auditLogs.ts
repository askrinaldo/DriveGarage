import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { clubsTable } from "./clubs";

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubsTable.id, { onDelete: "set null" }),
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: integer("target_id"),
  targetName: text("target_name"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
