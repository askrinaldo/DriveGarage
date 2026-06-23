import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_chat_messages_user_id").on(t.userId),
]);

export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type NewChatMessage = typeof chatMessagesTable.$inferInsert;
