import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useUserAuth } from "@/hooks/use-user-auth";
import {
  useSubscription, useStripePrices, useCreateCheckout,
  useCustomerPortal, useInvalidateSubscription,
  tierLabel, tierColor, type StripePrice,
} from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Loader2, ExternalLink, Zap, Star, Shield,
  CreditCard, Calendar, ArrowRight, Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function formatAmount(unitAmount: number, currency: string): string {
  const amount = unitAmount / 100;
  if (currency.toLowerCase() === "nok") return `${amount} kr`;
  return `${amount} ${currency.toUpperCase()}`;
}

function intervalLabel(interval: string): string {
  return interval === "year" ? "år" : "mnd";
}

const TIER_META: Record<string, {
  gradient: string;
  glow: string;
  iconColor: string;
  features: string[];
  badge?: string;
}> = {
  free: {
    gradient: "from-slate-600/20 to-slate-700/20",
    glow: "",
    iconColor: "text-slate-400",
    features: ["1 kjøretøy", "Servicelogg", "Kvitteringsarkiv", "Turopptaker"],
  },
  standard: {
    gradient: "from-indigo-600/20 to-cyan-600/20",
    glow: "shadow-indigo-900/30",
    iconColor: "text-indigo-400",
    features: [
      "Ubegrenset kjøretøy", "10 GB fillagring", "Klubber og fellesskap",
      "Arrangementskalender", "Markedsplass", "Alt i Gratis",
    ],
    badge: "Mest populær",
  },
  premium: {
    gradient: "from-amber-600/20 to-orange-600/20",
    glow: "shadow-amber-900/20",
    iconColor: "text-amber-400",
    features: [
      "Ubegrenset lagring", "AI-mekanikerhjelper", "PDF-rapporter",
      "Prioritert support", "Alt i Standard",
    ],
  },
};

