export const COMPANY = {
  name: "IT Løsninger No AS",
  orgNr: "980 891 232",
  location: "Sandnes, Norway",
} as const;

export type SubscriptionCancellationMethod = "support" | "self-service";

export const subscriptionCancellationMethod: SubscriptionCancellationMethod =
  "support";
