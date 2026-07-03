import { LegalPageShell, LegalSection, LegalList } from "@/components/legal-page-shell";
import { Link } from "wouter";
import { subscriptionCancellationMethod } from "@/config/compliance";

export default function TermsPage() {
  return (
    <LegalPageShell title="Vilkår for bruk" lastUpdated="[Dato settes ved lansering]">

      <LegalSection title="1. Om tjenesten">
        <p>
          DriveGarage er en digital vedlikeholdslogg og plattform for klassiske biler og
          motorsykler, drevet av IT Løsninger No AS («vi», «oss», «tjenesten»). Ved å opprette en konto
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
          <strong className="text-foreground">Du eier dine data.</strong> Kjøretøydata, serviceposter,
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
          DriveGarage tilbyr gratisnivå og planlagte betalte abonnementer.
          <strong className="text-foreground"> Betalingsmodulen er ikke aktivert ennå.</strong>{" "}
          Ingen betaling trekkes fra noen bruker på nåværende tidspunkt.
        </p>
        <p>
          Planlagt betalingsmodell:
        </p>
        <LegalList items={[
          "Betalingsløsning via Vipps — krever separat godkjenning fra brukeren",
          "7 dagers gratis prøveperiode planlegges — ingen betalingsinformasjon innhentes i prøveperioden",
          "Ingen betaling trekkes før brukeren tydelig har godkjent en betalingsavtale (Vipps-avtale)",
          "Priser oppgis inkl. MVA der det er aktuelt",
          "Oppsigelse kan gjøres når som helst; tilgang beholdes til periodens slutt",
          "Refusjon ytes i henhold til norsk angrerettlov",
          "Prisendringer varsles med minimum 30 dagers forhåndsvarsel",
        ]} />
        <p className="text-amber-300/80 text-xs">
          [Betalingsvilkår gjennomgås av juridisk rådgiver og tilpasses norsk angrerettlov og Vipps' vilkår ved aktivering.]
        </p>
      </LegalSection>

      <LegalSection title="6. Oppsigelse av abonnement">
        <p>Du kan si opp abonnementet ditt når som helst.</p>
        {subscriptionCancellationMethod === "self-service" ? (
          <p>
            Oppsigelse gjøres direkte i tjenesten via abonnementsadministrasjonen
            under kontoinnstillingene dine.
          </p>
        ) : (
          <p>
            Inntil selvbetjent abonnementsadministrasjon er lansert, må
            oppsigelse sendes til vår kundestøtte ved hjelp av
            kontaktinformasjonen som er tilgjengelig på nettstedet.
          </p>
        )}
        <p>
          Oppsigelsen trer i kraft ved slutten av inneværende betalingsperiode.
          Ingen ny betalingsperiode starter etter at abonnementet er sagt opp.
        </p>
      </LegalSection>

      <LegalSection title="7. Tilgjengelighet og endringer">
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

      <LegalSection title="8. Ansvarsbegrensning">
        <p>
          IT Løsninger No AS er ikke ansvarlig for tap av data, avbrutt tilgang, eller indirekte tap
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

      <LegalSection title="9. Gjeldende lov og verneting">
        <p>
          Disse vilkårene er underlagt norsk rett. Tvister som ikke løses i minnelighet, behandles
          av Oslo tingrett som verneting, med forbehold om forbrukerrettigheter til å velge
          verneting ved eget hjemsted.
        </p>
      </LegalSection>

      <LegalSection title="10. Kontakt">
        <p>
          Spørsmål om vilkårene kan rettes til:{" "}
          <a href="mailto:kontakt@drivegarage.no" className="underline hover:text-foreground">
            kontakt@drivegarage.no
          </a>
        </p>
        <p>
          Se vår{" "}
          <Link href="/contact" className="underline hover:text-foreground">kontaktside</Link>{" "}
          for ytterligere kontaktinformasjon.
        </p>
      </LegalSection>

    </LegalPageShell>
  );
}
