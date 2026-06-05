import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  userEmail: text("user_email").notNull(),
  userName: text("user_name").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category", { enum: ["feil", "spørsmål", "annet"] }).notNull().default("annet"),
  status: text("status", { enum: ["open", "answered", "closed"] }).notNull().default("open"),
  adminReply: text("admin_reply"),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type NewSupportTicket = typeof supportTicketsTable.$inferInsert;
