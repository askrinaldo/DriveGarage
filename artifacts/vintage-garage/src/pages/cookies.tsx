import { LegalPageShell, LegalSection, LegalList } from "@/components/legal-page-shell";
import { Link } from "wouter";

export default function CookiesPage() {
  return (
    <LegalPageShell
      title="Informasjonskapsler og lokal lagring"
      lastUpdated="[Dato settes ved lansering]"
    >

      <LegalSection title="1. Hva er informasjonskapsler?">
        <p>
          Informasjonskapsler («cookies») er små tekstfiler som lagres i nettleseren din. Nettsteder
          bruker dem til å huske innstillinger og holde deg innlogget mellom sidebesøk. I tillegg
          finnes <em>localStorage</em> og <em>sessionStorage</em> — nettleserbasert lagring som
          fungerer på lignende måte, men aldri sendes til serveren.
        </p>
      </LegalSection>

      <LegalSection title="2. Vår bruk: kun nødvendig lagring">
        <p>
          <strong className="text-foreground">DriveGarage bruker ingen sporings-, analyse- eller
          markedsføringskapsler.</strong> Vi bruker ingen Google Analytics, Meta Pixel, Hotjar,
          Mixpanel eller lignende tredjepartsverktøy.
        </p>
        <p>
          All lagring i DriveGarage er strengt nødvendig for at tjenesten skal fungere. Du kan
          ikke velge bort disse uten at tjenesten slutter å virke.
        </p>
      </LegalSection>

      <LegalSection title="3. Hva vi lagrer — detaljert oversikt">

        <div className="space-y-4">
          <div className="rounded-md border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-foreground text-sm">Clerk-autentiseringskapsler</p>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">Nødvendig</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Satt av Clerk Inc. (vår autentiseringsleverandør). Inneholder sesjonstoken for å holde
              deg innlogget. Uten disse kapsler kan du ikke logge inn. Clerk setter kapsler på domenet{" "}
              <code className="text-indigo-300">clerk.drivegarage.no</code> (eller tilsvarende).
              Varighet: som angitt av Clerk (typisk 1–7 dager).
            </p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-foreground text-sm">sidebar_state (informasjonskapsel)</p>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">Nødvendig</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Husker om sidefeltet i appen er åpent eller lukket. Lagres som en informasjonskapsel
              med 7 dagers levetid. Inneholder kun verdien «true» eller «false».
            </p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-foreground text-sm">dg-theme (localStorage)</p>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">Nødvendig</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Lagrer ditt valgte fargetema (mørk, lys, system). Sendes ikke til serveren.
              Slettes ved å tømme nettleserens nettstedsdata.
            </p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-foreground text-sm">i18nextLng (localStorage)</p>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">Nødvendig</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Husker ditt valgte applikasjonsspråk (norsk, svensk, dansk, engelsk).
              Sendes ikke til serveren.
            </p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-foreground text-sm">club-session-* (localStorage)</p>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">Nødvendig</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Lagrer autentiseringstoken for klubber du er innlogget i. Nødvendig for å opprettholde
              klubbsesjoner mellom sidebesøk. Inneholder JWT-token og medlemsrolle.
              Slettes ved utlogging fra klubben.
            </p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-foreground text-sm">dg-ai-chat-history (sessionStorage)</p>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">Nødvendig</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Lagrer AI-chathistorikk midlertidig i nettleserfanens sessionStorage.
              Slettes automatisk når du lukker fanen eller nettleseren. Sendes ikke til serveren
              uten din aktive interaksjon.
            </p>
          </div>

          <div className="rounded-md border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-foreground text-sm">dg-cookie-notice-v1 (localStorage)</p>
              <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">Nødvendig</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Husker at du har lukket informasjonsbanneret om informasjonskapsler.
              Inneholder kun verdien «1». Ingen personopplysninger.
            </p>
          </div>
        </div>
      </LegalSection>

      <LegalSection title="4. Tredjeparters lagring">
        <div className="space-y-3">
          <div className="rounded-md border border-border/60 bg-card p-4">
            <p className="font-medium text-foreground text-sm mb-1">Clerk Inc. — Autentisering</p>
            <p className="text-xs text-muted-foreground">
              Clerk setter egne informasjonskapsler for autentiseringsformål. Disse er nødvendige
              for innlogging og kan ikke deaktiveres. Se{" "}
              <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Clerks personvernerklæring</a>.
            </p>
          </div>
          <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="font-medium text-amber-300 text-sm mb-1">Betalingsleverandør — ikke aktivert ennå</p>
            <p className="text-xs text-muted-foreground">
              Betalingsløsning via <strong className="text-foreground/80">Vipps</strong> er planlagt, men ikke implementert.
              Vipps vil, når aktivert, kunne sette egne kapsler for autentisering og svindelforebygging under
              betalingsprosessen. Denne seksjonen oppdateres med konkrete detaljer ved aktivering.
              Se <a href="https://vipps.no/privatliv" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Vipps' personvernerklæring</a> for fremtidig referanse.
            </p>
          </div>
        </div>
      </LegalSection>

      <LegalSection title="5. Dine valg">
        <p>
          Siden vi kun bruker nødvendig lagring, tilbyr vi ikke et samtykkepanel for informasjonskapsler.
          Du kan imidlertid:
        </p>
        <LegalList items={[
          "Tømme nettleserens informasjonskapsler og nettstedsdata (merk: du vil bli logget ut)",
          "Bruke nettleserens innstillinger for å blokkere kapsler (merk: innlogging vil slutte å fungere)",
          "Slette enkeltstående localStorage-nøkler via nettleserens utviklerverktøy",
        ]} />
        <p>
          Spørsmål om lagring og personvern kan rettes til{" "}
          <a href="mailto:drivegarage@evolvit.no" className="underline hover:text-foreground">drivegarage@evolvit.no</a>.
        </p>
      </LegalSection>

      <LegalSection title="6. Endringer">
        <p>
          Vi oppdaterer denne siden dersom vi endrer vår bruk av informasjonskapsler eller lokal
          lagring. Se gjeldende dato øverst på siden.
        </p>
        <p>
          For fullstendig informasjon om databehandling, se vår{" "}
          <Link href="/privacy" className="underline hover:text-foreground">Personvernerklæring</Link>.
        </p>
      </LegalSection>

    </LegalPageShell>
  );
}
