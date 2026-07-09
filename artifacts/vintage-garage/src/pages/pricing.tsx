import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CompanyInfo } from "@/components/company-info";
import {
  CheckCircle2, Clock, Car, ArrowLeft, Zap,
} from "lucide-react";

const FEATURES = [
  "7 dager gratis prøveperiode — ingen binding",
  "Ubegrenset vedlikeholdslogg for kjøretøyene dine",
  "Servicehistorikk med tidslinje",
  "Dokumenter og kvitteringer per kjøretøy",
  "PDF-rapporter",
  "Klubber og arrangementer for veterankjøretøy",
  "Ingen betaling trekkes før du godkjenner Vipps-avtale",
];

const FAQ = [
  {
    q: "Kreves det betaling for prøveperioden?",
    a: "Nei. Prøveperioden er helt gratis i 7 dager. Du godkjenner en Vipps-betalingsavtale kun hvis du ønsker å fortsette.",
  },
  {
    q: "Kan jeg kansellere når som helst?",
    a: "Ja. Du kan avslutte abonnementet ditt når som helst. Du beholder tilgangen til slutten av betalingsperioden. Data slettes ikke automatisk ved kansellering.",
  },
  {
    q: "Hvordan betaler jeg?",
    a: "DriveGarage bruker Vipps Recurring for betaling. Du godkjenner en løpende avtale i Vipps-appen — ingen kortinformasjon lagres hos oss.",
  },
  {
    q: "Hva skjer med dataene mine hvis jeg avslutter?",
    a: "Dataene dine beholdes i minst 90 dager etter at abonnementet utløper. Du kan reaktivere og gjenopprette tilgangen i denne perioden. Kontossletting er en separat handling som krever eksplisitt bekreftelse.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-12">

        <div className="mb-8">
          <Link href="/">
            <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Tilbake til forsiden
            </button>
          </Link>
        </div>

        {/* Hero */}
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
            Én plan. Ingen skjulte avgifter. Betaling via Vipps kommer snart.
          </p>
        </div>

        {/* Single plan card */}
        <div className="relative rounded-2xl border border-indigo-500/40 overflow-hidden shadow-2xl shadow-indigo-900/30 mb-10">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-cyan-600/20 opacity-60" />

          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 z-10">
            <div className="px-5 py-0.5 rounded-b-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg">
              Én enkel plan
            </div>
          </div>

          <div className="relative z-10 p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">DriveGarage</p>
                  <p className="text-sm text-muted-foreground">Full tilgang til alle funksjoner</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-baseline gap-1 justify-end">
                  <span className="text-4xl font-black text-foreground">100</span>
                  <span className="text-lg font-semibold text-foreground">kr</span>
                  <span className="text-muted-foreground text-sm">/mnd</span>
                </div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-0.5">
                  <Clock className="w-3 h-3" />
                  7 dager gratis prøveperiode inkludert
                </div>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0 opacity-80" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/sign-up" className="flex-1">
                <Button className="w-full h-11 font-semibold bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-indigo-900/30">
                  Start gratis prøveperiode
                </Button>
              </Link>
              <Link href="/sign-in" className="flex-1">
                <Button variant="outline" className="w-full h-11 font-semibold">
                  Jeg har allerede konto
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Vipps info box */}
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/8 to-cyan-600/8 px-6 py-5 mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <p className="text-sm font-bold text-indigo-300">Betaling via Vipps — kommer snart</p>
          </div>
          <p className="text-sm text-foreground/75 leading-relaxed">
            DriveGarage forberedes for <strong className="text-indigo-300">Vipps Recurring</strong> som betalingsløsning.
            Ingen betaling trekkes nå og ingen betalingsinformasjon lagres.
            Betalingsavtale godkjennes via Vipps-appen når tjenesten lanseres.
          </p>
        </div>

        {/* Planlagt flyt */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 mb-10">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-5">
            Slik fungerer det
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { step: "1", label: "Start gratis prøveperiode" },
              { step: "2", label: "Utforsk alle funksjoner i 7 dager" },
              { step: "3", label: "Godkjenn Vipps-betalingsavtale" },
              { step: "4", label: "Fortsett uten avbrudd for 100 kr/mnd" },
            ].map(({ step, label }) => (
              <div key={step} className="flex flex-col items-center text-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm font-black">
                  {step}
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 mb-10">
          <h2 className="text-base font-bold text-foreground mb-5">Ofte stilte spørsmål</h2>
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <p className="font-semibold text-foreground mb-1">{q}</p>
                <p className="text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
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

        <CompanyInfo className="text-center text-xs text-muted-foreground/70 mt-6 leading-relaxed" />

      </div>
    </div>
  );
}
