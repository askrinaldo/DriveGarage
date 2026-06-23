import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { forumPostsTable } from "./forumPosts";

export const forumCommentsTable = pgTable("forum_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => forumPostsTable.id, { onDelete: "cascade" }),
  memberName: text("member_name").notNull(),
  content: text("content").notNull(),
  isDeleted: integer("is_deleted").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_forum_comments_post_id").on(t.postId),
]);

export type ForumComment = typeof forumCommentsTable.$inferSelect;
