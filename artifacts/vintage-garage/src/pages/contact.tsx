import { LegalPageShell, LegalSection } from "@/components/legal-page-shell";
import { Link } from "wouter";
import { Mail, Clock, Shield } from "lucide-react";
import { CopyEmail } from "@/components/copy-email";

export default function ContactPage() {
  return (
    <LegalPageShell title="Kontakt og support">

      <LegalSection title="Ta kontakt med oss">
        <p>
          Vi hjelper gjerne med spørsmål om DriveGarage, din konto, personvern, eller tekniske
          problemer. Bruk e-post for raskest mulig svar.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-indigo-400" />
              <p className="font-medium text-white text-sm">Generell support</p>
            </div>
            <CopyEmail email="drivegarage@evolvit.no" />
            <p className="text-xs text-white/40 mt-2">
              Spørsmål om appen, konto, abonnement og generell brukerstøtte.
            </p>
          </div>

          <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-indigo-400" />
              <p className="font-medium text-white text-sm">Personvern og juridisk</p>
            </div>
            <CopyEmail email="drivegarage@evolvit.no" />
            <p className="text-xs text-white/40 mt-2">
              Forespørsler om dine personopplysninger, innsyn, retting og sletting.
            </p>
          </div>
        </div>
      </LegalSection>

      <LegalSection title="Selskapsinformasjon">
        <div className="rounded-md border border-white/[0.08] bg-white/[0.04] p-5 font-mono text-sm space-y-1.5">
          <p className="font-sans font-medium text-white mb-3">IT Løsninger No AS</p>
          <p className="text-white/50">Adresse: Sandnes, Norge</p>
          <p className="text-white/50">Organisasjonsnummer: 980 891 232</p>
          <p className="text-white/50 flex items-center gap-1.5">
            E-post: <CopyEmail email="drivegarage@evolvit.no" />
          </p>
        </div>
        <p className="text-amber-300/80 text-xs mt-3">
          [Selskapsopplysninger fylles inn ved registrering i Brønnøysundregistrene.]
        </p>
      </LegalSection>

      <LegalSection title="Responstid">
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <p>Vi tilstreber å svare på alle henvendelser innen <strong className="text-white">2 virkedager</strong>.</p>
            <p className="mt-1">For personvernrelaterte forespørsler (innsyn, sletting m.m.) svarer vi innen <strong className="text-white">30 dager</strong>, som påkrevd av GDPR.</p>
          </div>
        </div>
      </LegalSection>

      <LegalSection title="Juridiske sider">
        <p>Se også våre juridiske sider for fullstendig informasjon:</p>
        <div className="flex flex-wrap gap-3 mt-3">
          <Link
            href="/privacy"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.04] text-sm text-white/70 hover:bg-white/[0.07] hover:text-white transition-colors"
          >
            Personvernerklæring
          </Link>
          <Link
            href="/terms"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.04] text-sm text-white/70 hover:bg-white/[0.07] hover:text-white transition-colors"
          >
            Vilkår for bruk
          </Link>
          <Link
            href="/cookies"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.04] text-sm text-white/70 hover:bg-white/[0.07] hover:text-white transition-colors"
          >
            Informasjonskapsler
          </Link>
        </div>
      </LegalSection>

    </LegalPageShell>
  );
}
