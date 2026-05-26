import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { forumPostsTable } from "./forumPosts";

export const forumLikesTable = pgTable(
  "forum_likes",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => forumPostsTable.id, { onDelete: "cascade" }),
    memberName: text("member_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("forum_likes_post_member").on(t.postId, t.memberName)]
);

export type ForumLike = typeof forumLikesTable.$inferSelect;
