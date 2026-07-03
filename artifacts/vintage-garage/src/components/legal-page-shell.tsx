import { Link } from "wouter";
import { Car, ArrowLeft, AlertTriangle } from "lucide-react";
import { CompanyInfo } from "@/components/company-info";

interface LegalPageShellProps {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export function LegalPageShell({ title, lastUpdated, children }: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <Car className="w-4 h-4 text-foreground" />
            </div>
            <span className="text-lg font-bold">DriveGarage</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Tilbake til forsiden
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 pb-24">
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 mb-10">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300/90 leading-relaxed">
            <strong className="text-amber-300">UTKAST — Ikke endelig.</strong>{" "}
            Denne siden er under utarbeidelse og krever gjennomgang av en juridisk rådgiver med kompetanse innen norsk og EU-rett før lansering. Innholdet utgjør ikke juridisk rådgivning.
          </p>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>
        {lastUpdated && (
          <p className="text-sm text-muted-foreground mb-10">Sist oppdatert: {lastUpdated}</p>
        )}

        <div className="prose-legal">{children}</div>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-4 text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span>© {new Date().getFullYear()} IT Løsninger No AS. Alle rettigheter forbeholdes.</span>
            <div className="flex items-center gap-5">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Personvern</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Vilkår</Link>
              <Link href="/cookies" className="hover:text-foreground transition-colors">Informasjonskapsler</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Kontakt</Link>
            </div>
          </div>
          <CompanyInfo className="text-muted-foreground/70 leading-relaxed" />
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-foreground mb-4 pb-2 border-b border-border">{title}</h2>
      <div className="space-y-3 text-foreground/80 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-foreground/80 text-sm leading-relaxed list-none">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-indigo-400 mt-0.5 shrink-0">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
