import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  ChevronRight,
  Menu,
  BookOpen,
  Archive,
  Wrench,
  History,
  Users,
  MessageSquare,
  Calendar,
  Repeat,
  Bot,
  Cloud,
  ArrowRight,
  PlayCircle
} from 'lucide-react';

export function Filmisk() {
  return (
    <div className="min-h-[4000px] bg-black text-white font-sans selection:bg-amber-500 selection:text-black">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;700&display=swap');
        .font-oswald { font-family: 'Oswald', sans-serif; }
      `}} />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white flex items-center justify-center">
              <span className="text-black font-oswald font-bold text-xl leading-none">V</span>
            </div>
            <span className="font-oswald text-2xl font-bold tracking-widest uppercase">DriveGarage</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium tracking-widest uppercase text-white/70">
            <a href="#funksjoner" className="hover:text-white transition-colors">Funksjoner</a>
            <a href="#priser" className="hover:text-white transition-colors">Priser</a>
            <a href="#logg-inn" className="hover:text-white transition-colors">Logg inn</a>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase tracking-widest rounded-none h-10 px-6">
              Opprett konto
            </Button>
          </div>
          <button className="md:hidden text-white">
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-40 overflow-hidden border-b-[20px] border-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-black to-black pointer-events-none" />
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <Badge className="bg-white/10 text-amber-500 hover:bg-white/20 uppercase tracking-[0.3em] rounded-none px-4 py-1.5 mb-12 border border-white/20">
            Norges beste plattform
          </Badge>
          
          <h1 className="font-oswald text-6xl md:text-8xl lg:text-[120px] leading-[0.9] font-bold uppercase tracking-tighter mb-8 max-w-5xl">
            Samle <span className="text-amber-500">hele historien</span> til kjøretøyet ditt
          </h1>
          
          <p className="text-lg md:text-2xl text-white/60 max-w-2xl font-light mb-16 leading-relaxed">
            Lagre servicehistorikk, restaureringer, dokumenter og bilder på ett sted. Sikker, skybasert og laget for entusiaster.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
            <Button className="bg-white hover:bg-neutral-200 text-black font-oswald text-xl uppercase tracking-widest rounded-none h-16 px-12 group">
              Opprett konto gratis
              <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white hover:text-black font-oswald text-xl uppercase tracking-widest rounded-none h-16 px-12 bg-transparent group">
              <PlayCircle className="mr-3 w-6 h-6 text-amber-500 group-hover:text-black transition-colors" />
              Se funksjoner
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-amber-500 text-black py-16 border-b border-black">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 text-center divide-x divide-black/20">
            <div className="flex flex-col">
              <span className="font-oswald text-5xl md:text-7xl font-bold tracking-tighter">12k+</span>
              <span className="uppercase tracking-widest text-sm font-semibold mt-2">Kjøretøy</span>
            </div>
            <div className="flex flex-col">
              <span className="font-oswald text-5xl md:text-7xl font-bold tracking-tighter">500+</span>
              <span className="uppercase tracking-widest text-sm font-semibold mt-2">Klubber</span>
            </div>
            <div className="flex flex-col">
              <span className="font-oswald text-5xl md:text-7xl font-bold tracking-tighter">45k+</span>
              <span className="uppercase tracking-widest text-sm font-semibold mt-2">Dokumenter</span>
            </div>
            <div className="flex flex-col">
              <span className="font-oswald text-5xl md:text-7xl font-bold tracking-tighter">100%</span>
              <span className="uppercase tracking-widest text-sm font-semibold mt-2">Lidenskap</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funksjoner" className="py-32 bg-white text-black border-b-[20px] border-black">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 border-b-4 border-black pb-8">
            <h2 className="font-oswald text-5xl md:text-8xl font-bold uppercase tracking-tighter">
              Alt du <span className="text-amber-500">trenger</span>
            </h2>
            <p className="text-xl md:text-2xl font-light max-w-md mt-6 md:mt-0 leading-relaxed text-neutral-600">
              Et komplett økosystem bygget for å bevare den klassiske motorarven.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
            {[
              { num: '01', title: 'Digital servicebok', desc: 'Aldri mist en servicehistorikk igjen. Loggfør alt med dato og kilometerstand.', icon: BookOpen },
              { num: '02', title: 'Kvitteringsarkiv', desc: 'Skann og lagre kvitteringer for deler og arbeid. Få full oversikt over kostnader.', icon: Archive },
              { num: '03', title: 'Restaureringslogg', desc: 'Dokumenter restaureringsprosjekter steg for steg med bilder og notater.', icon: Wrench },
              { num: '04', title: 'Kjøretøyhistorikk', desc: 'Bygg en komplett tidslinje for kjøretøyets liv, fra fabrikk til i dag.', icon: History },
              { num: '05', title: 'Klubber', desc: 'Koble deg til likesinnede, administrer medlemskap og delta i diskusjoner.', icon: Users },
              { num: '06', title: 'Forum', desc: 'Få hjelp fra eksperter, del erfaringer og diskuter alt fra motor til lakk.', icon: MessageSquare },
              { num: '07', title: 'Arrangementer', desc: 'Finn og delta på treff, løp og utstillinger i ditt nærområde.', icon: Calendar },
              { num: '08', title: 'Eierskapsoverføring', desc: 'Overfør hele kjøretøyets digitale historie til ny eier med ett klikk.', icon: Repeat },
              { num: '09', title: 'AI-assistent', desc: 'Få smarte forslag til vedlikehold basert på kjøretøyets modell og alder.', icon: Bot },
              { num: '10', title: 'Skybasert lagring', desc: 'Dine data er trygt lagret i skyen og tilgjengelig fra alle enheter.', icon: Cloud },
            ].map((feature, i) => (
              <div key={i} className="flex gap-6 group cursor-pointer">
                <div className="font-oswald text-4xl md:text-6xl font-bold text-neutral-300 group-hover:text-amber-500 transition-colors">
                  {feature.num}
                </div>
                <div>
                  <h3 className="font-oswald text-2xl md:text-3xl font-bold uppercase tracking-wide mb-3 flex items-center gap-3">
                    <feature.icon className="w-6 h-6 text-amber-500" />
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600 text-lg leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 bg-black text-white relative">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
        
        <div className="container mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="font-oswald text-5xl md:text-7xl font-bold uppercase tracking-tighter mb-6">
              Slik <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-300">fungerer det</span>
            </h2>
            <div className="w-24 h-1 bg-amber-500 mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-white/10 z-0" />
            
            {[
              { step: '1', title: 'Opprett konto', desc: 'Registrer deg på få sekunder og få tilgang til garasjen.' },
              { step: '2', title: 'Registrer kjøretøy', desc: 'Legg til bil eller MC med skiltnummer eller understellsnummer.' },
              { step: '3', title: 'Last opp', desc: 'Legg til kvitteringer, bilder og servicehistorikk fortløpende.' },
              { step: '4', title: 'Bevar verdien', desc: 'En komplett historikk øker verdien ved et eventuelt salg.' },
            ].map((item, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-black border-4 border-amber-500 flex items-center justify-center font-oswald text-4xl font-bold mb-8 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                  {item.step}
                </div>
                <h3 className="font-oswald text-2xl font-bold uppercase tracking-wide mb-4">{item.title}</h3>
                <p className="text-white/60 text-lg leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="priser" className="py-32 bg-neutral-900 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="font-oswald text-5xl md:text-7xl font-bold uppercase tracking-tighter mb-6 text-white">
              Velg din <span className="text-amber-500">garasje</span>
            </h2>
            <p className="text-xl text-white/60">Gjennomsiktige priser. Ingen skjulte avgifter.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free */}
            <Card className="bg-black border-2 border-white/20 text-white p-8 rounded-none flex flex-col">
              <div className="mb-8">
                <h3 className="font-oswald text-3xl font-bold uppercase tracking-wide mb-2">Gratis</h3>
                <p className="text-white/60">For entusiasten som nettopp har startet.</p>
              </div>
              <div className="mb-8 border-b border-white/20 pb-8">
                <span className="font-oswald text-6xl font-bold tracking-tighter">Kr 0</span>
                <span className="text-white/60 uppercase tracking-widest ml-2">/mnd</span>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {['1 kjøretøy', '500 MB lagring', 'Digital servicebok', 'Kvitteringsarkiv', 'Tilgang til forum'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-lg">
                    <Check className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <span className="text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full bg-white hover:bg-neutral-200 text-black font-oswald text-xl uppercase tracking-widest rounded-none h-14">
                Start gratis
              </Button>
            </Card>

            {/* Premium */}
            <Card className="bg-white border-none text-black p-8 rounded-none flex flex-col relative transform lg:-translate-y-4 shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-2 bg-amber-500" />
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-6 py-1 font-oswald font-bold uppercase tracking-widest text-sm">
                Anbefalt
              </div>
              <div className="mb-8 mt-4">
                <h3 className="font-oswald text-3xl font-bold uppercase tracking-wide mb-2">Premium</h3>
                <p className="text-black/60">Den ultimate samlerens verktøykasse.</p>
              </div>
              <div className="mb-8 border-b border-black/10 pb-8">
                <span className="font-oswald text-6xl font-bold tracking-tighter">Kr 99</span>
                <span className="text-black/60 uppercase tracking-widest ml-2">/mnd</span>
                <p className="text-sm text-black/50 mt-2 font-medium">eller kr 799/år</p>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {['Ubegrenset kjøretøy', 'Ubegrenset lagring', 'Alt i Standard', 'AI-assistent', 'PDF-rapporter for salg', 'Prioritert support'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-lg font-medium">
                    <Check className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-oswald text-xl uppercase tracking-widest rounded-none h-14">
                Velg Premium
              </Button>
            </Card>

            {/* Standard */}
            <Card className="bg-black border-2 border-white/20 text-white p-8 rounded-none flex flex-col">
              <div className="mb-8">
                <h3 className="font-oswald text-3xl font-bold uppercase tracking-wide mb-2">Standard</h3>
                <p className="text-white/60">For den aktive eieren med flere kjøretøy.</p>
              </div>
              <div className="mb-8 border-b border-white/20 pb-8">
                <span className="font-oswald text-6xl font-bold tracking-tighter">Kr 50</span>
                <span className="text-white/60 uppercase tracking-widest ml-2">/mnd</span>
                <p className="text-sm text-white/50 mt-2">eller kr 300/år</p>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {['Ubegrenset kjøretøy', '10 GB lagring', 'Klubber & Arrangementer', 'Restaureringslogg', 'Eierskapsoverføring'].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-lg">
                    <Check className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <span className="text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full bg-transparent border-2 border-white hover:bg-white hover:text-black text-white font-oswald text-xl uppercase tracking-widest rounded-none h-14 transition-colors">
                Velg Standard
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-40 bg-amber-500 text-black relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute -top-[50%] -right-[10%] w-[100%] h-[200%] bg-white/10 rotate-12 pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-full border-[20px] border-black pointer-events-none" />
        
        <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
          <h2 className="font-oswald text-6xl md:text-[100px] leading-[0.9] font-bold uppercase tracking-tighter mb-8 max-w-4xl">
            Klar til å starte <br/>motoren?
          </h2>
          <p className="text-2xl mb-12 font-medium">Bli med tusenvis av andre entusiaster i dag.</p>
          <Button className="bg-black hover:bg-neutral-800 text-white font-oswald text-2xl uppercase tracking-widest rounded-none h-20 px-16 group shadow-2xl">
            Opprett konto nå
            <ArrowRight className="ml-4 w-8 h-8 group-hover:translate-x-2 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black pt-24 pb-12 border-t border-white/20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-white flex items-center justify-center">
                  <span className="text-black font-oswald font-bold text-2xl leading-none">V</span>
                </div>
                <span className="font-oswald text-3xl font-bold tracking-widest uppercase text-white">DriveGarage</span>
              </div>
              <p className="text-white/60 text-lg max-w-md leading-relaxed">
                Norges beste plattform for å bevare historien til klassiske kjøretøy. Bygget av entusiaster, for entusiaster.
              </p>
            </div>
            
            <div>
              <h4 className="font-oswald text-xl font-bold uppercase tracking-widest mb-6 text-white">Plattform</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-white/60 hover:text-amber-500 transition-colors uppercase tracking-wider text-sm font-medium">Funksjoner</a></li>
                <li><a href="#" className="text-white/60 hover:text-amber-500 transition-colors uppercase tracking-wider text-sm font-medium">Priser</a></li>
                <li><a href="#" className="text-white/60 hover:text-amber-500 transition-colors uppercase tracking-wider text-sm font-medium">Klubber</a></li>
                <li><a href="#" className="text-white/60 hover:text-amber-500 transition-colors uppercase tracking-wider text-sm font-medium">Arrangementer</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-oswald text-xl font-bold uppercase tracking-widest mb-6 text-white">Selskap</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-white/60 hover:text-amber-500 transition-colors uppercase tracking-wider text-sm font-medium">Om oss</a></li>
                <li><a href="#" className="text-white/60 hover:text-amber-500 transition-colors uppercase tracking-wider text-sm font-medium">Kontakt</a></li>
                <li><a href="#" className="text-white/60 hover:text-amber-500 transition-colors uppercase tracking-wider text-sm font-medium">Personvern</a></li>
                <li><a href="#" className="text-white/60 hover:text-amber-500 transition-colors uppercase tracking-wider text-sm font-medium">Vilkår</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm tracking-wider uppercase">
              © {new Date().getFullYear()} DriveGarage. Alle rettigheter reservert.
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-white/5 hover:bg-amber-500 transition-colors cursor-pointer flex items-center justify-center rounded-full" />
              <div className="w-10 h-10 bg-white/5 hover:bg-amber-500 transition-colors cursor-pointer flex items-center justify-center rounded-full" />
              <div className="w-10 h-10 bg-white/5 hover:bg-amber-500 transition-colors cursor-pointer flex items-center justify-center rounded-full" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
