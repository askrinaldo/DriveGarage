import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "pending_vipps_agreement",
  "active",
  "past_due",
  "payment_failed",
  "canceled",
  "expired",
  "exempt_internal",
  "deletion_requested",
  "deleted",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  replitUserId: text("replit_user_id").unique(),
  role: text("role", { enum: ["user", "super_admin"] }).notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  themeAccent: text("theme_accent"),
  themeMode: text("theme_mode"),

  // ── Legacy Stripe columns (kept for backward compat, no new writes) ──────
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionTier: text("subscription_tier", { enum: ["free", "standard", "premium"] }).notNull().default("free"),

  // ── Vipps subscription fields ────────────────────────────────────────────
  /** "monthly_100" is the only plan. Null = not yet set (legacy rows). */
  subscriptionPlan: text("subscription_plan"),
  /** Full status lifecycle. See SUBSCRIPTION_STATUSES for valid values. */
  subscriptionStatus: text("subscription_status").default("trialing"),
  vippsAgreementId: text("vipps_agreement_id"),

  // ── Timeline ─────────────────────────────────────────────────────────────
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEndsAt: timestamp("current_period_ends_at", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
