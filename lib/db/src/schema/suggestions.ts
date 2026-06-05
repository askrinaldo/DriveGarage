import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const suggestionsTable = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  userEmail: text("user_email").notNull(),
  userName: text("user_name").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority", { enum: ["low", "medium", "high"] }).notNull().default("medium"),
  status: text("status", { enum: ["pending", "reviewed", "implemented", "declined"] }).notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Suggestion = typeof suggestionsTable.$inferSelect;
export type NewSuggestion = typeof suggestionsTable.$inferInsert;
