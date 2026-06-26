import React, { useState } from "react";
import {
  Car,
  Wrench,
  FileText,
  History,
  Users,
  MessageSquare,
  Calendar,
  ArrowRightLeft,
  Bot,
  Cloud,
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
  Star,
  Shield,
  Zap,
} from "lucide-react";

const features = [
  { icon: <Wrench className="w-6 h-6" />, title: "Digital servicebok", desc: "Loggfør alt vedlikehold med dato, kilometerstand og deler." },
  { icon: <FileText className="w-6 h-6" />, title: "Kvitteringsarkiv", desc: "Ta bilde av kvitteringer og lagre dem trygt i skyen." },
  { icon: <Wrench className="w-6 h-6" />, title: "Restaureringslogg", desc: "Dokumenter prosjektet steg for steg med bilder." },
  { icon: <History className="w-6 h-6" />, title: "Kjøretøyhistorikk", desc: "Bygg en komplett tidslinje for eierskap og hendelser." },
  { icon: <Users className="w-6 h-6" />, title: "Klubber", desc: "Opprett eller bli med i bilklubber for ditt merke." },
  { icon: <MessageSquare className="w-6 h-6" />, title: "Forum", desc: "Diskuter tekniske problemer og del erfaringer." },
  { icon: <Calendar className="w-6 h-6" />, title: "Arrangementer", desc: "Finn treff, løp og utstillinger i nærheten av deg." },
  { icon: <ArrowRightLeft className="w-6 h-6" />, title: "Eierskapsoverføring", desc: "Overfør hele den digitale historikken ved salg." },
  { icon: <Bot className="w-6 h-6" />, title: "AI-assistent", desc: "Få hjelp til å tyde gamle manualer eller finne deler." },
];

const tiers = [
  {
    name: "Prøveperiode",
    price: "Gratis",
    period: "7 dager",
    accent: "#16a34a",
    features: ["1 kjøretøy", "Servicelogg", "Kvitteringer", "Klubbmedlemskap"],
  },
  {
    name: "Standard",
    price: "kr 49",
    period: "per måned",
    accent: "#4f46e5",
    popular: true,
    features: ["Ubegrenset kjøretøy", "Alt i Prøveperiode", "AI-assistent", "Prioritert support"],
  },
  {
    name: "Premium",
    price: "kr 99",
    period: "per måned",
    accent: "#d97706",
    features: ["Alt i Standard", "Avansert analyse", "Eksport til PDF", "API-tilgang"],
  },
];

export function Lys() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans overflow-x-hidden">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">DriveGarage</span>
          </div>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <a href="#funksjoner" className="hover:text-gray-900 transition-colors">Funksjoner</a>
            <a href="#priser" className="hover:text-gray-900 transition-colors">Priser</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Logg inn</a>
            <a
              href="#"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors shadow-sm"
            >
              Opprett konto
            </a>
          </div>

          <button className="md:hidden text-gray-600 hover:text-gray-900" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-4 text-sm font-medium text-gray-700">
            <a href="#funksjoner">Funksjoner</a>
            <a href="#priser">Priser</a>
            <a href="#">Logg inn</a>
            <a href="#" className="bg-indigo-600 text-white text-center px-4 py-2 rounded-lg font-semibold">Opprett konto</a>
          </div>
        )}
      </nav>

      <main className="pt-16">

        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-8">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Norges beste plattform for veteranbiler
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6 max-w-4xl mx-auto leading-tight">
            Samle hele historien til{" "}
            <span className="text-indigo-600">kjøretøyet ditt</span>
          </h1>

          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Dokumenter vedlikehold, lagre kvitteringer, bli med i klubber og følg hele historikken på veteranbilen eller motorsykkelen din.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-colors shadow-md shadow-indigo-200"
            >
              Registrer deg gratis
            </a>
            <a
              href="#"
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 font-semibold px-6 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors text-base"
            >
              Se hvordan det fungerer <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Ingen kredittkort</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> 7 dager gratis</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Ingen bindingstid</span>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-gray-50 border-y border-gray-100 py-12">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "12 000+", label: "Kjøretøy" },
              { value: "500+", label: "Klubber" },
              { value: "45 000+", label: "Dokumenter" },
              { value: "100%", label: "Lidenskap" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl font-extrabold text-gray-900 mb-1">{s.value}</div>
                <div className="text-sm text-gray-500 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="funksjoner" className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Alt du trenger for garasjen</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              En komplett verktøykasse designet spesifikt for å bevare historien til klassiske kjøretøy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="group bg-white border border-gray-100 rounded-2xl p-6 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-50 transition-all">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-gray-50 border-y border-gray-100 py-24">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16">Slik fungerer det</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              <div className="hidden md:block absolute top-7 left-[12%] right-[12%] h-[2px] bg-gray-200" />
              {[
                { step: "01", title: "Opprett konto", desc: "Registrer deg gratis på under ett minutt." },
                { step: "02", title: "Registrer kjøretøy", desc: "Legg inn info om din veteranbil eller MC." },
                { step: "03", title: "Last opp data", desc: "Legg til bilder, dokumenter og servicehistorikk." },
                { step: "04", title: "Del historikken", desc: "Vis frem bilen eller overfør data ved salg." },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-indigo-200 flex items-center justify-center text-lg font-bold text-indigo-600 mb-4 shadow-sm relative z-10">
                    {item.step}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="priser" className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Enkel prising. 7 dager gratis.</h2>
            <p className="text-gray-500 text-lg">Start gratis og oppgrader når du er klar. Ingen bindingstid, ingen skjulte avgifter.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-8 flex flex-col gap-6 ${
                  tier.popular
                    ? "border-indigo-300 shadow-xl shadow-indigo-100 bg-indigo-50"
                    : "border-gray-200 bg-white shadow-sm"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[11px] font-bold uppercase tracking-widest px-4 py-1 rounded-full">
                    Mest populær
                  </div>
                )}

                <div>
                  <div className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: tier.accent }}>
                    {tier.name}
                  </div>
                  <div className="text-4xl font-extrabold text-gray-900">{tier.price}</div>
                  <div className="text-sm text-gray-400 mt-1">{tier.period}</div>
                </div>

                <ul className="flex flex-col gap-3 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: tier.accent }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href="#"
                  className="block text-center py-3 rounded-xl font-semibold text-sm transition-colors"
                  style={
                    tier.popular
                      ? { background: tier.accent, color: "#fff" }
                      : { background: "transparent", color: tier.accent, border: `1.5px solid ${tier.accent}33` }
                  }
                >
                  Kom i gang gratis
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-indigo-600 py-20">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Klar til å ta vare på historien?</h2>
            <p className="text-indigo-200 text-lg mb-8">
              Bli med tusenvis av norske entusiaster som allerede bruker DriveGarage.
            </p>
            <a
              href="#"
              className="inline-block bg-white text-indigo-600 font-bold px-8 py-3.5 rounded-xl text-base hover:bg-indigo-50 transition-colors shadow-md"
            >
              Registrer deg gratis
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-100 py-10">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
                <Car className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-700 text-sm">DriveGarage</span>
            </div>
            <p className="text-xs text-gray-400">© 2025 DriveGarage. Alle rettigheter forbeholdt.</p>
            <div className="flex items-center gap-5 text-xs text-gray-400">
              <a href="#" className="hover:text-gray-600 transition-colors">Personvern</a>
              <a href="#" className="hover:text-gray-600 transition-colors">Vilkår</a>
              <a href="#" className="hover:text-gray-600 transition-colors">Kontakt</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
