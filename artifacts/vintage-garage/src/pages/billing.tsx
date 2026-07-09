import { useTranslation } from "react-i18next";
import { useUserAuth } from "@/hooks/use-user-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  CheckCircle2, Zap, Shield, CreditCard,
  Clock, Info, Gift, AlertTriangle, XCircle,
  Trash2, ArrowRight, RefreshCw,
} from "lucide-react";
import {
  useSubscription,
  statusLabel,
  statusBadgeVariant,
  type SubscriptionStatus,
} from "@/hooks/use-subscription";

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SubscriptionStatus | null }) {
  const variant = statusBadgeVariant(status);
  const label = statusLabel(status);
  const cls =
    variant === "success" ? "bg-green-500/20 text-green-400 border-green-500/30" :
    variant === "warning" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
    variant === "danger"  ? "bg-red-500/20 text-red-400 border-red-500/30" :
                            "bg-muted/40 text-muted-foreground border-muted";
  return (
    <Badge className={`${cls} text-[10px] font-bold border`}>{label}</Badge>
  );
}

// ── Subscription status card ──────────────────────────────────────────────────

function SubscriptionStatusCard() {
  const { data: sub, isLoading } = useSubscription();
  const status = sub?.status ?? null;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <p className="text-xs text-muted-foreground">Laster abonnementsstatus…</p>
      </div>
    );
  }

  const trialDays = sub?.daysRemainingInTrial;
  const periodEnds = sub?.currentPeriodEndsAt
    ? new Date(sub.currentPeriodEndsAt).toLocaleDateString("no-NO")
    : null;
  const expiresAt = sub?.expiresAt
    ? new Date(sub.expiresAt).toLocaleDateString("no-NO")
    : null;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-4">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
        Din abonnementsstatus
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <StatusBadge status={status} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Plan</span>
            <span className="text-xs font-semibold text-foreground">
              {sub?.plan === "monthly_100" ? "100 kr/mnd" : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Betalingsleverandør</span>
            <span className="text-xs font-semibold text-indigo-300">Vipps (planlagt)</span>
          </div>
          {trialDays !== null && trialDays !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Dager igjen av prøveperiode</span>
              <span className="text-sm font-bold text-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-green-400" />
                {trialDays} dag{trialDays === 1 ? "" : "er"}
              </span>
            </div>
          )}
          {periodEnds && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Nåværende periode slutter</span>
              <span className="text-xs font-semibold text-foreground">{periodEnds}</span>
            </div>
          )}
          {expiresAt && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tilgang utløper</span>
              <span className="text-xs font-semibold text-amber-400">{expiresAt}</span>
            </div>
          )}
        </div>

        {/* Status-specific context box */}
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-center">
          {(!status || status === "trialing") && (
            <>
              <Gift className="w-7 h-7 text-green-400/60" />
              <p className="text-xs text-muted-foreground leading-snug">
                Du er i gratis prøveperiode.<br />
                Abonnement aktiveres via Vipps når betaling er klar.
              </p>
            </>
          )}
          {(status === "past_due" || status === "payment_failed") && (
            <>
              <AlertTriangle className="w-7 h-7 text-red-400/60" />
              <p className="text-xs text-muted-foreground leading-snug">
                Betaling feilet. Sjekk Vipps-appen din og prøv igjen.
                Data slettes ikke automatisk.
              </p>
            </>
          )}
          {status === "pending_vipps_agreement" && (
            <>
              <RefreshCw className="w-7 h-7 text-amber-400/60" />
              <p className="text-xs text-muted-foreground leading-snug">
                Prøveperioden er over. Godkjenn Vipps-betalingsavtale for å fortsette.
              </p>
            </>
          )}
          {status === "canceled" && (
            <>
              <XCircle className="w-7 h-7 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground leading-snug">
                Abonnementet er kansellert. Du beholder tilgang til slutten av betalingsperioden.
                Data beholdes i minst 90 dager.
              </p>
            </>
          )}
          {status === "expired" && (
            <>
              <XCircle className="w-7 h-7 text-red-400/60" />
              <p className="text-xs text-muted-foreground leading-snug">
                Tilgangen er utløpt. Aktiver abonnement for å gjenopprette tilgangen.
                Data beholdes i minst 90 dager etter utløp.
              </p>
            </>
          )}
          {(status === "active" || status === "exempt_internal") && (
            <>
              <CheckCircle2 className="w-7 h-7 text-green-400/60" />
              <p className="text-xs text-muted-foreground leading-snug">
                Abonnementet er aktivt. Full tilgang til alle funksjoner.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Plan info ─────────────────────────────────────────────────────────────────

const PLAN_FEATURES = [
  "Vedlikeholdslogg for alle kjøretøyene dine",
  "Servicehistorikk med full tidslinje",
  "Dokumenter og kvitteringer per kjøretøy",
  "PDF-rapporter",
  "Klubber og arrangementer for veterankjøretøy",
];

// ── Cancellation section ──────────────────────────────────────────────────────

function CancellationSection() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <XCircle className="w-4 h-4 text-muted-foreground" />
        <p className="text-sm font-bold text-foreground">Kansellering av abonnement</p>
      </div>
      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
        <p>
          Du kan kansellere abonnementet ditt når som helst. Kansellering stopper fremtidige betalinger,
          men <strong className="text-foreground">sletter ikke dataene dine umiddelbart</strong>.
        </p>
        <p>
          Etter kansellering beholder du tilgang til slutten av betalingsperioden.
          Etter det settes status til <em>utløpt</em> og tilgangen stenges — men alle data beholdes
          i <strong className="text-foreground">minst 90 dager</strong> fra utløpsdato.
          Du kan reaktivere og gjenopprette full tilgang i denne perioden.
        </p>
        <p className="text-[11px] text-muted-foreground/70 border-t border-border/40 pt-3 mt-3">
          Kansellering av abonnement er <em>ikke</em> det samme som sletting av konto.
          Se «Sletting av konto» nedenfor for informasjon om full datarydding.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="text-muted-foreground border-muted hover:text-foreground"
        disabled
        title="Tilgjengelig når Vipps-betaling er aktivert"
      >
        <XCircle className="w-3.5 h-3.5 mr-1.5" />
        Kanseller abonnement — kommer med Vipps
      </Button>
    </div>
  );
}

