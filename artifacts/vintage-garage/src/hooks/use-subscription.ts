import { useQueryClient } from "@tanstack/react-query";

export type SubscriptionTier = "free" | "standard" | "premium";

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: string | null;
  stripeSubscription: {
    id: string;
    status: string;
    current_period_end: string;
    price_id: string;
    unit_amount: number;
    currency: string;
    recurring: { interval: string } | null;
    product_name: string;
    product_metadata: Record<string, string>;
  } | null;
}

export interface StripePrice {
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
  stripeSubscription: null,
};

export function useSubscription() {
  return {
    data: STUB_SUB,
    isLoading: false,
    isError: false,
  };
}

export function useStripePrices() {
  return {
    data: { prices: [] as StripePrice[] },
    isLoading: false,
    isError: false,
  };
}

export function useCreateCheckout() {
  return {
    mutate: (_priceId?: string, _opts?: unknown) => {},
    mutateAsync: async (_priceId?: string) => { throw new Error("Billing er midlertidig deaktivert"); },
    isPending: false,
    isError: false,
  };
}

export function useCustomerPortal() {
  return {
    mutate: (_arg?: unknown, _opts?: unknown) => {},
    mutateAsync: async () => { throw new Error("Billing er midlertidig deaktivert"); },
    isPending: false,
    isError: false,
  };
}

export function useInvalidateSubscription() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["subscription"] });
}

export function tierLabel(tier: SubscriptionTier): string {
  return { free: "Gratis", standard: "Standard", premium: "Premium" }[tier];
}

export function tierColor(tier: SubscriptionTier): string {
  return {
    free: "text-zinc-400",
    standard: "text-amber-400",
    premium: "text-amber-300",
  }[tier];
}
