import { Link } from "wouter";
import { Car, ArrowLeft, AlertTriangle } from "lucide-react";
import { CompanyInfo } from "@/components/company-info";

interface LegalPageShellProps {
  title: string;
  lastUpdated?: string;
  showDraftBanner?: boolean;
  children: React.ReactNode;
}

export function LegalPageShell({ title, lastUpdated, showDraftBanner = false, children }: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-[#080808] text-white antialiased">
      <header
        className="sticky top-0 z-50"
        style={{
          background: "rgba(8,8,8,0.92)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="max-w-5xl mx-auto px-6 h-[66px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
              <Car className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="text-[16px] font-bold tracking-[-0.02em] text-white">DriveGarage</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-[13.5px] text-white/40 hover:text-white transition-colors duration-200">
            <ArrowLeft className="w-4 h-4" />
            Tilbake til forsiden
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 pb-24">
        {showDraftBanner && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 mb-10">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300/90 leading-relaxed">
              <strong className="text-amber-300">UTKAST — Ikke endelig.</strong>{" "}
              Denne siden er under utarbeidelse og krever gjennomgang av en juridisk rådgiver med kompetanse innen norsk og EU-rett før lansering. Innholdet utgjør ikke juridisk rådgivning.
            </p>
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-[-0.03em] mb-3">{title}</h1>
        {lastUpdated && (
          <p className="text-sm text-white/30 mb-10">Sist oppdatert: {lastUpdated}</p>
        )}

        <div className="prose-legal">{children}</div>
      </main>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} className="bg-[#050505]">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[12px] text-white/20">© {new Date().getFullYear()} IT Løsninger No AS. Alle rettigheter forbeholdes.</span>
          <div className="flex items-center gap-5 text-[12px] text-white/20">
            <Link href="/privacy" className="hover:text-white/40 transition-colors">Personvern</Link>
            <Link href="/terms" className="hover:text-white/40 transition-colors">Vilkår</Link>
            <Link href="/cookies" className="hover:text-white/40 transition-colors">Informasjonskapsler</Link>
            <Link href="/contact" className="hover:text-white/40 transition-colors">Kontakt</Link>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 pb-6">
          <CompanyInfo className="text-[11px] text-white/15 leading-relaxed" />
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2
        className="text-xl font-semibold text-white mb-4 pb-2"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {title}
      </h2>
      <div className="space-y-3 text-white/75 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-white/75 text-sm leading-relaxed list-none">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-indigo-400 mt-0.5 shrink-0">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
