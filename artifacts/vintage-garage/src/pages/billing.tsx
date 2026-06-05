import { useEffect } from "react";
import { useLocation } from "wouter";
import { useUserAuth } from "@/hooks/use-user-auth";
import {
  useSubscription,
  useStripePrices,
  useCreateCheckout,
  useCustomerPortal,
  useInvalidateSubscription,
  tierLabel,
  tierColor,
  type StripePrice,
} from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2, ExternalLink, Zap, Star, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TIER_FEATURES: Record<string, string[]> = {
  free: [
    "1 kjøretøy",
    "Servicelogg",
    "Kvitteringsarkiv",
    "Turopptaker",
  ],
  standard: [
    "Ubegrenset antall kjøretøy",
    "10 GB fillagring",
    "Klubber og fellesskap",
    "Arrangementskalender",
    "Markedsplass",
    "Alt i Gratis",
  ],
  premium: [
    "Ubegrenset lagring",
    "AI-mekanikerhjelper",
    "PDF-rapporter",
    "Prioritert support",
    "Alt i Standard",
  ],
};

function formatAmount(unitAmount: number, currency: string): string {
  const amount = unitAmount / 100;
  if (currency.toLowerCase() === "nok") return `kr ${amount}`;
  return `${amount} ${currency.toUpperCase()}`;
}

function intervalLabel(interval: string): string {
  return interval === "year" ? "år" : "mnd";
}

function PriceCard({
  tier,
  monthlyPrice,
  yearlyPrice,
  currentTier,
  onCheckout,
  isPending,
}: {
  tier: string;
  monthlyPrice: StripePrice | undefined;
  yearlyPrice: StripePrice | undefined;
  currentTier: string;
  onCheckout: (priceId: string) => void;
  isPending: boolean;
}) {
  const isCurrent = currentTier === tier;
  const features = TIER_FEATURES[tier] ?? [];
  const isPopular = tier === "standard";

  return (
    <Card
      className={`relative border ${
        isPopular
          ? "border-amber-500/60 bg-zinc-900"
          : "border-zinc-700/60 bg-zinc-900/60"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-amber-500 text-zinc-900 font-semibold text-xs px-3">
            Mest populær
          </Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {tier === "free" && <Shield className="h-5 w-5 text-zinc-400" />}
          {tier === "standard" && <Zap className="h-5 w-5 text-amber-400" />}
          {tier === "premium" && <Star className="h-5 w-5 text-amber-300" />}
          <CardTitle className={`text-lg ${tierColor(tier as "free" | "standard" | "premium")}`}>
            {tierLabel(tier as "free" | "standard" | "premium")}
          </CardTitle>
          {isCurrent && (
            <Badge variant="outline" className="ml-auto border-green-500/50 text-green-400 text-xs">
              Aktiv
            </Badge>
          )}
        </div>
        {monthlyPrice ? (
          <div className="mt-2">
            <span className="text-2xl font-bold text-zinc-100">
              {formatAmount(monthlyPrice.unit_amount, monthlyPrice.currency)}
            </span>
            <span className="text-zinc-500 text-sm ml-1">/mnd</span>
            {yearlyPrice && (
              <div className="text-xs text-zinc-500 mt-1">
                eller {formatAmount(yearlyPrice.unit_amount, yearlyPrice.currency)}/år
                <span className="text-green-400 ml-1">(spar ~17%)</span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2">
            <span className="text-2xl font-bold text-zinc-100">kr 0</span>
            <span className="text-zinc-500 text-sm ml-1">/alltid</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
              <CheckCircle2 className="h-4 w-4 text-amber-500/70 mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        {!isCurrent && monthlyPrice && (
          <div className="space-y-2 pt-2">
            <Button
              className="w-full bg-amber-600 hover:bg-amber-500 text-zinc-900 font-semibold"
              size="sm"
              onClick={() => onCheckout(monthlyPrice.price_id)}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Velg ${tierLabel(tier as "free" | "standard" | "premium")} månedlig`}
            </Button>
            {yearlyPrice && (
              <Button
                variant="outline"
                className="w-full border-zinc-600 text-zinc-300 hover:text-zinc-100"
                size="sm"
                onClick={() => onCheckout(yearlyPrice.price_id)}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Velg ${tierLabel(tier as "free" | "standard" | "premium")} årlig`}
              </Button>
            )}
          </div>
        )}
        {isCurrent && tier === "free" && (
          <p className="text-xs text-zinc-500 pt-2 text-center">Ditt nåværende plan</p>
        )}
      </CardContent>
    </Card>
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
    if (!isAuthenticated) { navigate("/login"); return; }
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
    prices.find(
      (p) =>
        p.product_metadata?.tier === tier &&
        p.recurring?.interval === interval
    );

  const handleCheckout = (priceId: string) => {
    checkout.mutate(priceId, {
      onError: (e) => toast({ title: "Feil", description: e.message, variant: "destructive" }),
    });
  };

  const handlePortal = () => {
    portal.mutate(undefined, {
      onError: (e) => toast({ title: "Feil", description: e.message, variant: "destructive" }),
    });
  };

  if (subLoading || pricesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const currentTier = sub?.tier ?? "free";
  const subStatus = sub?.stripeSubscription;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100 font-serif">Abonnement</h1>
        <p className="text-zinc-400 mt-1">Administrer ditt Vintage Garage-abonnement</p>
      </div>

      {subStatus && (
        <Card className="border-zinc-700/60 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400 font-medium uppercase tracking-wider">
              Aktivt abonnement
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-zinc-100 font-semibold">{subStatus.product_name}</p>
              <p className="text-zinc-400 text-sm">
                {formatAmount(subStatus.unit_amount, subStatus.currency)}/
                {subStatus.recurring ? intervalLabel(subStatus.recurring.interval) : "—"}
              </p>
              {subStatus.current_period_end && (
                <p className="text-zinc-500 text-xs">
                  Neste fornyelse:{" "}
                  {new Date(subStatus.current_period_end).toLocaleDateString("nb-NO")}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-600 text-zinc-300 hover:text-zinc-100"
              onClick={handlePortal}
              disabled={portal.isPending}
            >
              {portal.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Administrer i Stripe
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator className="border-zinc-800" />

      <div>
        <h2 className="text-lg font-semibold text-zinc-200 mb-4">Velg plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <p className="text-zinc-500 text-sm text-center mt-4">
            Prisene lastes inn når Stripe-synkronisering er fullført (tar noen sekunder etter oppstart).
          </p>
        )}
      </div>
    </div>
  );
}