function PriceCard({
  tier, monthlyPrice, yearlyPrice, currentTier, onCheckout, isPending,
}: {
  tier: string;
  monthlyPrice: StripePrice | undefined;
  yearlyPrice: StripePrice | undefined;
  currentTier: string;
  onCheckout: (priceId: string) => void;
  isPending: boolean;
}) {
  const [billingCycle, setBillingCycle] = useState<"month" | "year">("month");
  const isCurrent = currentTier === tier;
  const meta = TIER_META[tier] ?? TIER_META.free;
  const selectedPrice = billingCycle === "year" ? yearlyPrice : monthlyPrice;
  const isPopular = tier === "standard";

  return (
    <div className={`relative rounded-2xl border transition-all duration-300 overflow-hidden
      ${isPopular
        ? "border-indigo-500/40 shadow-2xl shadow-indigo-900/30"
        : "border-white/[0.08] shadow-xl"
      }
    `}>
      {/* Gradient bg */}
      <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} opacity-60`} />

      {/* Popular badge */}
      {meta.badge && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 z-10">
          <div className="px-4 py-0.5 rounded-b-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg">
            {meta.badge}
          </div>
        </div>
      )}

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {tier === "free" && <Shield className={`w-5 h-5 ${meta.iconColor}`} />}
            {tier === "standard" && <Zap className={`w-5 h-5 ${meta.iconColor}`} />}
            {tier === "premium" && <Sparkles className={`w-5 h-5 ${meta.iconColor}`} />}
            <span className={`text-lg font-bold ${tierColor(tier as "free" | "standard" | "premium")}`}>
              {tierLabel(tier as "free" | "standard" | "premium")}
            </span>
          </div>
          {isCurrent && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
              Aktiv
            </Badge>
          )}
        </div>

        {/* Price */}
        <div className="mb-5">
          {selectedPrice ? (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">
                  {formatAmount(selectedPrice.unit_amount, selectedPrice.currency)}
                </span>
                <span className="text-white/40 text-sm">/{intervalLabel(selectedPrice.recurring?.interval ?? "month")}</span>
              </div>
              {yearlyPrice && monthlyPrice && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setBillingCycle("month")}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${billingCycle === "month" ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"}`}
                  >Månedlig</button>
                  <button
                    onClick={() => setBillingCycle("year")}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${billingCycle === "year" ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"}`}
                  >
                    Årlig
                    <span className="text-green-400 text-[10px] font-semibold">-17%</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">Gratis</span>
              <span className="text-white/40 text-sm">/ alltid</span>
            </div>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2 mb-6">
          {meta.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-white/65">
              <CheckCircle2 className={`w-4 h-4 ${meta.iconColor} mt-0.5 shrink-0 opacity-80`} />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        {!isCurrent && selectedPrice ? (
          <Button
            className={`w-full h-10 font-semibold rounded-xl border-0 transition-all duration-200
              ${isPopular
                ? "bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-900/30"
                : "bg-white/10 hover:bg-white/15 text-white"
              }
            `}
            onClick={() => onCheckout(selectedPrice.price_id)}
            disabled={isPending}
          >
            {isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><span>Velg {tierLabel(tier as "free" | "standard" | "premium")}</span><ArrowRight className="w-4 h-4 ml-1.5" /></>
            }
          </Button>
        ) : isCurrent ? (
          <div className="h-10 flex items-center justify-center text-sm text-white/30 font-medium">
            Ditt nåværende plan
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Billing() {
  const { isAuthenticated } = useUserAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const invalidate = useInvalidateSubscription();

  const { data: sub, isLoading: subLoading } = useSubscription();
  const { data: pricesData, isLoading: pricesLoading } = useStripePrices();
  const checkout = useCreateCheckout();
  const portal = useCustomerPortal();

  useEffect(() => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) {
      toast({ title: "Betaling mottatt!", description: "Abonnementet ditt er nå aktivt." });
      invalidate();
      window.history.replaceState({}, "", "/billing");
    }
    if (params.get("canceled")) {
      toast({ title: "Betaling avbrutt", description: "Du kan prøve igjen når som helst.", variant: "destructive" });
      window.history.replaceState({}, "", "/billing");
    }
  }, [isAuthenticated, navigate, toast, invalidate]);

  const prices = pricesData?.prices ?? [];

  const getPriceForTier = (tier: string, interval: "month" | "year") =>
    prices.find((p) => p.product_metadata?.tier === tier && p.recurring?.interval === interval);

  const handleCheckout = (priceId: string) => {
    if (!isAuthenticated) { navigate("/login"); return; }
    checkout.mutate(priceId, {
      onError: (e) => toast({ title: "Feil", description: e.message, variant: "destructive" }),
    });
  };

  const handlePortal = () => {
    portal.mutate(undefined, {
      onError: (e) => toast({ title: "Feil", description: e.message, variant: "destructive" }),
    });
  };

  if (pricesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  const currentTier = sub?.tier ?? "free";
  const subStatus = sub?.stripeSubscription;

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Abonnement</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-10">Administrer ditt DriveGarage-abonnement</p>
      </div>

      {/* Active subscription card */}
      {subStatus && (
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/10 to-cyan-600/10 p-6">
          <p className="text-xs font-bold text-indigo-400/70 uppercase tracking-widest mb-3">Aktivt abonnement</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-foreground font-bold text-lg">{subStatus.product_name}</p>
              <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                {formatAmount(subStatus.unit_amount, subStatus.currency)}/
                {subStatus.recurring ? intervalLabel(subStatus.recurring.interval) : "—"}
              </p>
              {subStatus.current_period_end && (
                <p className="text-muted-foreground/60 text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Neste fornyelse: {new Date(subStatus.current_period_end).toLocaleDateString("nb-NO")}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-indigo-500/30 text-indigo-300 hover:text-white hover:border-indigo-400"
              onClick={handlePortal}
              disabled={portal.isPending}
            >
              {portal.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><ExternalLink className="h-4 w-4 mr-2" />Administrer i Stripe</>
              }
            </Button>
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Velg plan</h2>
        <p className="text-sm text-muted-foreground mb-6">Oppgrader når som helst. Avbestill når du vil.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <PriceCard
            tier="free"
            monthlyPrice={undefined}
            yearlyPrice={undefined}
            currentTier={currentTier}
            onCheckout={handleCheckout}
            isPending={checkout.isPending}
          />
          <PriceCard
            tier="standard"
            monthlyPrice={getPriceForTier("standard", "month")}
            yearlyPrice={getPriceForTier("standard", "year")}
            currentTier={currentTier}
            onCheckout={handleCheckout}
            isPending={checkout.isPending}
          />
          <PriceCard
            tier="premium"
            monthlyPrice={getPriceForTier("premium", "month")}
            yearlyPrice={getPriceForTier("premium", "year")}
            currentTier={currentTier}
            onCheckout={handleCheckout}
            isPending={checkout.isPending}
          />
        </div>

        {prices.length === 0 && (
          <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Laster priser fra Stripe… (kan ta noen sekunder)
            </p>
          </div>
        )}
      </div>

      {/* FAQ / guarantee */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-amber-400" />
          <p className="text-sm font-bold text-foreground">Trygt å prøve</p>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />Ingen bindingstid — avbestill når som helst</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />Kortdata lagres aldri hos oss — håndteres av Stripe</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />Dataene dine er dine — eksporter alltid</li>
        </ul>
      </div>
    </div>
  );
}
