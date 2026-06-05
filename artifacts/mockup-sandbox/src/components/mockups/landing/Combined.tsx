import React from "react";
import {
  Car,
  Wrench,
  FileText,
  Camera,
  Users,
  MessageSquare,
  Calendar,
  ArrowRightLeft,
  Bot,
  Cloud,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Combined() {
  return (
    <div className="min-h-[4500px] bg-[#111111] text-gray-200 font-sans selection:bg-[#b87333]/30">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap');
        .font-playfair { font-family: 'Playfair Display', serif; }
        .text-copper { color: #b87333; }
        .bg-copper { background-color: #b87333; }
        .border-copper { border-color: #b87333; }
        .hover-bg-copper:hover { background-color: #9a5f2a; }
      ` }} />

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#111111]/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-playfair font-bold text-2xl text-copper">
              Vintage Garage
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#funksjoner" className="text-sm font-medium hover:text-copper transition-colors">Funksjoner</a>
            <a href="#priser" className="text-sm font-medium hover:text-copper transition-colors">Priser</a>
            <a href="#login" className="text-sm font-medium hover:text-copper transition-colors">Logg inn</a>
            <Button className="bg-copper hover:bg-[#9a5f2a] text-white border-0">
              Opprett konto
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#b87333]/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <h1 className="font-playfair font-bold text-5xl md:text-7xl lg:text-8xl leading-tight mb-8 text-white">
            Samle hele historien til kjøretøyet ditt
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            Lagre servicehistorikk, restaureringer, dokumenter og bilder på ett sted.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto bg-copper hover:bg-[#9a5f2a] text-white h-14 px-8 text-lg">
              Opprett konto gratis
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto border-gray-700 hover:bg-gray-800 text-white h-14 px-8 text-lg bg-transparent">
              Se funksjoner
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4"><div className="h-px w-full bg-gradient-to-r from-transparent via-[#b87333]/50 to-transparent" /></div>

      {/* STATS */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-playfair font-bold text-copper mb-2">12 000+</div>
              <div className="text-gray-400 font-medium">Kjøretøy registrert</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-playfair font-bold text-copper mb-2">500+</div>
              <div className="text-gray-400 font-medium">Klubber tilknyttet</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-playfair font-bold text-copper mb-2">45 000+</div>
              <div className="text-gray-400 font-medium">Dokumenter lagret</div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4"><div className="h-px w-full bg-gradient-to-r from-transparent via-[#b87333]/50 to-transparent" /></div>

      {/* FEATURES */}
      <section id="funksjoner" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-playfair font-bold text-4xl md:text-5xl text-white mb-6">
              Alt du trenger for kjøretøyet
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <FeatureCard icon={<Wrench />} title="Digital servicebok" desc="Full oversikt over all service og vedlikehold" />
            <FeatureCard icon={<FileText />} title="Kvitteringsarkiv" desc="Lagre og søk i kvitteringer fra verksteder" />
            <FeatureCard icon={<Camera />} title="Restaureringslogg" desc="Dokumenter restaureringsprosjektet steg for steg" />
            <FeatureCard icon={<Car />} title="Kjøretøyhistorikk" desc="Komplett historikk følger kjøretøyet" />
            <FeatureCard icon={<Users />} title="Klubber" desc="Bli med i klubber for din bilmodell eller region" />
            <FeatureCard icon={<MessageSquare />} title="Forum" desc="Del kunnskap og erfaringer med andre entusiaster" />
            <FeatureCard icon={<Calendar />} title="Arrangementer" desc="Finn og meld deg på veterantreff og utstillinger" />
            <FeatureCard icon={<ArrowRightLeft />} title="Eierskapsoverføring" desc="Overfør historikken trygt ved salg" />
            <FeatureCard icon={<Bot />} title="AI-assistent" desc="Få svar på tekniske spørsmål og vedlikeholdsråd" />
            <FeatureCard icon={<Cloud />} title="Skybasert lagring" desc="Bilder og dokumenter alltid tilgjengelig" />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-[#161616]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-playfair font-bold text-4xl md:text-5xl text-white mb-6">
              Slik fungerer det
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <Step number="1" title="Opprett konto" desc="Registrer deg gratis på 2 minutter" />
            <Step number="2" title="Registrer kjøretøy" desc="Legg inn kjøretøyets informasjon og bilder" />
            <Step number="3" title="Last opp dokumentasjon" desc="Servicehistorikk, kvitteringer, bilder" />
            <Step number="4" title="Overfør historikken" desc="Selg med full dokumentert historikk" />
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="priser" className="py-24 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#b87333]/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="font-playfair font-bold text-4xl md:text-5xl text-white mb-6">
              Enkle priser
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard 
              title="GRATIS" 
              price="kr 0/mnd" 
              features={["1 kjøretøy", "500 MB lagring"]} 
              btnText="Kom i gang" 
            />
            <PricingCard 
              title="STANDARD" 
              price="kr 50/mnd" 
              subtitle="eller kr 300/år"
              features={["Ubegrenset kjøretøy", "10 GB lagring", "Klubber", "Arrangementer"]} 
              btnText="Velg Standard" 
              highlighted
            />
            <PricingCard 
              title="PREMIUM" 
              price="kr 99/mnd" 
              subtitle="eller kr 799/år"
              features={["Ubegrenset lagring", "AI-assistent", "PDF-rapporter"]} 
              btnText="Velg Premium" 
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 bg-[#b87333]/10 border-t border-b border-[#b87333]/20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h2 className="font-playfair font-bold text-4xl md:text-5xl text-white mb-6">
            Klar til å komme i gang?
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Opprett din konto gratis i dag og begynn å samle historien til kjøretøyet ditt.
          </p>
          <Button size="lg" className="bg-copper hover:bg-[#9a5f2a] text-white h-14 px-10 text-lg">
            Opprett gratis konto
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 bg-[#0a0a0a] border-t border-white/5">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="font-playfair font-bold text-2xl text-copper mb-4">
                Vintage Garage
              </div>
              <p className="text-gray-500">
                Samle hele historien til kjøretøyet ditt på ett trygt sted.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6">Produkt</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-gray-400 hover:text-copper transition-colors">Funksjoner</a></li>
                <li><a href="#" className="text-gray-400 hover:text-copper transition-colors">Priser</a></li>
                <li><a href="#" className="text-gray-400 hover:text-copper transition-colors">Logg inn</a></li>
                <li><a href="#" className="text-gray-400 hover:text-copper transition-colors">Registrer deg</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6">Selskapet</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-gray-400 hover:text-copper transition-colors">Om oss</a></li>
                <li><a href="#" className="text-gray-400 hover:text-copper transition-colors">Blogg</a></li>
                <li><a href="#" className="text-gray-400 hover:text-copper transition-colors">Kontakt</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6">Juridisk</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-gray-400 hover:text-copper transition-colors">Personvern</a></li>
                <li><a href="#" className="text-gray-400 hover:text-copper transition-colors">Vilkår</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 text-center text-gray-500">
            © 2025 Vintage Garage. Alle rettigheter forbeholdt.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-[#1a1a1a] border border-white/5 hover:border-[#b87333]/30 transition-colors group">
      <div className="text-copper mb-6 w-12 h-12 bg-copper/10 rounded-xl flex items-center justify-center group-hover:bg-copper group-hover:text-white transition-colors">
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      </div>
      <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="text-center relative">
      <div className="w-16 h-16 mx-auto rounded-full bg-copper/10 text-copper flex items-center justify-center text-2xl font-playfair font-bold mb-6 border border-copper/20">
        {number}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-400">{desc}</p>
    </div>
  );
}

function PricingCard({ 
  title, 
  price, 
  subtitle, 
  features, 
  btnText, 
  highlighted = false 
}: { 
  title: string, 
  price: string, 
  subtitle?: string, 
  features: string[], 
  btnText: string, 
  highlighted?: boolean 
}) {
  return (
    <div className={`relative p-8 rounded-3xl backdrop-blur-xl bg-white/5 flex flex-col h-full ${highlighted ? 'border-2 border-copper' : 'border border-white/10'}`}>
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-copper text-white text-xs font-bold rounded-full uppercase tracking-wider">
          Anbefalt
        </div>
      )}
      <div className="mb-8 text-center">
        <h3 className="text-gray-400 font-medium tracking-widest uppercase mb-4">{title}</h3>
        <div className="text-4xl font-playfair font-bold text-white">{price}</div>
        {subtitle && <div className="text-sm text-gray-400 mt-2">{subtitle}</div>}
      </div>
      
      <ul className="space-y-4 mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3 text-gray-300">
            <Check className="w-5 h-5 text-copper shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      
      <Button 
        className={`w-full h-12 ${highlighted ? 'bg-copper hover:bg-[#9a5f2a] text-white border-0' : 'bg-white/10 hover:bg-white/20 text-white border-0'}`}
      >
        {btnText}
      </Button>
    </div>
  );
}
