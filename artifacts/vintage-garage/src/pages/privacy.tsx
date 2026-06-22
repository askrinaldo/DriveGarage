import { LegalPageShell, LegalSection, LegalList } from "@/components/legal-page-shell";
import { Link } from "wouter";

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Personvernerklæring" lastUpdated="[Dato settes ved lansering]">

      <LegalSection title="1. Om denne erklæringen">
        <p>
          DriveGarage («vi», «oss», «tjenesten») tar personvernet ditt alvorlig. Denne erklæringen
          beskriver hvilke personopplysninger vi samler inn når du bruker DriveGarage, hvorfor vi
          samler dem inn, hvordan vi behandler dem, og hvilke rettigheter du har.
        </p>
        <p>
          Tjenesten er rettet mot privatpersoner i Norge og EU/EØS. Behandlingen av
          personopplysninger er underlagt EUs personvernforordning (GDPR) og norsk
          personopplysningslov.
        </p>
      </LegalSection>

      <LegalSection title="2. Dataansvarlig">
        <p>
          Dataansvarlig for behandlingen av dine personopplysninger er:
        </p>
        <div className="rounded-md border border-white/10 bg-white/[0.02] p-4 text-sm font-mono space-y-1">
          <p>DriveGarage AS</p>
          <p>[Adresse – fylles inn ved registrering]</p>
          <p>Organisasjonsnummer: [Fylles inn]</p>
          <p>E-post: kontakt@drivegarage.no</p>
        </div>
      </LegalSection>

      <LegalSection title="3. Personopplysninger vi behandler">
        <p><strong className="text-white">3.1 Kontoopplysninger (via Clerk)</strong></p>
        <p>
          Registrering og innlogging håndteres av Clerk Inc. (autentiseringstjeneste). Clerk kan
          samle inn og lagre: navn, e-postadresse, profilbilde, og tilknyttede sosiale kontoer
          (f.eks. Google-konto). Se Clerks personvernerklæring for detaljer om deres behandling.
        </p>

        <p className="mt-4"><strong className="text-white">3.2 Kjøretøy- og servicedata</strong></p>
        <LegalList items={[
          "Kjøretøyinformasjon: merke, modell, årsmodell, registreringsnummer, farge, kilometerstand, Finn.no-lenke, bilder, notater",
          "Serviceposter: tittel, kategori, dato, kostnad, utførerinfo, kilometerstand, beskrivelse",
          "Kvitteringer: beløp, leverandør, dato, fil-URL eller opplastet bilde, notater",
          "Turlogg: avstand, rute (fra/til), dato, drivstofforbruk, værinformasjon, notater",
        ]} />

        <p className="mt-4"><strong className="text-white">3.3 Klubbdata</strong></p>
        <LegalList items={[
          "Klubbmedlemskap: klubbnavn, rolle, innvitasjons-token",
          "Foruminnlegg og arrangementer du deltar i",
          "Markedsplassannonser du publiserer i en klubb",
        ]} />

        <p className="mt-4"><strong className="text-white">3.4 Opplastede filer</strong></p>
        <p>
          Dersom du laster opp bilder eller dokumenter (f.eks. kvitteringer), lagres disse hos vår
          fillagringstjeneste. [Leverandør spesifiseres ved lansering.]
        </p>

        <p className="mt-4"><strong className="text-white">3.5 Tekniske opplysninger</strong></p>
        <LegalList items={[
          "Preferanser lagret lokalt: tema (mørk/lys), språkvalg",
          "Autentiseringstoken lagret i nettleserens localStorage (club-tokens, admin-JWT)",
          "AI-chathistorikk lagret i sessionStorage (slettes ved lukking av nettleserfanen)",
          "Sidebarpreferanse lagret som informasjonskapsel (sidebar_state)",
          "Clerk-autentiseringskapsler (nødvendige for innlogging)",
        ]} />

        <p className="mt-4"><strong className="text-white">3.6 Betalingsinformasjon</strong></p>
        <p>
          Dersom du kjøper et betalt abonnement, behandles betalingsinformasjon av Stripe Inc.
          DriveGarage lagrer ikke kortopplysninger. Vi mottar kun bekreftelse på
          abonnementsstatus fra Stripe.
        </p>
      </LegalSection>

      <LegalSection title="4. Formål og behandlingsgrunnlag">
        <div className="space-y-4">
          <div>
            <p className="font-medium text-white mb-1">Levering av tjenesten</p>
            <p>Vi behandler data for å gi deg tilgang til og bruk av DriveGarage. Grunnlag: oppfyllelse av avtale (GDPR art. 6 (1) b).</p>
          </div>
          <div>
            <p className="font-medium text-white mb-1">Autentisering og sikkerhet</p>
            <p>Vi behandler tekniske opplysninger for å verifisere identitet og beskytte kontoen din. Grunnlag: oppfyllelse av avtale og berettiget interesse (GDPR art. 6 (1) b og f).</p>
          </div>
          <div>
            <p className="font-medium text-white mb-1">Betalingshåndtering</p>
            <p>Nødvendig for abonnementsadministrasjon. Grunnlag: oppfyllelse av avtale (GDPR art. 6 (1) b).</p>
          </div>
          <div>
            <p className="font-medium text-white mb-1">Juridiske forpliktelser</p>
            <p>Vi kan behandle opplysninger for å oppfylle regnskapsloven eller andre lovpålagte krav. Grunnlag: rettslig forpliktelse (GDPR art. 6 (1) c).</p>
          </div>
        </div>
        <p className="mt-4 text-amber-300/80 text-xs">
          [Behandlingsgrunnlag verifiseres av juridisk rådgiver før lansering.]
        </p>
      </LegalSection>

      <LegalSection title="5. Tredjeparter som behandler data på våre vegne">
        <div className="space-y-4">
          <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
            <p className="font-medium text-white mb-1">Clerk Inc. — Autentisering</p>
            <p className="text-xs">Behandler navn, e-post og innloggingsdata. Clerk er sertifisert under EU-U.S. Data Privacy Framework. Se <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">clerk.com/privacy</a>.</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
            <p className="font-medium text-white mb-1">Stripe Inc. — Betalingsbehandling</p>
            <p className="text-xs">Behandler betalingsinformasjon ved kjøp av abonnement. Se <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">stripe.com/privacy</a>.</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
            <p className="font-medium text-white mb-1">Drifts-/databaseleverandør</p>
            <p className="text-xs">[Leverandørnavn og DPA-status fylles inn ved lansering. Databehandleravtale (DPA) inngås.]</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
            <p className="font-medium text-white mb-1">Fillagring</p>
            <p className="text-xs">[Leverandørnavn for opplastede filer fylles inn ved lansering.]</p>
          </div>
        </div>
        <p className="mt-3 text-xs">
          Vi overfører ikke personopplysninger til tredjeparter for markedsforingsformål. Vi selger ikke brukerdata.
        </p>
      </LegalSection>

      <LegalSection title="6. Lagring og sletting">
        <p>
          Personopplysninger lagres så lenge kontoen din er aktiv. Dersom du sletter kontoen din,
          slettes tilknyttede brukerdata innen{" "}
          <span className="text-amber-300">[antall dager — fastsettes ved lansering]</span>.
          Visse opplysninger kan oppbevares lengre dersom vi er pålagt det ved lov (f.eks.
          regnskapsopplysninger i 5 år etter regnskapsloven § 13).
        </p>
        <p>
          Data du laster opp (bilder, filer) slettes ved kontosletting, med forbehold om tekniske
          forsinkelser hos tredjeparts fillagringstjeneste.
        </p>
        <p className="text-amber-300/80 text-xs">
          [Konkrete oppbevaringsperioder fastsettes og dokumenteres i intern behandlingsprotokoll.]
        </p>
      </LegalSection>

      <LegalSection title="7. Dine rettigheter">
        <p>Under GDPR har du følgende rettigheter:</p>
        <LegalList items={[
          "Innsyn (art. 15): du kan be om en kopi av dataene vi har om deg",
          "Retting (art. 16): du kan be oss rette uriktige opplysninger",
          "Sletting (art. 17): du kan be om sletting av dine data («rett til å bli glemt»)",
          "Begrensning (art. 18): du kan be oss begrense behandlingen i visse situasjoner",
          "Dataportabilitet (art. 20): du kan be om å få dataene dine i et maskinlesbart format",
          "Innsigelse (art. 21): du kan protestere mot behandling basert på berettiget interesse",
          "Tilbaketrekking av samtykke: der behandling er basert på samtykke, kan du trekke det tilbake",
        ]} />
        <p className="mt-3">
          For å utøve dine rettigheter, kontakt oss på{" "}
          <a href="mailto:kontakt@drivegarage.no" className="underline hover:text-white">
            kontakt@drivegarage.no
          </a>. Vi vil svare innen 30 dager.
        </p>
        <p className="text-amber-300/80 text-xs mt-2">
          [Selvbetjent eksport- og slettingsfunksjon planlegges i fremtidig versjon av appen.]
        </p>
      </LegalSection>

      <LegalSection title="8. Klagerett til Datatilsynet">
        <p>
          Dersom du mener at vår behandling av dine personopplysninger er i strid med
          personvernregelverket, har du rett til å klage til tilsynsmyndigheten:
        </p>
        <div className="rounded-md border border-white/10 bg-white/[0.02] p-4 text-sm">
          <p className="font-medium text-white mb-1">Datatilsynet</p>
          <p>Postboks 458 Sentrum, 0105 Oslo</p>
          <p>E-post: postkasse@datatilsynet.no</p>
          <p>Nettsted: <a href="https://www.datatilsynet.no" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">datatilsynet.no</a></p>
        </div>
      </LegalSection>

      <LegalSection title="9. Endringer i erklæringen">
        <p>
          Vi kan oppdatere denne erklæringen fra tid til annen. Vesentlige endringer vil varsles
          via e-post eller melding i appen. Dato for siste oppdatering fremgår øverst på siden.
        </p>
      </LegalSection>

      <LegalSection title="10. Kontakt">
        <p>
          Spørsmål om personvern kan sendes til:{" "}
          <a href="mailto:kontakt@drivegarage.no" className="underline hover:text-white">
            kontakt@drivegarage.no
          </a>
        </p>
        <p>
          Se også vår{" "}
          <Link href="/contact" className="underline hover:text-white">kontaktside</Link>.
        </p>
      </LegalSection>

    </LegalPageShell>
  );
}
