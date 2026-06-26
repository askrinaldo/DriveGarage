import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Clock, Car, ArrowLeft, Zap, Sparkles,
  Gift, ArrowRight,
} from "lucide-react";

interface TierDef {
  id: string;
  name: string;
  priceLine: string;
  subLine: string;
  icon: React.ElementType;
  iconColor: string;
  gradient: string;
  border: string;
  popular?: boolean;
  badge?: string;
  features: string[];
  cta: string;
  ctaHref?: string;
  ctaDisabled?: boolean;
  ctaClass: string;
}

const TIERS: TierDef[] = [
  {
    id: "trial",
    name: "Prøveperiode",
    priceLine: "Gratis",
    subLine: "7 dager, ingen binding",
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
    ctaHref: "/sign-up",
    ctaClass:
      "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border-0 shadow-lg shadow-green-900/30",
  },
  {
    id: "standard",
    name: "Standard",
    priceLine: "kr 49",
    subLine: "per måned",
    icon: Zap,
    iconColor: "text-indigo-400",
    gradient: "from-indigo-600/20 to-cyan-600/20",
    border: "border-indigo-500/40",
    popular: true,
    badge: "Mest populær",
    features: [
      "Ubegrenset kjøretøy",
      "Servicehistorikk",
      "Dokumenter og kvitteringer",
      "PDF-rapporter",
      "Klubber og arrangementer",
    ],
    cta: "Kommer med Vipps",
    ctaDisabled: true,
    ctaClass:
      "bg-gradient-to-r from-indigo-600/60 to-cyan-600/60 text-white/70 border-0 cursor-not-allowed",
  },
  {
    id: "premium",
    name: "Premium",
    priceLine: "kr 99",
    subLine: "per måned",
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
    ctaDisabled: true,
    ctaClass:
      "bg-gradient-to-r from-amber-600/60 to-orange-600/60 text-white/70 border-0 cursor-not-allowed",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-4 py-12">

        <div className="mb-8">
          <Link href="/">
            <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Tilbake til forsiden
            </button>
          </Link>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Car className="w-3.5 h-3.5" />
            DriveGarage — Vedlikeholdslogg for klassiske kjøretøy
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground mb-4">
            Enkel prising.
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              7 dager gratis.
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start gratis og oppgrader når du er klar. Ingen bindingstid, ingen skjulte avgifter.
          </p>
        </div>

        {/* Tidlig tilgang — Vipps info */}
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/10 to-cyan-600/10 px-6 py-5 mb-10 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <Clock className="w-3 h-3 text-indigo-400" />
            </div>
            <p className="text-sm font-bold text-indigo-300 uppercase tracking-widest text-[11px]">Tidlig tilgang</p>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">
            DriveGarage forberedes for <strong className="text-indigo-300">Vipps</strong> som betalingsløsning.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">
            Under lansering vil brukere kunne starte med 7 dagers gratis prøveperiode og deretter aktivere abonnement via Vipps.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {TIERS.map((tier) => {
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
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-60`}
                />

                {tier.badge && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 z-10">
                    <div className="px-4 py-0.5 rounded-b-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg">
                      {tier.badge}
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
                      <span className="text-3xl font-black text-foreground">{tier.priceLine}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{tier.subLine}</p>
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
                        <CheckCircle2
                          className={`w-4 h-4 ${tier.iconColor} mt-0.5 shrink-0 opacity-80`}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {tier.ctaHref ? (
                    <Link href={tier.ctaHref}>
                      <Button className={`w-full h-10 font-semibold rounded-xl ${tier.ctaClass}`}>
                        {tier.cta}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      disabled={tier.ctaDisabled}
                      className={`w-full h-10 font-semibold rounded-xl ${tier.ctaClass}`}
                    >
                      {tier.cta}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Planlagt Vipps-flyt */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 mb-10">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-widest mb-5 text-[11px] text-muted-foreground">
            Planlagt Vipps-flyt
          </h2>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { step: "1", label: "Start gratis prøveperiode" },
              { step: "2", label: "Velg abonnement" },
              { step: "3", label: "Aktiver betaling med Vipps" },
              { step: "4", label: "Fortsett uten avbrudd" },
            ].map(({ step, label }) => (
              <div key={step} className="flex flex-col items-center text-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm font-black">
                  {step}
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{label}</p>
                {step !== "4" && (
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 sm:rotate-0 rotate-90 hidden sm:block absolute" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 mb-10">
          <h2 className="text-base font-bold text-foreground mb-4">Ofte stilte spørsmål</h2>
          <div className="grid sm:grid-cols-2 gap-5 text-sm">
            <div>
              <p className="font-semibold text-foreground mb-1">Kan jeg kansellere når som helst?</p>
              <p className="text-muted-foreground">Ja. Du kan avslutte abonnementet ditt når som helst. Du beholder tilgangen til slutten av betalingsperioden.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Kreves det betaling for prøveperioden?</p>
              <p className="text-muted-foreground">Nei. Prøveperioden er helt gratis i 7 dager. Du godkjenner en Vipps-betalingsavtale kun om du ønsker å fortsette.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Hvordan betaler jeg?</p>
              <p className="text-muted-foreground">DriveGarage bruker Vipps Recurring for betaling. Du godkjenner en løpende avtale i Vipps-appen — ingen kortinformasjon lagres hos oss.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Hva skjer med dataene mine hvis jeg nedgraderer?</p>
              <p className="text-muted-foreground">Dataene dine er alltid dine. Alle data beholdes — men du mister tilgang til premiumfunksjoner.</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Har du spørsmål?{" "}
          <Link href="/contact" className="underline hover:text-foreground transition-colors">
            Kontakt oss
          </Link>
          {" · "}
          <Link href="/terms" className="underline hover:text-foreground transition-colors">
            Vilkår for bruk
          </Link>
          {" · "}
          <Link href="/privacy" className="underline hover:text-foreground transition-colors">
            Personvernerklæring
          </Link>
        </p>

      </div>
    </div>
  );
}