// ── Account deletion section ──────────────────────────────────────────────────

function AccountDeletionSection() {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Trash2 className="w-4 h-4 text-red-400" />
        <p className="text-sm font-bold text-red-400">Sletting av konto</p>
      </div>
      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
        <p>
          Sletting av konto er en separat og permanent handling.
          Du vil bli bedt om å bekrefte eksplisitt før noe slettes.
        </p>
        <p>
          <strong className="text-foreground">Hva som slettes:</strong>{" "}
          Garasje, kjøretøy, servicelogg, kvitteringer, klubbmedlemskap og personlige innstillinger
          anonymiseres eller slettes innen 7–30 dager etter forespørsel.
        </p>
        <p>
          <strong className="text-foreground">Hva som beholdes:</strong>{" "}
          Kun det som er lovpålagt — minimale revisjons- og faktureringsdata for regnskapsformål.
        </p>
        <p>
          Abonnementsavtalen avsluttes automatisk ved sletting av konto.
          Ingen refusjon ytes for gjenstående periode ved konto-sletting.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
        disabled
        title="Kontakt support for å be om kontosletting"
      >
        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
        Be om sletting av konto — kontakt support
      </Button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Billing() {
  const { t } = useTranslation();
  const { isAuthenticated } = useUserAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{t("billing.title")}</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-10">{t("billing.subtitle")}</p>
      </div>

      {/* Vipps pending banner */}
      <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/10 to-cyan-600/10 px-5 py-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-indigo-300">Betaling via Vipps — under klargjøring</p>
          <p className="text-xs text-indigo-300/70 mt-1 leading-relaxed">
            DriveGarage forberedes for <strong className="text-indigo-200">Vipps Recurring</strong> som betalingsløsning.
            Ingen betaling trekkes nå og ingen betalingsinformasjon lagres hos oss.
            Betalingsavtale godkjennes i Vipps-appen ved lansering.
          </p>
        </div>
      </div>

      {/* Subscription status — only when logged in */}
      {isAuthenticated && <SubscriptionStatusCard />}

      {/* Plan card */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">{t("billing.choosePlan")}</h2>
        <p className="text-sm text-muted-foreground mb-5">
          DriveGarage tilbyr én enkel plan. Prisen er 100 kr/mnd etter prøveperioden.
        </p>

        <div className="relative rounded-2xl border border-indigo-500/40 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-cyan-600/20 opacity-60" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-0.5 z-10">
            <div className="px-5 py-0.5 rounded-b-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg">
              Én enkel plan
            </div>
          </div>

          <div className="relative z-10 p-6 pt-8">
            <div className="flex items-center gap-2.5 mb-4">
              <Zap className="w-5 h-5 text-indigo-400" />
              <span className="text-lg font-bold text-indigo-400">DriveGarage</span>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-foreground">100 kr</span>
                <span className="text-muted-foreground text-sm">/mnd</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">per bruker, per måned</p>
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-green-400/80 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-0.5">
                <Clock className="w-3 h-3" />
                7 dager gratis prøveperiode inkludert
              </div>
            </div>

            <ul className="space-y-2 mb-6">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground/65">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0 opacity-80" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              disabled
              className="w-full h-10 font-semibold bg-indigo-600/40 text-white/60 border-0 cursor-not-allowed"
            >
              Aktiveres via Vipps ved lansering
            </Button>
          </div>
        </div>
      </div>

      {/* Planned flow */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-5">
          Slik fungerer betalingen (planlagt)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { step: "1", label: "Start gratis prøveperiode" },
            { step: "2", label: "Utforsk alle funksjoner i 7 dager" },
            { step: "3", label: "Godkjenn Vipps-betalingsavtale" },
            { step: "4", label: "Fortsett for 100 kr/mnd" },
          ].map(({ step, label }, idx, arr) => (
            <div key={step} className="flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm font-black shrink-0">
                {step}
              </div>
              <p className="text-xs text-muted-foreground leading-snug">{label}</p>
              {idx < arr.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-white/15 sm:hidden" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Guarantees */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-indigo-400" />
          <p className="text-sm font-bold text-foreground">{t("billing.safeToTry")}</p>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />
            7 dager gratis — ingen betaling trekkes uten at du godkjenner Vipps-avtale
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />
            Dataene dine beholdes i minst 90 dager etter at abonnementet utløper
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />
            Kansellering stopper fremtidige betalinger — ikke din data
          </li>
        </ul>
      </div>

      {/* Cancellation */}
      {isAuthenticated && <CancellationSection />}

      {/* Account deletion */}
      {isAuthenticated && <AccountDeletionSection />}

      <p className="text-center text-xs text-muted-foreground pb-4">
        Se fullstendig prisoversikt på{" "}
        <Link href="/pricing" className="underline hover:text-foreground transition-colors">
          prisingsiden
        </Link>
      </p>

    </div>
  );
}
