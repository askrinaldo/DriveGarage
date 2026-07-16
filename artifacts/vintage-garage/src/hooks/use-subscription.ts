import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

// ── Subscription status types ─────────────────────────────────────────────────

export type SubscriptionStatus =
  | "pending_payment_setup"
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
  vippsConfigured: boolean;
  enforcementEnabled: boolean;
  currentPeriodStartsAt: string | null;
  currentPeriodEndsAt: string | null;
  canceledAt: string | null;
  cancelAtPeriodEnd: boolean;
  expiresAt: string | null;
  subscriptionId: number | null;
}

// ── Access helpers ────────────────────────────────────────────────────────────

/**
 * Returns true if the user should have access to paid features.
 * When enforcement is disabled, always returns true.
 */
export function canAccessApp(
  status: SubscriptionStatus | null,
  enforcementEnabled = true,
  currentPeriodEndsAt: string | null = null,
): boolean {
  if (!enforcementEnabled) return true;
  if (!status) return true;
  if (status === "active" || status === "exempt_internal") return true;
  if (status === "past_due") return true;
  if (
    status === "canceled" &&
    currentPeriodEndsAt &&
    new Date(currentPeriodEndsAt) > new Date()
  ) {
    return true;
  }
  return false;
}

export function hasFullAccess(status: SubscriptionStatus | null): boolean {
  if (!status) return true;
  return status === "active" || status === "exempt_internal";
}

export function statusLabel(status: SubscriptionStatus | null): string {
  const MAP: Record<SubscriptionStatus, string> = {
    pending_payment_setup: "Betaling ikke satt opp",
    active:                "Aktivt abonnement",
    past_due:              "Betaling forfalt",
    payment_failed:        "Betaling feilet",
    canceled:              "Kansellert",
    expired:               "Utløpt",
    exempt_internal:       "Intern fritak",
    deletion_requested:    "Sletting forespurt",
    deleted:               "Slettet",
  };
  return status ? (MAP[status] ?? status) : "Ikke aktivert";
}

export function statusBadgeVariant(
  status: SubscriptionStatus | null,
): "success" | "warning" | "danger" | "neutral" {
  if (!status || status === "pending_payment_setup") return "neutral";
  if (status === "active" || status === "exempt_internal") return "success";
  if (status === "canceled" || status === "past_due") return "warning";
  if (status === "payment_failed" || status === "expired") return "danger";
  return "neutral";
}

// ── React Query hook ──────────────────────────────────────────────────────────

const SUBSCRIPTION_QK = ["subscription"] as const;

async function fetchSubscription(): Promise<SubscriptionInfo> {
  return customFetch<SubscriptionInfo>("/api/billing/subscription", { method: "GET" });
}

export function useSubscription() {
  return useQuery({
    queryKey:           SUBSCRIPTION_QK,
    queryFn:            fetchSubscription,
    staleTime:          30_000,
    gcTime:             5 * 60_000,
    refetchOnMount:     true,
    refetchOnWindowFocus: false,
    retry:              false,
    placeholderData:    (prev) => prev,
  });
}

export function useInvalidateSubscription() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: SUBSCRIPTION_QK });
}
