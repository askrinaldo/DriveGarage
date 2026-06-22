import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Shield, Zap, Sparkles, ArrowLeft,
  Clock, Car, AlertCircle,
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
  features: string[];
  cta: string;
  ctaHref: string;
  ctaClass: string;
}

const TIERS: TierDef[] = [
  {
    id: "free",
    name: "Gratis",
    priceLine: "kr 0",
    subLine: "alltid gratis",
    icon: Shield,
    iconColor: "text-slate-400",
    gradient: "from-slate-600/20 to-slate-700/20",
    border: "border-white/[0.08]",
    features: [
      "Opptil 3 kjøretøy",
      "Vedlikeholdslogg",
      "Kvitteringsarkiv",
      "Turllogg",
      "Grunnleggende statistikk",
    ],
    cta: "Start gratis",
    ctaHref: "/sign-up",
    ctaClass: "bg-white/10 hover:bg-white/15 text-white border-0",
  },
  {
    id: "standard",
    name: "Standard",
    priceLine: "kr 69",
    subLine: "per måned via Vipps",
    icon: Zap,
    iconColor: "text-indigo-400",
    gradient: "from-indigo-600/20 to-cyan-600/20",
    border: "border-indigo-500/40",
    popular: true,
    features: [
      "Ubegrenset kjøretøy",
      "Ubegrenset vedlikeholdslogg",
      "Ubegrenset kvitteringer",
      "Servicereminders",
      "AI-vedlikeholdsråd",
      "PDF/CSV-eksport",
    ],
    cta: "Start 7-dagers prøveperiode",
    ctaHref: "/sign-up",
    ctaClass:
      "bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-indigo-900/30",
  },
  {
    id: "premium",
    name: "Premium",
    priceLine: "kr 129",
    subLine: "per måned via Vipps",
    icon: Sparkles,
    iconColor: "text-amber-400",
    gradient: "from-amber-600/20 to-orange-600/20",
    border: "border-amber-500/20",
    features: [
      "Alt i Standard",
      "Klubbfunksjoner og invitasjoner",
      "Markedsplass-tilgang",
      "Kjøretøyoverføring",
      "Offentlig garasje-profil",
      "Prioritert support",
    ],
    cta: "Start 7-dagers prøveperiode",
    ctaHref: "/sign-up",
    ctaClass:
      "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border-0 shadow-lg shadow-amber-900/30",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0d0f1a] text-foreground">
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
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4">
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

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-5 py-4 flex items-start gap-3 mb-10 max-w-2xl mx-auto">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Betalingsløsning via Vipps — kommer snart</p>
            <p className="text-xs text-amber-300/70 mt-0.5 leading-relaxed">
              Prisene nedenfor er planlagte priser. Betaling aktiveres via{" "}
              <strong className="text-amber-200">Vipps Recurring Payments</strong> med 7 dagers gratis prøveperiode.
              Ingen betaling trekkes og ingen betalingsinformasjon lagres på nåværende tidspunkt.
            </p>
          </div>
        </div>

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

                {tier.popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 z-10">
                    <div className="px-4 py-0.5 rounded-b-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg">
                      Mest populær
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
                      <span className="text-3xl font-black text-white">{tier.priceLine}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{tier.subLine}</p>
                    {tier.id !== "free" && (
                      <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-green-400/80 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-0.5">
                        <Clock className="w-3 h-3" />
                        7 dager gratis prøveperiode
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

                  <Link href={tier.ctaHref}>
                    <Button className={`w-full h-10 font-semibold rounded-xl ${tier.ctaClass}`}>
                      {tier.cta}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 mb-10">
          <h2 className="text-base font-bold text-white mb-4">Ofte stilte spørsmål</h2>
          <div className="grid sm:grid-cols-2 gap-5 text-sm">
            <div>
              <p className="font-semibold text-foreground mb-1">Kan jeg kansellere når som helst?</p>
              <p className="text-muted-foreground">Ja. Du kan avslutte abonnementet ditt når som helst. Du beholder tilgangen til slutten av betalingsperioden.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Kreves det betalingskort for prøveperioden?</p>
              <p className="text-muted-foreground">Nei. Prøveperioden er gratis i 7 dager. Du godkjenner en Vipps-betalingsavtale kun om du ønsker å fortsette etter prøveperioden.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Hvordan betaler jeg?</p>
              <p className="text-muted-foreground">DriveGarage bruker Vipps Recurring for betaling. Du godkjenner en løpende avtale i Vipps-appen — ingen kortinformasjon lagres hos oss.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Hva skjer med dataene mine hvis jeg nedgraderer?</p>
              <p className="text-muted-foreground">Dataene dine er alltid dine. Hvis du nedgraderer til Gratis-planen, beholdes alle data — men du mister tilgang til premiumfunksjoner.</p>
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
