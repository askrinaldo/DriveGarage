import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { clubsTable } from "./clubs";

export const forumNotificationsTable = pgTable("forum_notifications", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
  recipientName: text("recipient_name").notNull(),
  senderName: text("sender_name").notNull(),
  type: text("type").notNull(), // "comment" | "like" | "new_post"
  postId: integer("post_id"),
  message: text("message").notNull(),
  isRead: integer("is_read").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ForumNotification = typeof forumNotificationsTable.$inferSelect;
