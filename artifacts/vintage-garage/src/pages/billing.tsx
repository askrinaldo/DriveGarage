import { useTranslation } from "react-i18next";
import { useUserAuth } from "@/hooks/use-user-auth";
import { tierColor } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  CheckCircle2, Zap, Star, Shield, CreditCard,
  Clock, Sparkles, Info, Gift, ArrowRight,
} from "lucide-react";

const DEMO_BILLING = {
  plan: "Prøveperiode",
  daysRemaining: 7,
  provider: "Vipps (planlagt)",
  status: "Betaling ikke aktivert",
};

const VIPPS_TIERS = [
  {
    id: "trial",
    name: "Prøveperiode",
    price: "Gratis",
    sub: "7 dager, ingen binding",
    icon: Gift,
    iconColor: "text-green-400",
    gradient: "from-green-600/15 to-emerald-700/15",
    border: "border-green-500/25",
    features: [
      "7 dager gratis prøveperiode",
      "Full tilgang til DriveGarage",
      "Ingen binding",
      "Ingen betaling før prøveperioden er over",
    ],
    cta: "Start gratis prøveperiode",
    ctaLink: "/sign-up",
    ctaClass: "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0",
    disabled: false,
  },
  {
    id: "standard",
    name: "Standard",
    price: "kr 49",
    sub: "per måned",
    icon: Zap,
    iconColor: "text-indigo-400",
    gradient: "from-indigo-600/20 to-cyan-600/20",
    border: "border-indigo-500/40",
    popular: true,
    features: [
      "Ubegrenset kjøretøy",
      "Servicehistorikk",
      "Dokumenter og kvitteringer",
      "PDF-rapporter",
      "Klubber og arrangementer",
    ],
    cta: "Kommer med Vipps",
    ctaClass: "bg-indigo-600/40 text-white/60 border-0 cursor-not-allowed",
    disabled: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "kr 99",
    sub: "per måned",
    icon: Sparkles,
    iconColor: "text-amber-400",
    gradient: "from-amber-600/20 to-orange-600/20",
    border: "border-amber-500/20",
    features: [
      "Alt i Standard",
      "AI-assistent",
      "Prioritert support",
      "Tidlig tilgang til nye funksjoner",
    ],
    cta: "Kommer med Vipps",
    ctaClass: "bg-amber-600/40 text-white/60 border-0 cursor-not-allowed",
    disabled: true,
  },
];

export default function Billing() {
  const { t } = useTranslation();
  const { isAuthenticated } = useUserAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{t("billing.title")}</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-10">{t("billing.subtitle")}</p>
      </div>

      {/* Tidlig tilgang banner */}
      <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/10 to-cyan-600/10 px-5 py-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-indigo-300">Tidlig tilgang — Vipps-betaling under klargjøring</p>
          <p className="text-xs text-indigo-300/70 mt-1 leading-relaxed">
            DriveGarage forberedes for <strong className="text-indigo-200">Vipps</strong> som betalingsløsning.
            Under lansering vil brukere kunne starte med 7 dagers gratis prøveperiode og deretter aktivere
            abonnement via Vipps. Ingen betaling trekkes nå og ingen betalingsinformasjon lagres.
          </p>
        </div>
      </div>

      {/* Demo billing state — only shown when logged in */}
      {isAuthenticated && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4">
            Din abonnementsstatus
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Gjeldende plan</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                  {DEMO_BILLING.plan}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Dager gjenstående</span>
                <span className="text-sm font-bold text-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-green-400" />
                  {DEMO_BILLING.daysRemaining} dager
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Betalingsleverandør</span>
                <span className="text-xs font-semibold text-indigo-300">{DEMO_BILLING.provider}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                  {DEMO_BILLING.status}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-center">
              <Gift className="w-7 h-7 text-green-400/60" />
              <p className="text-xs text-muted-foreground leading-snug">
                Du er i gratis prøveperiode.<br />
                Oppgrader via Vipps når betaling er aktivert.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">{t("billing.choosePlan")}</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Prisene nedenfor er planlagte priser. Betaling aktiveres via Vipps ved lansering.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {VIPPS_TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl border overflow-hidden transition-all duration-300
                  ${tier.popular
                    ? "border-indigo-500/40 shadow-2xl shadow-indigo-900/30"
                    : tier.border
                  }
                `}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-60`} />

                {tier.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 z-10">
                    <div className="px-4 py-0.5 rounded-b-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg">
                      {t("billing.popularBadge")}
                    </div>
                  </div>
                )}

                <div className="relative z-10 p-6">
                  <div className="flex items-center gap-2.5 mb-5">
                    <Icon className={`w-5 h-5 ${tier.iconColor}`} />
                    <span className={`text-lg font-bold ${tier.iconColor}`}>{tier.name}</span>
                  </div>

                  <div className="mb-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-foreground">{tier.price}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{tier.sub}</p>
                    {tier.id !== "trial" && (
                      <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-green-400/80 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-0.5">
                        <Clock className="w-3 h-3" />
                        Inkluderer 7 dagers gratis prøveperiode
                      </div>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground/65">
                        <CheckCircle2 className={`w-4 h-4 ${tier.iconColor} mt-0.5 shrink-0 opacity-80`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {tier.ctaLink ? (
                    <Link href={tier.ctaLink}>
                      <Button className={`w-full h-10 font-semibold rounded-xl ${tier.ctaClass}`}>
                        {tier.cta}
                      </Button>
                    </Link>
                  ) : (
                    <Button disabled className={`w-full h-10 font-semibold rounded-xl ${tier.ctaClass}`}>
                      {tier.cta}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Planlagt Vipps-flyt */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-5">
          Planlagt Vipps-flyt
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-0">
          {[
            { step: "1", label: "Start gratis prøveperiode" },
            { step: "2", label: "Velg abonnement" },
            { step: "3", label: "Aktiver betaling med Vipps" },
            { step: "4", label: "Fortsett uten avbrudd" },
          ].map(({ step, label }, idx, arr) => (
            <div key={step} className="flex sm:flex-col flex-row items-center sm:text-center gap-3 sm:gap-2 flex-1">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm font-black shrink-0">
                {step}
              </div>
              <p className="text-xs text-muted-foreground leading-snug sm:mt-0">{label}</p>
              {idx < arr.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-white/15 shrink-0 sm:hidden" />
              )}
            </div>
          ))}
        </div>
        <div className="hidden sm:flex items-center justify-around mt-0 -mt-9 px-8 pointer-events-none">
          <ArrowRight className="w-3.5 h-3.5 text-white/10" />
          <ArrowRight className="w-3.5 h-3.5 text-white/10" />
          <ArrowRight className="w-3.5 h-3.5 text-white/10" />
        </div>
      </div>

      {/* Guarantees */}
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

      <p className="text-center text-xs text-muted-foreground pb-4">
        Se fullstendig prisoversikt på{" "}
        <Link href="/pricing" className="underline hover:text-foreground transition-colors">
          prisingsiden
        </Link>
      </p>

    </div>
  );
}
