import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { clubsTable } from "./clubs";

export const forumCategoryEnum = pgEnum("forum_category", [
  "general",
  "technical_help",
  "restoration",
  "meetup",
  "parts_for_sale",
]);

export const postTypeEnum = pgEnum("post_type", [
  "text",
  "image",
  "video",
  "project_update",
  "maintenance",
]);

export const forumPostsTable = pgTable("forum_posts", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => clubsTable.id, { onDelete: "cascade" }),
  memberName: text("member_name").notNull(),
  category: forumCategoryEnum("category").notNull().default("general"),
  postType: postTypeEnum("post_type").notNull().default("text"),
  title: text("title"),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  likesCount: integer("likes_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  isPinned: integer("is_pinned").notNull().default(0),
  isDeleted: integer("is_deleted").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ForumPost = typeof forumPostsTable.$inferSelect;
