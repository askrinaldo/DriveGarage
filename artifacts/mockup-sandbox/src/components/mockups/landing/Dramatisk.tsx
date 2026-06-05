import React from "react";
import { 
  Menu, X, BookOpen, Receipt, Wrench, Clock, Users, MessageSquare, 
  Calendar, ArrowRightLeft, Bot, Cloud, Check, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function Dramatisk() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-gray-300 font-sans relative overflow-hidden">
      {/* Font & Global Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
        
        .font-playfair {
          font-family: 'Playfair Display', serif;
        }
        
        .noise-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.03;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        
        .copper-gradient {
          background: linear-gradient(135deg, #b87333, #cd853f, #8a5a2b);
        }
        
        .copper-text {
          background: linear-gradient(135deg, #cd853f, #b87333);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .copper-border-glow:hover {
          border-color: #b87333;
          box-shadow: 0 0 15px rgba(184, 115, 51, 0.2);
        }
      `}} />

      <div className="noise-bg"></div>

      {/* Navbar */}
      <nav className="relative z-50 border-b border-white/5 bg-[#0d0d0d]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex-shrink-0 flex items-center gap-2">
              <Wrench className="w-8 h-8 text-[#b87333]" />
              <span className="font-playfair text-2xl font-bold text-white tracking-wide">Vintage<span className="text-[#b87333]">Garage</span></span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#funksjoner" className="text-sm font-medium hover:text-[#cd853f] transition-colors">Funksjoner</a>
              <a href="#hvordan" className="text-sm font-medium hover:text-[#cd853f] transition-colors">Slik fungerer det</a>
              <a href="#priser" className="text-sm font-medium hover:text-[#cd853f] transition-colors">Priser</a>
              <a href="#logg-inn" className="text-sm font-medium hover:text-[#cd853f] transition-colors">Logg inn</a>
              <Button className="bg-[#b87333] hover:bg-[#a0632a] text-white border-0 rounded-none px-6">
                Opprett konto
              </Button>
            </div>
            
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-300 hover:text-white">
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#151515] border-b border-white/10 px-2 pt-2 pb-4 space-y-1 sm:px-3">
            <a href="#funksjoner" className="block px-3 py-2 text-base font-medium hover:text-[#cd853f]">Funksjoner</a>
            <a href="#priser" className="block px-3 py-2 text-base font-medium hover:text-[#cd853f]">Priser</a>
            <a href="#logg-inn" className="block px-3 py-2 text-base font-medium hover:text-[#cd853f]">Logg inn</a>
            <Button className="w-full mt-2 bg-[#b87333] hover:bg-[#a0632a] text-white rounded-none">
              Opprett konto
            </Button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-32 md:pt-40 md:pb-48 px-4 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800/20 via-[#0d0d0d] to-[#0d0d0d]"></div>
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#b87333]/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-playfair text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-tight mb-8">
            Samle hele historien til <br className="hidden md:block"/>
            <span className="copper-text italic">kjøretøyet ditt</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto font-light leading-relaxed">
            Lagre servicehistorikk, restaureringer, dokumenter og bilder på ett sted. Bygget for ekte entusiaster.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button className="bg-[#b87333] hover:bg-[#a0632a] text-white text-lg px-8 py-6 h-auto rounded-none w-full sm:w-auto">
              Opprett konto gratis
            </Button>
            <Button variant="outline" className="border-[#b87333]/50 text-white hover:bg-[#b87333]/10 bg-transparent text-lg px-8 py-6 h-auto rounded-none w-full sm:w-auto">
              Se funksjoner
            </Button>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section className="relative z-10 py-16 border-y border-white/5 bg-black/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="font-playfair text-4xl md:text-5xl text-white mb-2">12 000+</div>
              <div className="text-sm tracking-widest uppercase text-[#b87333] font-semibold">Kjøretøy</div>
            </div>
            <div>
              <div className="font-playfair text-4xl md:text-5xl text-white mb-2">500+</div>
              <div className="text-sm tracking-widest uppercase text-[#b87333] font-semibold">Klubber</div>
            </div>
            <div>
              <div className="font-playfair text-4xl md:text-5xl text-white mb-2">45 000+</div>
              <div className="text-sm tracking-widest uppercase text-[#b87333] font-semibold">Dokumenter</div>
            </div>
            <div>
              <div className="font-playfair text-4xl md:text-5xl text-white mb-2">1900-tallet</div>
              <div className="text-sm tracking-widest uppercase text-[#b87333] font-semibold">Tidsepokene</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funksjoner" className="relative z-10 py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="font-playfair text-4xl md:text-5xl text-white mb-6">Alt du trenger til garasjen</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              En komplett verktøykasse designet spesifikt for å ta vare på historikken og verdien til ditt klassiske kjøretøy.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {[
              { icon: BookOpen, title: "Digital servicebok", desc: "Komplett oversikt over alt vedlikehold med dato og km-stand." },
              { icon: Receipt, title: "Kvitteringsarkiv", desc: "Skann og lagre alle kvitteringer for deler og verkstedbesøk." },
              { icon: Wrench, title: "Restaureringslogg", desc: "Dokumenter prosjektet ditt med bilder før, under og etter." },
              { icon: Clock, title: "Kjøretøyhistorikk", desc: "Tidligere eiere, historiske bilder og gamle registreringsnummer." },
              { icon: Users, title: "Klubber", desc: "Bli med i merkeklubber og del erfaringer med likesinnede." },
              { icon: MessageSquare, title: "Forum", desc: "Spør om råd, del kunnskap og diskuter tekniske utfordringer." },
              { icon: Calendar, title: "Arrangementer", desc: "Oversikt over treff, løp og utstillinger i ditt nærområde." },
              { icon: ArrowRightLeft, title: "Eierskapsoverføring", desc: "Overfør hele den digitale historikken ved salg." },
              { icon: Bot, title: "AI-assistent", desc: "Få hjelp til å tyde gamle manualer eller feilsøke problemer." },
              { icon: Cloud, title: "Skybasert lagring", desc: "Trygg lagring av dine uvurderlige data med automatisk backup." }
            ].map((feature, i) => (
              <Card key={i} className="bg-[#151515] border-white/10 p-6 rounded-none copper-border-glow transition-all duration-300 group">
                <feature.icon className="w-10 h-10 text-[#cd853f] mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="hvordan" className="relative z-10 py-24 bg-black/60 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="font-playfair text-4xl md:text-5xl text-white mb-6">Slik fungerer det</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Kom i gang på få minutter og sikre kjøretøyets historie for fremtiden.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Opprett konto", desc: "Registrer deg gratis og sett opp din profil." },
              { step: "02", title: "Registrer kjøretøy", desc: "Legg inn reg.nr, understellsnummer og grunnleggende info." },
              { step: "03", title: "Last opp dokumentasjon", desc: "Legg til bilder, servicehistorikk og skannede kvitteringer." },
              { step: "04", title: "Overfør historikken", desc: "Når bilen selges, overføres hele permen til ny eier digitalt." }
            ].map((step, i) => (
              <div key={i} className="relative text-center md:text-left p-6">
                <div className="font-playfair text-6xl text-[#b87333]/20 font-bold absolute top-0 left-6 -z-10">{step.step}</div>
                <h3 className="text-xl font-semibold text-white mt-4 mb-3">{step.title}</h3>
                <p className="text-gray-400">{step.desc}</p>
                {i < 3 && <ArrowRight className="hidden md:block absolute right-[-20px] top-1/2 -translate-y-1/2 text-white/20 w-8 h-8" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="priser" className="relative z-10 py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="font-playfair text-4xl md:text-5xl text-white mb-6">Priser</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Velg pakken som passer din garasje. Ingen skjulte kostnader.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Gratis */}
            <Card className="bg-[#151515] border-white/10 p-8 rounded-none flex flex-col">
              <h3 className="text-2xl font-bold text-white mb-2">GRATIS</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">kr 0</span>
              </div>
              <p className="text-gray-400 mb-8 border-b border-white/10 pb-8">
                Perfekt for å teste ut plattformen eller for deg med ett enkelt kjøretøy.
              </p>
              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="text-[#b87333] w-5 h-5" /> 1 kjøretøy
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="text-[#b87333] w-5 h-5" /> 500 MB lagring
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="text-[#b87333] w-5 h-5" /> Digital servicebok
                </li>
              </ul>
              <Button variant="outline" className="w-full rounded-none border-white/20 text-white hover:bg-white/5 bg-transparent">
                Kom i gang
              </Button>
            </Card>

            {/* Premium (Highlighted) */}
            <div className="relative p-[2px] copper-gradient transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#151515] px-4 py-1 text-xs font-bold uppercase tracking-widest text-[#cd853f] border border-[#b87333]">
                Mest populær
              </div>
              <Card className="bg-[#0d0d0d] border-0 p-8 rounded-none flex flex-col h-full shadow-[0_0_30px_rgba(184,115,51,0.15)]">
                <h3 className="text-2xl font-bold text-white mb-2">PREMIUM</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-[#cd853f]">kr 99</span>
                  <span className="text-gray-500"> /mnd</span>
                  <div className="text-sm text-gray-500 mt-1">eller kr 799/år</div>
                </div>
                <p className="text-gray-400 mb-8 border-b border-white/10 pb-8">
                  For storsamleren og feinschmeckeren som vil ha det aller beste.
                </p>
                <ul className="space-y-4 mb-8 flex-grow">
                  <li className="flex items-center gap-3 text-white">
                    <Check className="text-[#b87333] w-5 h-5" /> Ubegrenset kjøretøy
                  </li>
                  <li className="flex items-center gap-3 text-white">
                    <Check className="text-[#b87333] w-5 h-5" /> Ubegrenset lagring
                  </li>
                  <li className="flex items-center gap-3 text-white">
                    <Check className="text-[#b87333] w-5 h-5" /> PDF-rapporter
                  </li>
                  <li className="flex items-center gap-3 text-white">
                    <Check className="text-[#b87333] w-5 h-5" /> AI-assistent
                  </li>
                  <li className="flex items-center gap-3 text-white">
                    <Check className="text-[#b87333] w-5 h-5" /> Alle Standard-funksjoner
                  </li>
                </ul>
                <Button className="w-full rounded-none bg-[#b87333] hover:bg-[#a0632a] text-white">
                  Velg Premium
                </Button>
              </Card>
            </div>

            {/* Standard */}
            <Card className="bg-[#151515] border-white/10 p-8 rounded-none flex flex-col">
              <h3 className="text-2xl font-bold text-white mb-2">STANDARD</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">kr 50</span>
                <span className="text-gray-500"> /mnd</span>
                <div className="text-sm text-gray-500 mt-1">eller kr 300/år</div>
              </div>
              <p className="text-gray-400 mb-8 border-b border-white/10 pb-8">
                For den aktive entusiasten med flere prosjekter i garasjen.
              </p>
              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="text-[#b87333] w-5 h-5" /> Ubegrenset kjøretøy
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="text-[#b87333] w-5 h-5" /> 10 GB lagring
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="text-[#b87333] w-5 h-5" /> Klubbtilgang
                </li>
                <li className="flex items-center gap-3 text-gray-300">
                  <Check className="text-[#b87333] w-5 h-5" /> Arrangementer
                </li>
              </ul>
              <Button variant="outline" className="w-full rounded-none border-white/20 text-white hover:bg-white/5 bg-transparent">
                Velg Standard
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#b87333]/20 via-[#0d0d0d] to-[#0d0d0d] border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="font-playfair text-5xl md:text-6xl text-white mb-8">Klar til å starte?</h2>
          <p className="text-xl text-gray-400 mb-10 font-light">
            Bli med over 12 000 andre entusiaster og sikre historikken til ditt kjøretøy i dag.
          </p>
          <Button className="bg-[#b87333] hover:bg-[#a0632a] text-white text-xl px-12 py-8 h-auto rounded-none shadow-[0_0_40px_rgba(184,115,51,0.3)]">
            Opprett konto nå
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <Wrench className="w-6 h-6 text-[#b87333]" />
                <span className="font-playfair text-xl font-bold text-white tracking-wide">Vintage<span className="text-[#b87333]">Garage</span></span>
              </div>
              <p className="text-gray-500 text-sm">
                Norges beste digitale plattform for veteranbiler og klassiske motorsykler. Laget av entusiaster, for entusiaster.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Plattform</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-[#cd853f]">Funksjoner</a></li>
                <li><a href="#" className="hover:text-[#cd853f]">Priser</a></li>
                <li><a href="#" className="hover:text-[#cd853f]">Klubber</a></li>
                <li><a href="#" className="hover:text-[#cd853f]">Arrangementer</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Ressurser</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-[#cd853f]">Hjelpesenter</a></li>
                <li><a href="#" className="hover:text-[#cd853f]">Forum</a></li>
                <li><a href="#" className="hover:text-[#cd853f]">Blogg</a></li>
                <li><a href="#" className="hover:text-[#cd853f]">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Selskap</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-[#cd853f]">Om oss</a></li>
                <li><a href="#" className="hover:text-[#cd853f]">Kontakt</a></li>
                <li><a href="#" className="hover:text-[#cd853f]">Personvern</a></li>
                <li><a href="#" className="hover:text-[#cd853f]">Vilkår</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm">
              &copy; {new Date().getFullYear()} VintageGarage AS. Med enerett.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-600 hover:text-[#cd853f]">
                <span className="sr-only">Facebook</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg>
              </a>
              <a href="#" className="text-gray-600 hover:text-[#cd853f]">
                <span className="sr-only">Instagram</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
