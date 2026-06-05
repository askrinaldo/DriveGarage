import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserToken } from "./use-user-auth";

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

function authHeaders(): HeadersInit {
  const token = getUserToken();
  return token
    ? { "Content-Type": "application/json", "x-user-token": token }
    : { "Content-Type": "application/json" };
}

export function useSubscription() {
  return useQuery<SubscriptionInfo>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/billing/subscription", { headers: authHeaders() });
      if (!res.ok) throw new Error("Could not load subscription");
      return res.json() as Promise<SubscriptionInfo>;
    },
    staleTime: 30_000,
  });
}

export function useStripePrices() {
  return useQuery<{ prices: StripePrice[] }>({
    queryKey: ["stripe-prices"],
    queryFn: async () => {
      const res = await fetch("/api/billing/prices");
      if (!res.ok) throw new Error("Could not load prices");
      return res.json() as Promise<{ prices: StripePrice[] }>;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (priceId: string) => {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ priceId }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Checkout feilet");
      }
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
}

export function useCustomerPortal() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Portal feilet");
      }
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
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
