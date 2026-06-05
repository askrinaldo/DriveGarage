import { pgTable, serial, text, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";

export const badgeCategoryEnum = pgEnum("badge_category", [
  "activity",
  "maintenance",
  "social",
  "milestone",
  "special",
]);

export const badgeDefinitionsTable = pgTable("badge_definitions", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  category: badgeCategoryEnum("category").notNull().default("activity"),
  points: integer("points").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userAchievementsTable = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  memberName: text("member_name").notNull(),
  clubId: integer("club_id"),
  badgeSlug: text("badge_slug").notNull(),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  metadata: text("metadata"),
});

export const userPointsTable = pgTable("user_points", {
  id: serial("id").primaryKey(),
  memberName: text("member_name").notNull(),
  clubId: integer("club_id"),
  points: integer("points").notNull().default(0),
  reason: text("reason").notNull(),
  referenceId: integer("reference_id"),
  referenceType: text("reference_type"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BadgeDefinition = typeof badgeDefinitionsTable.$inferSelect;
export type UserAchievement = typeof userAchievementsTable.$inferSelect;
export type UserPoints = typeof userPointsTable.$inferSelect;
