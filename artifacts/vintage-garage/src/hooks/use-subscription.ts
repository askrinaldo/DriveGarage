import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

// ── Subscription status types ─────────────────────────────────────────────────

export type SubscriptionStatus =
  | "trialing"
  | "pending_vipps_agreement"
  | "active"
  | "past_due"
  | "payment_failed"
  | "canceled"
  | "expired"
  | "exempt_internal"
  | "deletion_requested"
  | "deleted";

export interface SubscriptionInfo {
  status: SubscriptionStatus | null;
  plan: "monthly_100" | null;
  provider: "vipps";
  providerStatus: "pending_integration" | "active";
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  canceledAt: string | null;
  expiresAt: string | null;
  daysRemainingInTrial: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function canAccessApp(status: SubscriptionStatus | null): boolean {
  if (!status) return true; // unknown → allow (pending integration)
  return [
    "trialing", "active", "exempt_internal",
    "pending_vipps_agreement", "past_due", "payment_failed", "canceled",
  ].includes(status);
}

export function hasFullAccess(status: SubscriptionStatus | null): boolean {
  if (!status) return true;
  return ["trialing", "active", "exempt_internal"].includes(status);
}

export function statusLabel(status: SubscriptionStatus | null): string {
  const MAP: Record<SubscriptionStatus, string> = {
    trialing: "Prøveperiode",
    pending_vipps_agreement: "Venter på Vipps-godkjenning",
    active: "Aktivt abonnement",
    past_due: "Betaling forfalt",
    payment_failed: "Betaling feilet",
    canceled: "Kansellert",
    expired: "Utløpt",
    exempt_internal: "Intern fritak",
    deletion_requested: "Sletting forespurt",
    deleted: "Slettet",
  };
  return status ? (MAP[status] ?? status) : "Betaling ikke aktivert";
}

export function statusBadgeVariant(
  status: SubscriptionStatus | null,
): "success" | "warning" | "danger" | "neutral" {
  if (!status || status === "trialing") return "success";
  if (status === "active" || status === "exempt_internal") return "success";
  if (status === "pending_vipps_agreement" || status === "canceled") return "warning";
  if (status === "past_due" || status === "payment_failed") return "danger";
  return "neutral";
}

// ── React Query hook ──────────────────────────────────────────────────────────

const SUBSCRIPTION_QK = ["subscription"] as const;

async function fetchSubscription(): Promise<SubscriptionInfo> {
  return customFetch<SubscriptionInfo>("/api/billing/subscription", { method: "GET" });
}

export function useSubscription() {
  return useQuery({
    queryKey: SUBSCRIPTION_QK,
    queryFn: fetchSubscription,
    staleTime: 60_000,
    retry: false,
  });
}

export function useInvalidateSubscription() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: SUBSCRIPTION_QK });
}

// ── Legacy compat exports (used in billing.tsx / profile.tsx) ─────────────────
/** @deprecated use SubscriptionStatus instead */
export type SubscriptionTier = "free" | "standard" | "premium";

/** @deprecated kept for backward compat only */
export function tierLabel(tier: SubscriptionTier): string {
  return { free: "Prøveperiode", standard: "Standard", premium: "Premium" }[tier];
}

/** @deprecated kept for backward compat only */
export function tierColor(_tier: SubscriptionTier): string {
  return "text-indigo-400";
}
