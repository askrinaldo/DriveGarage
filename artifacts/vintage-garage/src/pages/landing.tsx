import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
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
import { useUserAuth } from "@/hooks/use-user-auth";

export default function LandingPage() {
  const { isAuthenticated } = useUserAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-[#111111] text-gray-200 font-sans selection:bg-[#b87333]/30">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap');
        .font-playfair { font-family: 'Playfair Display', serif; }
        .text-copper { color: #b87333; }
        .bg-copper { background-color: #b87333; }
        .border-copper { border-color: #b87333; }
      `}</style>

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#111111]/90 backdrop-blur-md">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link href="/">
            <span className="font-playfair font-bold text-2xl text-copper cursor-pointer">
              Vintage Garage
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#funksjoner" className="text-sm font-medium hover:text-copper transition-colors">Funksjoner</a>
            <a href="#priser" className="text-sm font-medium hover:text-copper transition-colors">Priser</a>
            <Link href="/login">
              <span className="text-sm font-medium hover:text-copper transition-colors cursor-pointer">Logg inn</span>
            </Link>
            <Link href="/register">
              <span className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-[#b87333] hover:bg-[#9a5f2a] text-white text-sm font-medium transition-colors cursor-pointer">
                Opprett konto
              </span>
            </Link>
          </div>
          <div className="md:hidden flex items-center gap-3">
            <Link href="/login">
              <span className="text-sm text-copper cursor-pointer">Logg inn</span>
            </Link>
            <Link href="/register">
              <span className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-[#b87333] text-white text-sm font-medium cursor-pointer">
                Registrer
              </span>
            </Link>
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
            <Link href="/register">
              <span className="inline-flex items-center justify-center w-full sm:w-auto h-14 px-8 rounded-md bg-[#b87333] hover:bg-[#9a5f2a] text-white text-lg font-medium transition-colors cursor-pointer">
                Opprett konto gratis
              </span>
            </Link>
            <a
              href="#funksjoner"
              className="inline-flex items-center justify-center w-full sm:w-auto h-14 px-8 rounded-md border border-gray-700 hover:bg-gray-800 text-white text-lg font-medium transition-colors"
            >
              Se funksjoner
            </a>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#b87333]/50 to-transparent" />
      </div>

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

      <div className="container mx-auto px-4">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#b87333]/50 to-transparent" />
      </div>

      {/* FEATURES */}
      <section id="funksjoner" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-playfair font-bold text-4xl md:text-5xl text-white mb-4">
              Alt du trenger for kjøretøyet
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Fra servicehistorikk til klubbaktivitet — alt samlet på én plattform.
            </p>
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
            <h2 className="font-playfair font-bold text-4xl md:text-5xl text-white mb-4">
              Slik fungerer det
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Kom i gang på under fem minutter.
            </p>
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
            <h2 className="font-playfair font-bold text-4xl md:text-5xl text-white mb-4">
              Enkle priser
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Start gratis. Oppgrader når du er klar.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              title="GRATIS"
              price="kr 0"
              priceLabel="/mnd"
              features={["1 kjøretøy", "500 MB lagring", "Servicehistorikk", "Kvitteringsarkiv"]}
              btnText="Kom i gang"
              btnHref="/register"
            />
            <PricingCard
              title="STANDARD"
              price="kr 50"
              priceLabel="/mnd"
              subtitle="eller kr 300/år"
              features={["Ubegrenset kjøretøy", "10 GB lagring", "Klubber og forum", "Arrangementer", "Historikkeksport"]}
              btnText="Velg Standard"
              btnHref="/register"
              highlighted
            />
            <PricingCard
              title="PREMIUM"
              price="kr 99"
              priceLabel="/mnd"
              subtitle="eller kr 799/år"
              features={["Ubegrenset lagring", "AI-assistent", "PDF-rapporter", "Prioritert support", "Eksport av historikk"]}
              btnText="Velg Premium"
              btnHref="/register"
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
          <Link href="/register">
            <span className="inline-flex items-center justify-center h-14 px-10 rounded-md bg-[#b87333] hover:bg-[#9a5f2a] text-white text-lg font-medium transition-colors cursor-pointer">
              Opprett gratis konto
            </span>
          </Link>
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
              <p className="text-gray-500 text-sm leading-relaxed">
                Samle hele historien til kjøretøyet ditt på ett trygt sted.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 text-sm uppercase tracking-wider">Produkt</h4>
              <ul className="space-y-3">
                <li><a href="#funksjoner" className="text-gray-400 hover:text-copper transition-colors text-sm">Funksjoner</a></li>
                <li><a href="#priser" className="text-gray-400 hover:text-copper transition-colors text-sm">Priser</a></li>
                <li><Link href="/login"><span className="text-gray-400 hover:text-copper transition-colors text-sm cursor-pointer">Logg inn</span></Link></li>
                <li><Link href="/register"><span className="text-gray-400 hover:text-copper transition-colors text-sm cursor-pointer">Registrer deg</span></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 text-sm uppercase tracking-wider">Selskapet</h4>
              <ul className="space-y-3">
                <li><span className="text-gray-500 text-sm">Om oss</span></li>
                <li><span className="text-gray-500 text-sm">Blogg</span></li>
                <li><span className="text-gray-500 text-sm">Kontakt</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 text-sm uppercase tracking-wider">Juridisk</h4>
              <ul className="space-y-3">
                <li><span className="text-gray-500 text-sm">Personvern</span></li>
                <li><span className="text-gray-500 text-sm">Vilkår</span></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
            © 2025 Vintage Garage. Alle rettigheter forbeholdt.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-[#1a1a1a] border border-white/5 hover:border-[#b87333]/30 transition-colors group">
      <div className="text-copper mb-5 w-12 h-12 bg-[#b87333]/10 rounded-xl flex items-center justify-center group-hover:bg-[#b87333] group-hover:text-white transition-colors">
        {React.cloneElement(icon as React.ReactElement<{ className: string }>, { className: "w-6 h-6" })}
      </div>
      <h3 className="text-base font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-[#b87333]/10 text-copper flex items-center justify-center text-2xl font-playfair font-bold mb-6 border border-[#b87333]/20">
        {number}
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{desc}</p>
    </div>
  );
}

function PricingCard({
  title, price, priceLabel, subtitle, features, btnText, btnHref, highlighted = false,
}: {
  title: string;
  price: string;
  priceLabel: string;
  subtitle?: string;
  features: string[];
  btnText: string;
  btnHref: string;
  highlighted?: boolean;
}) {
  return (
    <div className={`relative p-8 rounded-3xl backdrop-blur-xl bg-white/5 flex flex-col h-full ${highlighted ? "border-2 border-[#b87333]" : "border border-white/10"}`}>
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#b87333] text-white text-xs font-bold rounded-full uppercase tracking-wider">
          Anbefalt
        </div>
      )}
      <div className="mb-8 text-center">
        <h3 className="text-gray-400 font-medium tracking-widest uppercase mb-4 text-sm">{title}</h3>
        <div className="flex items-end justify-center gap-1">
          <span className="text-4xl font-playfair font-bold text-white">{price}</span>
          <span className="text-gray-400 mb-1">{priceLabel}</span>
        </div>
        {subtitle && <div className="text-sm text-gray-500 mt-2">{subtitle}</div>}
      </div>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-3 text-gray-300 text-sm">
            <Check className="w-4 h-4 text-copper shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link href={btnHref}>
        <span className={`flex items-center justify-center w-full h-12 rounded-lg text-sm font-medium transition-colors cursor-pointer ${highlighted ? "bg-[#b87333] hover:bg-[#9a5f2a] text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}>
          {btnText}
        </span>
      </Link>
    </div>
  );
}
