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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function Premium() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white font-sans overflow-x-hidden selection:bg-indigo-500/30">
      {/* Background Orbs & Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] rounded-full bg-cyan-500/20 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[150px]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0f1e]/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">VintageGarage</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#funksjoner" className="hover:text-white transition-colors">Funksjoner</a>
            <a href="#priser" className="hover:text-white transition-colors">Priser</a>
            <a href="#" className="hover:text-white transition-colors">Logg inn</a>
            <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm rounded-full px-6">
              Opprett konto
            </Button>
          </div>

          <button className="md:hidden text-gray-300 hover:text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-20">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-cyan-400 text-sm font-medium mb-8 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            Norges beste plattform for veteranbiler
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl mx-auto leading-tight">
            Samle hele historien til <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 animate-gradient-x">
              kjøretøyet ditt
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Lagre servicehistorikk, restaureringer, dokumenter og bilder på ett sted. Bygget for entusiaster som bryr seg om detaljene.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button className="h-14 px-8 text-lg rounded-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 border-0 shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all hover:scale-105">
              Opprett konto gratis
            </Button>
            <Button variant="outline" className="h-14 px-8 text-lg rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 backdrop-blur-sm transition-all">
              Se funksjoner <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </section>

        {/* Stats Banner */}
        <section className="border-y border-white/10 bg-white/[0.02] backdrop-blur-sm py-12">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">12 000+</div>
              <div className="text-sm text-gray-400 uppercase tracking-wider">Kjøretøy</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">500+</div>
              <div className="text-sm text-gray-400 uppercase tracking-wider">Klubber</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">45 000+</div>
              <div className="text-sm text-gray-400 uppercase tracking-wider">Dokumenter</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">100%</div>
              <div className="text-sm text-gray-400 uppercase tracking-wider">Lidenskap</div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="funksjoner" className="max-w-7xl mx-auto px-6 py-32">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Alt du trenger for garasjen</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              En komplett verktøykasse designet spesifikt for å bevare historien til klassiske kjøretøy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Wrench />, title: "Digital servicebok", desc: "Loggfør alt vedlikehold med dato, kilometerstand og deler." },
              { icon: <FileText />, title: "Kvitteringsarkiv", desc: "Ta bilde av kvitteringer og lagre dem trygt i skyen." },
              { icon: <Wrench />, title: "Restaureringslogg", desc: "Dokumenter prosjektet ditt steg for steg med før/etter bilder." },
              { icon: <History />, title: "Kjøretøyhistorikk", desc: "Bygg en komplett tidslinje for eierskap og hendelser." },
              { icon: <Users />, title: "Klubber", desc: "Opprett eller bli med i bilklubber for ditt merke." },
              { icon: <MessageSquare />, title: "Forum", desc: "Diskuter tekniske problemer og del erfaringer med andre." },
              { icon: <Calendar />, title: "Arrangementer", desc: "Finn treff, løp og utstillinger i nærheten av deg." },
              { icon: <ArrowRightLeft />, title: "Eierskapsoverføring", desc: "Overfør hele den digitale historikken ved salg." },
              { icon: <Bot />, title: "AI-assistent", desc: "Få hjelp til å tyde gamle manualer eller finne deler." },
              { icon: <Cloud />, title: "Skybasert lagring", desc: "Dine data er alltid trygge og tilgjengelige overalt." },
            ].map((feature, i) => (
              <Card key={i} className="bg-white/[0.03] border-white/10 backdrop-blur-md hover:bg-white/[0.06] transition-all duration-300 group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-8 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="py-32 relative">
          <div className="absolute inset-0 bg-indigo-950/20 border-y border-white/5" />
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-20 text-center">Slik fungerer det</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-y-1/2" />
              
              {[
                { step: "01", title: "Opprett konto", desc: "Registrer deg gratis på under ett minutt." },
                { step: "02", title: "Registrer kjøretøy", desc: "Legg inn info om din veteranbil eller MC." },
                { step: "03", title: "Last opp data", desc: "Legg til bilder, dokumenter og servicehistorikk." },
                { step: "04", title: "Del historikken", desc: "Vis frem bilen eller overfør data ved salg." },
              ].map((item, i) => (
                <div key={i} className="relative pt-8">
                  <div className="w-16 h-16 rounded-2xl bg-[#0a0f1e] border border-white/20 flex items-center justify-center text-xl font-bold text-indigo-400 absolute top-0 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-0 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                    {item.step}
                  </div>
                  <div className="text-center md:text-left mt-12 md:mt-8">
                    <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                    <p className="text-gray-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="priser" className="max-w-7xl mx-auto px-6 py-32">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Enkle priser, ingen overraskelser</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Velg pakken som passer din garasje best.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
            {/* Free */}
            <Card className="bg-white/[0.02] border-white/10 backdrop-blur-md">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-white mb-2">GRATIS</h3>
                <div className="text-4xl font-bold text-white mb-6">kr 0<span className="text-lg text-gray-500 font-normal">/mnd</span></div>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-indigo-400 mr-3" /> 1 kjøretøy</li>
                  <li className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-indigo-400 mr-3" /> 500 MB lagring</li>
                  <li className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-indigo-400 mr-3" /> Basis funksjoner</li>
                </ul>
                <Button variant="outline" className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10">Velg Gratis</Button>
              </CardContent>
            </Card>

            {/* Premium */}
            <Card className="bg-white/[0.05] border-indigo-500/50 backdrop-blur-xl relative transform scale-105 shadow-[0_0_50px_rgba(99,102,241,0.15)] z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                Mest populær
              </div>
              <CardContent className="p-10">
                <h3 className="text-2xl font-semibold text-white mb-2">PREMIUM</h3>
                <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-2">
                  kr 99<span className="text-lg text-gray-500 font-normal">/mnd</span>
                </div>
                <p className="text-sm text-gray-400 mb-6">eller kr 799/år</p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-white"><CheckCircle2 className="w-5 h-5 text-cyan-400 mr-3" /> Ubegrenset kjøretøy</li>
                  <li className="flex items-center text-white"><CheckCircle2 className="w-5 h-5 text-cyan-400 mr-3" /> Ubegrenset lagring</li>
                  <li className="flex items-center text-white"><CheckCircle2 className="w-5 h-5 text-cyan-400 mr-3" /> AI-assistent</li>
                  <li className="flex items-center text-white"><CheckCircle2 className="w-5 h-5 text-cyan-400 mr-3" /> PDF-rapporter</li>
                </ul>
                <Button className="w-full h-12 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] border-0">
                  Prøv Premium Gratis
                </Button>
              </CardContent>
            </Card>

            {/* Standard */}
            <Card className="bg-white/[0.02] border-white/10 backdrop-blur-md">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-white mb-2">STANDARD</h3>
                <div className="text-4xl font-bold text-white mb-2">kr 50<span className="text-lg text-gray-500 font-normal">/mnd</span></div>
                <p className="text-sm text-gray-400 mb-6">eller kr 300/år</p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-indigo-400 mr-3" /> Ubegrenset kjøretøy</li>
                  <li className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-indigo-400 mr-3" /> 10 GB lagring</li>
                  <li className="flex items-center text-gray-300"><CheckCircle2 className="w-5 h-5 text-indigo-400 mr-3" /> Klubber & Arrangementer</li>
                </ul>
                <Button variant="outline" className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10">Velg Standard</Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-900/20" />
          <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-8">Klar til å starte?</h2>
            <p className="text-xl text-gray-400 mb-10">Bli med tusenvis av andre entusiaster på VintageGarage i dag.</p>
            <Button className="h-16 px-10 text-xl rounded-full bg-white text-[#0a0f1e] hover:bg-gray-200 border-0 shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105">
              Opprett din garasje nå
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0a0f1e] relative z-10 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center">
                <Car className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold">VintageGarage</span>
            </div>
            <p className="text-gray-400 max-w-sm">
              Norges beste digitale plattform for veteranbiler og klassiske motorsykler. Bevar historien for fremtiden.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-6">Produkt</h4>
            <ul className="space-y-4 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Funksjoner</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Priser</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Sikkerhet</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-6">Selskap</h4>
            <ul className="space-y-4 text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Om oss</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Kontakt</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Personvern</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-white/10 text-center md:text-left text-sm text-gray-500">
          © {new Date().getFullYear()} VintageGarage AS. Med enerett.
        </div>
      </footer>
    </div>
  );
}
