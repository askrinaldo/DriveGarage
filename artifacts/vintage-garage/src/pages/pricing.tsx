import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CompanyInfo } from "@/components/company-info";
import {
  CheckCircle2, Car, ArrowLeft, Zap, Shield,
} from "lucide-react";

const FEATURES = [
  "Full vedlikeholdslogg for alle kjøretøyene dine",
  "Servicehistorikk med tidslinje",
  "Dokumenter og kvitteringer per kjøretøy",
  "PDF-rapporter og eksport",
  "Klubber og arrangementer for veterankjøretøy",
  "AI-vedlikeholdsråd",
  "Ingen betaling trekkes uten at du godkjenner Vipps-avtale",
];

const FAQ = [
  {
    q: "Finnes det en gratis prøveperiode?",
    a: "Nei. DriveGarage har én plan til 100 kr/mnd. Du godkjenner en Vipps-betalingsavtale ved oppstart — ingen betaling trekkes uten eksplisitt godkjenning i Vipps-appen.",
  },
  {
    q: "Kan jeg kansellere når som helst?",
    a: "Ja. Du kan avslutte abonnementet ditt når som helst. Du beholder tilgangen til slutten av gjeldende betalingsperiode. Data slettes ikke automatisk ved kansellering.",
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
              Én plan.
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Full tilgang til DriveGarage for 100 kr per måned. Betaling via Vipps.
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
                <p className="text-xs text-muted-foreground mt-1">per bruker, per måned</p>
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
                  Kom i gang
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

        {/* Guarantees */}
        <div className="rounded-2xl border border-border/60 bg-card p-6 mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-foreground">Trygt og enkelt</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />
              Ingen betaling trekkes uten at du godkjenner Vipps-avtale
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />
              Kanseller når som helst — tilgang til slutten av perioden
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />
              Data beholdes i minst 90 dager etter utløp — reaktiver når du vil
            </li>
          </ul>
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
