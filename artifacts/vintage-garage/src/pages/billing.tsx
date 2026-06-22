import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useUserAuth } from "@/hooks/use-user-auth";
import {
  useSubscription, useStripePrices, useCreateCheckout,
  useCustomerPortal, useInvalidateSubscription,
  tierColor, type StripePrice,
} from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Loader2, ExternalLink, Zap, Star, Shield,
  CreditCard, Calendar, ArrowRight, Sparkles, Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

function formatAmount(unitAmount: number, currency: string): string {
  const amount = unitAmount / 100;
  if (currency.toLowerCase() === "nok") return `${amount} kr`;
  return `${amount} ${currency.toUpperCase()}`;
}

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
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState<"month" | "year">("month");
  const isCurrent = currentTier === tier;
  const selectedPrice = billingCycle === "year" ? yearlyPrice : monthlyPrice;
  const isPopular = tier === "standard";

  const TIER_META: Record<string, { gradient: string; glow: string; iconColor: string }> = {
    free:     { gradient: "from-slate-600/20 to-slate-700/20",    glow: "",                       iconColor: "text-slate-400" },
    standard: { gradient: "from-indigo-600/20 to-cyan-600/20",    glow: "shadow-indigo-900/30",   iconColor: "text-indigo-400" },
    premium:  { gradient: "from-amber-600/20 to-orange-600/20",   glow: "shadow-amber-900/20",    iconColor: "text-amber-400" },
  };

  const meta = TIER_META[tier] ?? TIER_META.free;
  const tierKey = tier as "free" | "standard" | "premium";
  const tierName = t(`billing.tiers.${tierKey}.name`);
  const features = t(`billing.tiers.${tierKey}.features`, { returnObjects: true }) as string[];
  const intervalLabel = (interval: string) =>
    interval === "year" ? t("billing.intervalYear") : t("billing.intervalMonth");

  return (
    <div className={`relative rounded-2xl border transition-all duration-300 overflow-hidden
      ${isPopular
        ? "border-indigo-500/40 shadow-2xl shadow-indigo-900/30"
        : "border-white/[0.08] shadow-xl"
      }
    `}>
      <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} opacity-60`} />

      {isPopular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 z-10">
          <div className="px-4 py-0.5 rounded-b-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg">
            {t("billing.popularBadge")}
          </div>
        </div>
      )}

      <div className="relative z-10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {tier === "free"     && <Shield    className={`w-5 h-5 ${meta.iconColor}`} />}
            {tier === "standard" && <Zap       className={`w-5 h-5 ${meta.iconColor}`} />}
            {tier === "premium"  && <Sparkles  className={`w-5 h-5 ${meta.iconColor}`} />}
            <span className={`text-lg font-bold ${tierColor(tierKey)}`}>{tierName}</span>
          </div>
          {isCurrent && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
              {t("billing.activeBadge")}
            </Badge>
          )}
        </div>

        <div className="mb-5">
          {selectedPrice ? (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-foreground">
                  {formatAmount(selectedPrice.unit_amount, selectedPrice.currency)}
                </span>
                <span className="text-muted-foreground text-sm">/{intervalLabel(selectedPrice.recurring?.interval ?? "month")}</span>
              </div>
              {yearlyPrice && monthlyPrice && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setBillingCycle("month")}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${billingCycle === "month" ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground/60"}`}
                  >{t("billing.monthly")}</button>
                  <button
                    onClick={() => setBillingCycle("year")}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${billingCycle === "year" ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground/60"}`}
                  >
                    {t("billing.yearly")}
                    <span className="text-green-500 text-[10px] font-semibold">-17%</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-foreground">{t("billing.free")}</span>
              <span className="text-muted-foreground text-sm">{t("billing.forever")}</span>
            </div>
          )}
        </div>

        <ul className="space-y-2 mb-6">
          {Array.isArray(features) && features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground/65">
              <CheckCircle2 className={`w-4 h-4 ${meta.iconColor} mt-0.5 shrink-0 opacity-80`} />
              {f}
            </li>
          ))}
        </ul>

        {!isCurrent && selectedPrice ? (
          <Button
            className={`w-full h-10 font-semibold rounded-xl border-0 transition-all duration-200
              ${isPopular
                ? "bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-900/30"
                : "bg-foreground/10 hover:bg-foreground/15 text-foreground"
              }
            `}
            onClick={() => onCheckout(selectedPrice.price_id)}
            disabled={isPending}
          >
            {isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><span>{t("billing.chooseTier", { tier: tierName })}</span><ArrowRight className="w-4 h-4 ml-1.5" /></>
            }
          </Button>
        ) : isCurrent ? (
          <div className="h-10 flex items-center justify-center text-sm text-muted-foreground font-medium">
            {t("billing.currentPlan")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Billing() {
  const { t } = useTranslation();
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
      toast({ title: t("billing.paymentSuccess"), description: t("billing.paymentSuccessDesc") });
      invalidate();
      window.history.replaceState({}, "", "/billing");
    }
    if (params.get("canceled")) {
      toast({ title: t("billing.paymentCanceled"), description: t("billing.paymentCanceledDesc"), variant: "destructive" });
      window.history.replaceState({}, "", "/billing");
    }
  }, [isAuthenticated, navigate, toast, invalidate, t]);

  const prices = pricesData?.prices ?? [];

  const getPriceForTier = (tier: string, interval: "month" | "year") =>
    prices.find((p) => p.product_metadata?.tier === tier && p.recurring?.interval === interval);

  const handleCheckout = (priceId: string) => {
    if (!isAuthenticated) { navigate("/login"); return; }
    checkout.mutate(priceId, {
      onError: (e: Error) => toast({ title: t("billing.error"), description: e.message, variant: "destructive" }),
    });
  };

  const handlePortal = () => {
    portal.mutate(undefined, {
      onError: (e: Error) => toast({ title: t("billing.error"), description: e.message, variant: "destructive" }),
    });
  };

  if (pricesLoading || subLoading) {
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

      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{t("billing.title")}</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-10">{t("billing.subtitle")}</p>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300">Betalingsløsning er ikke aktivert ennå</p>
          <p className="text-xs text-amber-300/70 mt-1 leading-relaxed">
            DriveGarage planlegger betaling via <strong className="text-amber-200">Vipps</strong> med 7 dagers gratis prøveperiode.
            Ingen betaling trekkes og ingen betalingsinformasjon lagres på nåværende tidspunkt.
            Aktivering vil kreve eksplisitt godkjenning av en Vipps-betalingsavtale.
          </p>
        </div>
      </div>

      {subStatus && (
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/10 to-cyan-600/10 p-6">
          <p className="text-xs font-bold text-indigo-400/70 uppercase tracking-widest mb-3">{t("billing.activeSubscription")}</p>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-foreground font-bold text-lg">{subStatus.product_name}</p>
              <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                {formatAmount(subStatus.unit_amount, subStatus.currency)}/
                {subStatus.recurring
                  ? (subStatus.recurring.interval === "year" ? t("billing.intervalYear") : t("billing.intervalMonth"))
                  : "—"}
              </p>
              {subStatus.current_period_end && (
                <p className="text-muted-foreground/60 text-xs flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {t("billing.nextRenewal")} {new Date(subStatus.current_period_end).toLocaleDateString()}
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
                : <><ExternalLink className="h-4 w-4 mr-2" />{t("billing.manageInStripe")}</>
              }
            </Button>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">{t("billing.choosePlan")}</h2>
        <p className="text-sm text-muted-foreground mb-6">{t("billing.upgradeAnytime")}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <PriceCard tier="free"     monthlyPrice={undefined}                      yearlyPrice={undefined}                     currentTier={currentTier} onCheckout={handleCheckout} isPending={checkout.isPending} />
          <PriceCard tier="standard" monthlyPrice={getPriceForTier("standard", "month")} yearlyPrice={getPriceForTier("standard", "year")} currentTier={currentTier} onCheckout={handleCheckout} isPending={checkout.isPending} />
          <PriceCard tier="premium"  monthlyPrice={getPriceForTier("premium",  "month")} yearlyPrice={getPriceForTier("premium",  "year")} currentTier={currentTier} onCheckout={handleCheckout} isPending={checkout.isPending} />
        </div>

        {prices.length === 0 && (
          <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t("billing.loadingPrices")}</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-amber-400" />
          <p className="text-sm font-bold text-foreground">{t("billing.safeToTry")}</p>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />{t("billing.guarantee1")}</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />{t("billing.guarantee2")}</li>
          <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />{t("billing.guarantee3")}</li>
        </ul>
      </div>
    </div>
  );
}
