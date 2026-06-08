import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { vehiclesTable } from "./vehicles";

export const monthlyProjectsTable = pgTable("monthly_projects", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehiclesTable.id, { onDelete: "cascade" }),
  nominatedByUserId: integer("nominated_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  nominatorName: text("nominator_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  voteCount: integer("vote_count").notNull().default(0),
  isWinner: boolean("is_winner").notNull().default(false),
  status: text("status", { enum: ["active", "winner", "closed"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const monthlyProjectVotesTable = pgTable("monthly_project_votes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => monthlyProjectsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MonthlyProject = typeof monthlyProjectsTable.$inferSelect;
export type MonthlyProjectVote = typeof monthlyProjectVotesTable.$inferSelect;
