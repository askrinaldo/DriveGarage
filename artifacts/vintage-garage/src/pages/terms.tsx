import { LegalPageShell, LegalSection, LegalList } from "@/components/legal-page-shell";
import { Link } from "wouter";

export default function TermsPage() {
  return (
    <LegalPageShell title="Vilkår for bruk" lastUpdated="[Dato settes ved lansering]">

      <LegalSection title="1. Om tjenesten">
        <p>
          DriveGarage er en digital vedlikeholdslogg og plattform for klassiske biler og
          motorsykler, drevet av DriveGarage AS («vi», «oss», «tjenesten»). Ved å opprette en konto
          og bruke tjenesten godtar du disse vilkårene.
        </p>
        <p>
          Tjenesten tilbyr: vedlikeholdslogg, kvitteringsarkiv, turlogg, klubbfunksjoner,
          markedsplass, og AI-baserte råd.
        </p>
      </LegalSection>

      <LegalSection title="2. Brukerkonto og ansvar">
        <LegalList items={[
          "Du må være minst 18 år for å opprette en konto, eller ha tillatelse fra foresatte.",
          "Du er ansvarlig for å holde innloggingsinformasjonen din sikker.",
          "Du kan ikke dele kontoen din med andre.",
          "Én konto per person. Automatisk oppretting av kontoer er ikke tillatt.",
          "Du plikter å oppgi korrekte opplysninger ved registrering.",
          "Varsle oss umiddelbart om uautorisert bruk av kontoen din.",
        ]} />
      </LegalSection>

      <LegalSection title="3. Akseptabel bruk">
        <p>Du plikter å bruke tjenesten i samsvar med norsk og EU-lov. Følgende er ikke tillatt:</p>
        <LegalList items={[
          "Publisere ulovlig, støtende eller villedende innhold",
          "Krenke andres personvern eller immaterielle rettigheter",
          "Forsøke å hacke, omgå eller forstyrre tjenestens sikkerhet",
          "Bruke tjenesten til spam, phishing eller annen skadelig aktivitet",
          "Automatisert innhøsting av data (scraping) uten skriftlig tillatelse",
          "Publisere andres personopplysninger uten samtykke",
        ]} />
        <p>
          Vi forbeholder oss retten til å suspendere eller avslutte kontoer som bryter disse
          vilkårene, uten forvarsel i alvorlige tilfeller.
        </p>
      </LegalSection>

      <LegalSection title="4. Eierskap til data og innhold">
        <p>
          <strong className="text-white">Du eier dine data.</strong> Kjøretøydata, serviceposter,
          kvitteringer, turlogger og annet innhold du registrerer i DriveGarage tilhører deg.
        </p>
        <p>
          Ved å bruke tjenesten gir du oss en begrenset, ikke-eksklusiv lisens til å lagre,
          behandle og vise ditt innhold utelukkende for å levere tjenesten til deg.
        </p>
        <p>
          Vi bruker ikke ditt innhold til markedsføring, dataanalyse eller videreutvikling uten
          ditt eksplisitte samtykke. Vi selger ikke dine data.
        </p>
        <p>
          Funksjonalitet for eksport og sletting av egne data{" "}
          <span className="text-amber-300">[planlegges — tidsplan fastsettes ved lansering]</span>.
        </p>
      </LegalSection>

      <LegalSection title="5. Abonnement og betaling">
        <p>
          DriveGarage tilbyr gratisnivå og betalte abonnementer. Betalingsbehandling utføres av
          Stripe Inc. Abonnementer fornyes automatisk med mindre de sies opp.
        </p>
        <LegalList items={[
          "Priser oppgis inkl. MVA der det er aktuelt",
          "Oppsigelse kan gjøres når som helst; tilgang beholdes til periodens slutt",
          "Refusjon ytes i henhold til norsk angrerettlov der det er aktuelt",
          "Vi forbeholder oss retten til å justere priser med 30 dagers varsel",
        ]} />
        <p className="text-amber-300/80 text-xs">
          [Betalingsvilkår gjennomgås av juridisk rådgiver og tilpasses til angrerettloven.]
        </p>
      </LegalSection>

      <LegalSection title="6. Tilgjengelighet og endringer">
        <p>
          Vi tilstreber høy oppetid, men garanterer ikke uavbrutt tilgang. Planlagt vedlikehold
          varsles i god tid. Vi forbeholder oss retten til å endre, suspendere eller avvikle deler
          av tjenesten med rimelig varsel.
        </p>
        <p>
          Vi kan oppdatere disse vilkårene. Ved vesentlige endringer varsles du via e-post minst
          30 dager i forveien. Fortsatt bruk etter ikrafttredelse anses som aksept.
        </p>
      </LegalSection>

      <LegalSection title="7. Ansvarsbegrensning">
        <p>
          DriveGarage AS er ikke ansvarlig for tap av data, avbrutt tilgang, eller indirekte tap
          som følge av bruk av tjenesten, i den grad dette er tillatt etter norsk lov.
        </p>
        <p>
          AI-genererte råd i appen (kjøretøydiagnose, vedlikeholdsforslag) er veiledende og
          erstatter ikke faglig vurdering fra autorisert verksted eller mekaniker. Vi er ikke
          ansvarlig for beslutninger tatt på bakgrunn av disse rådene.
        </p>
        <p className="text-amber-300/80 text-xs">
          [Ansvarsbegrensningsklausuler verifiseres mot norsk forbrukerkjøpslov av juridisk rådgiver.]
        </p>
      </LegalSection>

      <LegalSection title="8. Gjeldende lov og verneting">
        <p>
          Disse vilkårene er underlagt norsk rett. Tvister som ikke løses i minnelighet, behandles
          av Oslo tingrett som verneting, med forbehold om forbrukerrettigheter til å velge
          verneting ved eget hjemsted.
        </p>
      </LegalSection>

      <LegalSection title="9. Kontakt">
        <p>
          Spørsmål om vilkårene kan rettes til:{" "}
          <a href="mailto:kontakt@drivegarage.no" className="underline hover:text-white">
            kontakt@drivegarage.no
          </a>
        </p>
        <p>
          Se vår{" "}
          <Link href="/contact" className="underline hover:text-white">kontaktside</Link>{" "}
          for ytterligere kontaktinformasjon.
        </p>
      </LegalSection>

    </LegalPageShell>
  );
}
