import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { subscriptionsTable } from "./subscriptions";

export const SUBSCRIPTION_EVENT_PROCESSING_STATUSES = [
  "pending",
  "processed",
  "failed",
  "duplicate",
] as const;

export type SubscriptionEventProcessingStatus =
  (typeof SUBSCRIPTION_EVENT_PROCESSING_STATUSES)[number];

export const subscriptionEventsTable = pgTable("subscription_events", {
  id: serial("id").primaryKey(),

  /** Nullable: may be null if the event arrived before an agreement was confirmed. */
  subscriptionId: integer("subscription_id").references(() => subscriptionsTable.id, {
    onDelete: "set null",
  }),

  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  /** Provider idempotency key / event ID used to deduplicate redeliveries. */
  providerEventId: text("provider_event_id"),

  /** e.g. "AGREEMENT_ACTIVE", "AGREEMENT_STOPPED", "CHARGE_CAPTURED", "CHARGE_FAILED" */
  eventType: text("event_type").notNull(),

  processingStatus: text("processing_status", {
    enum: SUBSCRIPTION_EVENT_PROCESSING_STATUSES,
  })
    .notNull()
    .default("pending"),

  /** Sanitized event metadata — never includes secrets or PII beyond userId/agreementId. */
  payload: jsonb("payload"),

  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  error: text("error"),
});

export type SubscriptionEvent = typeof subscriptionEventsTable.$inferSelect;
export type NewSubscriptionEvent = typeof subscriptionEventsTable.$inferInsert;
