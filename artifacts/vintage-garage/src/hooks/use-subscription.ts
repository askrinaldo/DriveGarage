import { useQueryClient } from "@tanstack/react-query";

export type SubscriptionTier = "free" | "standard" | "premium";

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: string | null;
  provider: "vipps" | null;
}

export interface VippsPrice {
  product_id: string;
  product_name: string;
  product_metadata: Record<string, string>;
  description: string | null;
  price_id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
}

const STUB_SUB: SubscriptionInfo = {
  tier: "free",
  status: null,
  provider: null,
};

export function useSubscription() {
  return {
    data: STUB_SUB,
    isLoading: false,
    isError: false,
  };
}

export function useVippsPrices() {
  return {
    data: { prices: [] as VippsPrice[], provider: "vipps", status: "pending_integration" },
    isLoading: false,
    isError: false,
  };
}

export function useInvalidateSubscription() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["subscription"] });
}

export function tierLabel(tier: SubscriptionTier): string {
  return { free: "Prøveperiode", standard: "Standard", premium: "Premium" }[tier];
}

export function tierColor(tier: SubscriptionTier): string {
  return {
    free: "text-green-400",
    standard: "text-indigo-400",
    premium: "text-amber-400",
  }[tier];
}
