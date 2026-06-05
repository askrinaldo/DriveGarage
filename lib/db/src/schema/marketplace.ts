import { pgTable, serial, text, integer, timestamp, pgEnum, numeric, boolean } from "drizzle-orm/pg-core";
import { clubsTable } from "./clubs";

export const listingStatusEnum = pgEnum("listing_status", [
  "active",
  "sold",
  "reserved",
  "removed",
]);

export const listingConditionEnum = pgEnum("listing_condition", [
  "new",
  "excellent",
  "good",
  "fair",
  "parts_only",
]);

export const marketplaceListingsTable = pgTable("marketplace_listings", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubsTable.id, { onDelete: "cascade" }),
  sellerName: text("seller_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }),
  currency: text("currency").notNull().default("NOK"),
  condition: listingConditionEnum("condition").notNull().default("good"),
  category: text("category"),
  make: text("make"),
  model: text("model"),
  year: integer("year"),
  imageUrl: text("image_url"),
  status: listingStatusEnum("status").notNull().default("active"),
  contactInfo: text("contact_info"),
  location: text("location"),
  isFree: boolean("is_free").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MarketplaceListing = typeof marketplaceListingsTable.$inferSelect;
