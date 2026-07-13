import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUserAuth } from "@/hooks/use-user-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  CheckCircle2, Zap, Shield, CreditCard,
  Info, AlertTriangle, XCircle,
  Trash2, Clock, ExternalLink, RefreshCw,
} from "lucide-react";
import {
  useSubscription,
  useInvalidateSubscription,
  statusLabel,
  statusBadgeVariant,
  canAccessApp,
  type SubscriptionStatus,
} from "@/hooks/use-subscription";
import { customFetch } from "@workspace/api-client-react";

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SubscriptionStatus | null }) {
  const variant = statusBadgeVariant(status);
  const label   = statusLabel(status);
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
  const invalidate               = useInvalidateSubscription();
  const [starting, setStarting]  = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
        <p className="text-xs text-muted-foreground">Laster abonnementsstatus…</p>
      </div>
    );
  }

  const status            = sub?.status ?? null;
  const periodEnds        = sub?.currentPeriodEndsAt
    ? new Date(sub.currentPeriodEndsAt).toLocaleDateString("no-NO") : null;
  const expiresAt         = sub?.expiresAt
    ? new Date(sub.expiresAt).toLocaleDateString("no-NO") : null;
  const vippsConfigured   = sub?.vippsConfigured ?? false;
  const canStart          = vippsConfigured && status !== "active";
  const canCancel         = ["active", "past_due"].includes(status ?? "");

  async function handleStartAgreement() {
    setStarting(true);
    setActionError(null);
    try {
      const result = await customFetch<{ redirectUrl: string }>(
        "/api/billing/vipps/start-agreement",
        { method: "POST" },
      );
      window.location.href = result.redirectUrl;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Noe gikk galt. Prøv igjen.";
      setActionError(msg);
      setStarting(false);
    }
  }

  async function handleCancel() {
    setCanceling(true);
    setActionError(null);
    try {
      await customFetch("/api/billing/vipps/cancel", { method: "POST" });
      setCancelConfirm(false);
      await invalidate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Noe gikk galt. Prøv igjen.";
      setActionError(msg);
    } finally {
      setCanceling(false);
    }
  }

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
            <span className="text-xs font-semibold text-indigo-300">Vipps</span>
          </div>
          {periodEnds && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {sub?.cancelAtPeriodEnd ? "Tilgang til" : "Neste fornyelse"}
              </span>
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

        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 text-center">
          {(status === "active" || status === "exempt_internal") && (
            <>
              <CheckCircle2 className="w-7 h-7 text-green-400/60" />
              <p className="text-xs text-muted-foreground leading-snug">
                Abonnementet er aktivt. Full tilgang til alle funksjoner.
              </p>
            </>
          )}
          {status === "pending_payment_setup" && (
            <>
              <CreditCard className="w-7 h-7 text-amber-400/60" />
              <p className="text-xs text-muted-foreground leading-snug">
                {vippsConfigured
                  ? "Abonnement ikke aktivert. Start Vipps-betalingsavtale for å få tilgang."
                  : "Vipps-betaling klargjøres. Ingen betaling trekkes nå."}
              </p>
            </>
          )}
          {status === "past_due" && (
            <>
              <AlertTriangle className="w-7 h-7 text-amber-400/60" />
              <p className="text-xs text-muted-foreground leading-snug">
                Betaling forfalt. Sjekk Vipps-appen din. Data slettes ikke automatisk.
              </p>
            </>
          )}
          {status === "payment_failed" && (
            <>
              <AlertTriangle className="w-7 h-7 text-red-400/60" />
              <p className="text-xs text-muted-foreground leading-snug">
                Betaling feilet etter gjentatte forsøk. Aktiver ny Vipps-avtale.
              </p>
            </>
          )}
          {status === "canceled" && (
            <>
              <XCircle className="w-7 h-7 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground leading-snug">
                Kansellert. Tilgang beholdes til slutten av betalingsperioden.
                Data beholdes i minst 90 dager.
              </p>
            </>
          )}
          {status === "expired" && (
            <>
              <XCircle className="w-7 h-7 text-red-400/60" />
              <p className="text-xs text-muted-foreground leading-snug">
                Utløpt. Aktiver abonnement for å gjenopprette tilgangen.
                Data beholdes i minst 90 dager etter utløp.
              </p>
            </>
          )}
        </div>
      </div>

      {actionError && (
        <p className="text-xs text-red-400 mt-2">{actionError}</p>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        {canStart && (
          <Button
            size="sm"
            onClick={handleStartAgreement}
            disabled={starting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
          >
            {starting ? (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            )}
            {starting ? "Starter…" : "Aktiver via Vipps"}
          </Button>
        )}

        {canCancel && !cancelConfirm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCancelConfirm(true)}
            className="text-muted-foreground border-muted hover:text-foreground"
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Avslutt abonnement
          </Button>
        )}
      </div>

      {cancelConfirm && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-300">Bekreft kansellering</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Fremtidige betalinger stoppes. Du beholder tilgang til slutten av gjeldende periode.
            Kansellering sletter ikke kontoen din eller dataene dine.
            Data beholdes i minst 90 dager etter utløp.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={canceling}
              className="text-amber-300 border-amber-500/40 hover:bg-amber-500/20"
            >
              {canceling ? "Kansellerer…" : "Bekreft kansellering"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCancelConfirm(false)}
              disabled={canceling}
            >
              Avbryt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Plan features ─────────────────────────────────────────────────────────────

const PLAN_FEATURES = [
  "Vedlikeholdslogg for alle kjøretøyene dine",
  "Servicehistorikk med full tidslinje",
  "Dokumenter og kvitteringer per kjøretøy",
  "PDF-rapporter og eksport",
  "Klubber og arrangementer for veterankjøretøy",
  "AI-vedlikeholdsråd",
];

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
          Du vil bli bedt om å bekrefte eksplisitt, og kontoen settes i en 14-dagers
          sletteventekø — du kan angre i denne perioden.
        </p>
        <p>
          <strong className="text-foreground">Hva som slettes:</strong>{" "}
          Garasje, kjøretøy, servicelogg, kvitteringer, klubbmedlemskap og
          personlige innstillinger anonymiseres eller slettes innen 14–30 dager etter forespørsel.
        </p>
        <p>
          <strong className="text-foreground">Hva som beholdes:</strong>{" "}
          Kun det som er lovpålagt — minimale revisjons- og faktureringsdata for regnskapsformål.
        </p>
        <p>
          Abonnementsavtalen avsluttes automatisk ved sletting av konto.
          Ingen refusjon ytes for gjenstående periode.
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
  const { t }             = useTranslation();
  const { isAuthenticated } = useUserAuth();
  const { data: sub }     = useSubscription();

  const vippsConfigured  = sub?.vippsConfigured ?? false;
  const enforcementOn    = sub?.enforcementEnabled ?? false;

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

      {/* Status banner — show context based on configuration state */}
      {!vippsConfigured && (
        <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-600/10 to-cyan-600/10 px-5 py-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-indigo-300">Betaling via Vipps — under klargjøring</p>
            <p className="text-xs text-indigo-300/70 mt-1 leading-relaxed">
              DriveGarage konfigureres for <strong className="text-indigo-200">Vipps Recurring</strong> som betalingsløsning.
              Ingen betaling trekkes nå. Abonnementsavtale godkjennes i Vipps-appen ved aktivering.
            </p>
          </div>
        </div>
      )}

      {vippsConfigured && !enforcementOn && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Testkonfigurasjon aktiv</p>
            <p className="text-xs text-amber-300/70 mt-1 leading-relaxed">
              Vipps er konfigurert, men betalingshåndheving er ikke aktivert ennå.
              Abonnementsflyt kan testes uten at tilgang låses.
            </p>
          </div>
        </div>
      )}

      {/* Subscription status — only when logged in */}
      {isAuthenticated && <SubscriptionStatusCard />}

      {/* Plan card */}
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">{t("billing.choosePlan")}</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Full tilgang til DriveGarage for 100 kr per måned. Abonnementet administreres og betales med Vipps.
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
            </div>

            <ul className="space-y-2 mb-6">
              {PLAN_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground/65">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0 opacity-80" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-5">
          Slik fungerer betalingen
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { step: "1", label: "Opprett konto og logg inn" },
            { step: "2", label: "Godkjenn Vipps-betalingsavtale" },
            { step: "3", label: "Full tilgang for 100 kr/mnd" },
          ].map(({ step, label }) => (
            <div key={step} className="flex flex-col items-center text-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm font-black shrink-0">
                {step}
              </div>
              <p className="text-xs text-muted-foreground leading-snug">{label}</p>
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
            Ingen betaling trekkes uten at du godkjenner Vipps-avtale
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />
            Dataene dine beholdes i minst 90 dager etter at abonnementet utløper
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />
            Kansellering stopper fremtidige betalinger — ikke din data
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400/70 mt-0.5 shrink-0" />
            Kansellering og kontosletting er to separate handlinger
          </li>
        </ul>
      </div>

      {/* Cancellation info */}
      {isAuthenticated && (
        <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-bold text-foreground">Kansellering av abonnement</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Du kan kansellere abonnementet ditt når som helst fra <em>Avslutt abonnement</em>-knappen ovenfor.
            Kansellering stopper fremtidige betalinger, men <strong className="text-foreground">sletter ikke
            dataene dine</strong>. Du beholder tilgang til slutten av betalingsperioden, og data beholdes
            i <strong className="text-foreground">minst 90 dager</strong> fra utløpsdato.
          </p>
        </div>
      )}

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
