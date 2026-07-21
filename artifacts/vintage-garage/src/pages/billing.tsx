import { useState, useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useUserAuth } from "@/hooks/use-user-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
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

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SubscriptionSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] light:border-border light:bg-white p-6 space-y-4 animate-pulse">
      <div className="h-3 w-36 rounded bg-white/[0.06] light:bg-muted" />
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          {[80, 56, 96, 72].map((w) => (
            <div key={w} className="flex items-center justify-between">
              <div className="h-3 rounded bg-white/[0.04] light:bg-muted/70" style={{ width: `${w * 0.55}px` }} />
              <div className="h-3 rounded bg-white/[0.06] light:bg-muted" style={{ width: `${w}px` }} />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] light:border-border light:bg-muted/40 h-24" />
      </div>
      <div className="h-8 w-32 rounded-lg bg-white/[0.06] light:bg-muted" />
    </div>
  );
}

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={`text-xs font-semibold text-right ${valueClass ?? "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

// ── Subscription status card ──────────────────────────────────────────────────

function SubscriptionStatusCard() {
  const { data: sub, isLoading, isFetching } = useSubscription();
  const invalidate                            = useInvalidateSubscription();
  const [starting, setStarting]               = useState(false);
  const [canceling, setCanceling]             = useState(false);
  const [cancelConfirm, setCancelConfirm]     = useState(false);
  const [actionError, setActionError]         = useState<string | null>(null);
  const [reconciling, setReconciling]         = useState(false);
  const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);
  const reconcileAttempts                     = useRef(0);
  const hasTriggeredReconcile                 = useRef(false);

  // On mount: if status is pending, force a fresh subscription check.
  // GET /billing/subscription now reconciles against Vipps automatically,
  // so this causes the billing page to show the active state without any user action.
  useEffect(() => {
    if (!hasTriggeredReconcile.current && sub?.status === "pending_payment_setup") {
      hasTriggeredReconcile.current = true;
      void invalidate();
    }
  }, [sub?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect return from Vipps redirect and reconcile subscription status.
  // Vipps appends ?agreementId=agr_xxx to the merchantRedirectUrl.
  useEffect(() => {
    const params              = new URLSearchParams(window.location.search);
    const redirectAgreementId = params.get("agreementId");
    if (!redirectAgreementId) return;

    const agreementIdStr: string = redirectAgreementId;

    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, "", cleanUrl);

    setReconciling(true);
    setReconcileMessage("Aktiverer abonnement via Vipps…");
    reconcileAttempts.current = 0;

    const MAX_ATTEMPTS = 15;

    async function poll() {
      reconcileAttempts.current += 1;
      try {
        const result = await customFetch<{ status: string; agreementStatus: string | null }>(
          `/api/billing/vipps/status?agreementId=${encodeURIComponent(agreementIdStr)}`,
          { method: "GET" },
        );
        if (result.status === "active") {
          await invalidate();
          setReconciling(false);
          setReconcileMessage(null);
          return;
        }
      } catch {
        // Network / auth error — keep retrying
      }
      if (reconcileAttempts.current < MAX_ATTEMPTS) {
        setTimeout(poll, 2000);
      } else {
        setReconciling(false);
        setReconcileMessage("Betalingsbekreftelse tar litt lenger tid enn ventet. Prøv å oppdatere siden om et øyeblikk.");
      }
    }

    poll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // First-load skeleton — no placeholder data yet
  if (isLoading && !sub) return <SubscriptionSkeleton />;

  // Vipps redirect reconciliation
  if (reconciling) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] light:border-border light:bg-white p-6 space-y-2">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
          <p className="text-xs text-muted-foreground">
            {reconcileMessage ?? "Aktiverer abonnement…"}
          </p>
        </div>
      </div>
    );
  }

  const status           = sub?.status ?? null;
  const vippsConfigured  = sub?.vippsConfigured ?? false;

  // Date helpers
  const fmt = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" }) : null;

  const periodStart   = fmt(sub?.currentPeriodStartsAt);
  const periodEnd     = fmt(sub?.currentPeriodEndsAt);
  const canceledAt    = fmt(sub?.canceledAt);
  const expiresAt     = fmt(sub?.expiresAt);

  // Whether the user cancelled but still has access until period end
  const canceledWithPeriodAccess =
    status === "canceled" &&
    !!sub?.currentPeriodEndsAt &&
    new Date(sub.currentPeriodEndsAt) > new Date();

  const canStart  = vippsConfigured && status !== "active" && !canceledWithPeriodAccess;
  const canCancel = ["active", "past_due"].includes(status ?? "");

  async function handleStartAgreement() {
    setStarting(true);
    setActionError(null);
    try {
      const result = await customFetch<{
        redirectUrl?: string;
        status?: string;
        recovered?: boolean;
        message?: string;
      }>(
        "/api/billing/vipps/start-agreement",
        { method: "POST" },
      );
      if (result.recovered) {
        await invalidate();
        setStarting(false);
        return;
      }
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      setActionError("Uventet svar fra serveren. Prøv å laste siden på nytt.");
      setStarting(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Noe gikk galt. Prøv igjen.");
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
      setActionError(err instanceof Error ? err.message : "Noe gikk galt. Prøv igjen.");
    } finally {
      setCanceling(false);
    }
  }

  // ── Info pane content per status ────────────────────────────────────────────
  const InfoPane = () => {
    if (status === "active" || status === "exempt_internal") {
      return (
        <>
          <CheckCircle2 className="w-7 h-7 text-green-400/70" />
          <p className="text-xs text-muted-foreground leading-snug">
            Abonnementet er aktivt. Du har full tilgang til alle funksjoner.
          </p>
        </>
      );
    }
    if (status === "canceled") {
      return (
        <>
          <XCircle className="w-7 h-7 text-amber-400/50" />
          <p className="text-xs text-muted-foreground leading-snug">
            Abonnementet er kansellert.{" "}
            {canceledWithPeriodAccess
              ? "Du har fortsatt tilgang til slutten av betalingsperioden."
              : "Tilgangen er utløpt. Aktiver nytt abonnement for å fortsette."}
            {" "}Ingen fremtidige betalinger trekkes. Data beholdes i minst 90 dager.
          </p>
        </>
      );
    }
    if (status === "past_due") {
      return (
        <>
          <AlertTriangle className="w-7 h-7 text-amber-400/70" />
          <p className="text-xs text-muted-foreground leading-snug">
            En betaling er forfalt. Åpne Vipps-appen og bekreft at betalingsavtalen er aktiv.
            Tilgangen din er midlertidig beholdt mens vi prøver på nytt. Data slettes ikke automatisk.
          </p>
        </>
      );
    }
    if (status === "payment_failed") {
      return (
        <>
          <AlertTriangle className="w-7 h-7 text-red-400/70" />
          <p className="text-xs text-muted-foreground leading-snug">
            Betaling feilet etter gjentatte forsøk og avtalen er stoppet.
            Start en ny Vipps-betalingsavtale for å gjenopprette tilgangen.
          </p>
        </>
      );
    }
    if (status === "expired") {
      return (
        <>
          <XCircle className="w-7 h-7 text-red-400/60" />
          <p className="text-xs text-muted-foreground leading-snug">
            Abonnementet har utløpt. Aktiver et nytt abonnement via Vipps for å gjenopprette
            tilgangen. Data beholdes i minst 90 dager etter utløp.
          </p>
        </>
      );
    }
    if (status === "pending_payment_setup") {
      return (
        <>
          <CreditCard className="w-7 h-7 text-indigo-400/60" />
          <p className="text-xs text-muted-foreground leading-snug">
            {vippsConfigured
              ? "Ingen betalingsavtale er registrert ennå. Klikk «Aktiver via Vipps» for å sette opp abonnementet."
              : "Vipps Recurring klargjøres. Ingen betaling trekkes nå. Betalingsavtale godkjennes i Vipps-appen ved aktivering."}
          </p>
        </>
      );
    }
    return null;
  };

  // ── Detail rows per status ──────────────────────────────────────────────────
  const MetaRows = () => (
    <div className="space-y-3">
      <DetailRow label="Status" value={<StatusBadge status={status} />} />
      <DetailRow label="Plan" value="DriveGarage" />
      <DetailRow label="Pris" value="50 kr/mnd" />
      <DetailRow label="Betaling via" value={<span className="text-indigo-300">Vipps</span>} />

      {/* Active: billing period + next payment */}
      {(status === "active" || status === "exempt_internal") && (
        <>
          {(periodStart && periodEnd) ? (
            <DetailRow
              label="Inneværende periode"
              value={`${periodStart} – ${periodEnd}`}
            />
          ) : periodEnd ? (
            <DetailRow label="Neste betaling" value={periodEnd} />
          ) : null}
        </>
      )}

      {/* Canceled: access-until + canceledAt + no more payments */}
      {status === "canceled" && (
        <>
          {periodEnd && (
            <DetailRow
              label="Tilgang til"
              value={periodEnd}
              valueClass={canceledWithPeriodAccess ? "text-amber-400" : "text-muted-foreground"}
            />
          )}
          {canceledAt && (
            <DetailRow label="Kansellert" value={canceledAt} valueClass="text-muted-foreground" />
          )}
          <DetailRow
            label="Fremtidige betalinger"
            value="Ingen"
            valueClass="text-green-400"
          />
        </>
      )}

      {/* Past due: period end if known */}
      {status === "past_due" && periodEnd && (
        <DetailRow label="Periode slutter" value={periodEnd} valueClass="text-amber-400" />
      )}

      {/* Payment failed: no fake dates */}
      {status === "payment_failed" && (
        <DetailRow label="Avtale" value="Stoppet" valueClass="text-red-400" />
      )}

      {/* Expired */}
      {status === "expired" && expiresAt && (
        <DetailRow label="Tilgang utløpt" value={expiresAt} valueClass="text-red-400" />
      )}
    </div>
  );

  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.02] light:border-border light:bg-white p-6 space-y-4 transition-opacity duration-200 ${isFetching && !reconciling ? "opacity-80" : "opacity-100"}`}>
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
        Din abonnementsstatus
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <MetaRows />

        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] light:border-border light:bg-card p-4 text-center">
          <InfoPane />
        </div>
      </div>

      {reconcileMessage && (
        <p className="text-xs text-amber-400">{reconcileMessage}</p>
      )}
      {actionError && (
        <p className="text-xs text-red-400">{actionError}</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
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

const DELETION_CONFIRM_PHRASE = "slett kontoen min";

function AccountDeletionSection() {
  const { data: sub }                  = useSubscription();
  const invalidate                     = useInvalidateSubscription();
  const [showConfirm, setShowConfirm]  = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [loading, setLoading]          = useState(false);
  const [error, setError]              = useState<string | null>(null);
  const [scheduled, setScheduled]      = useState<{ deletionRequestedAt: string; scheduledDeleteAt: string } | null>(null);

  const isDeletionRequested = sub?.status === "deletion_requested";

  async function handleRequestDeletion() {
    if (confirmInput.trim().toLowerCase() !== DELETION_CONFIRM_PHRASE) {
      setError(`Skriv inn "${DELETION_CONFIRM_PHRASE}" nøyaktig for å bekrefte.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await customFetch<{ deletionRequestedAt: string; scheduledDeleteAt: string }>(
        "/api/account/request-deletion",
        { method: "POST", body: JSON.stringify({ confirmPhrase: confirmInput.trim().toLowerCase() }) },
      );
      setScheduled(result);
      setShowConfirm(false);
      await invalidate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Noe gikk galt.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelDeletion() {
    setLoading(true);
    setError(null);
    try {
      await customFetch("/api/account/cancel-deletion", { method: "POST" });
      setScheduled(null);
      await invalidate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Noe gikk galt.");
    } finally {
      setLoading(false);
    }
  }

  if (scheduled || isDeletionRequested) {
    const deleteDate = scheduled?.scheduledDeleteAt
      ? new Date(scheduled.scheduledDeleteAt).toLocaleDateString("no-NO")
      : null;
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <p className="text-sm font-bold text-amber-400">Kontosletting er planlagt</p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Kontoen din er planlagt slettet{deleteDate ? ` ${deleteDate}` : ""}.
          Du kan angre dette innen 14-dagersfristen ved å klikke nedenfor.
        </p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <Button
          variant="outline"
          size="sm"
          className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
          onClick={handleCancelDeletion}
          disabled={loading}
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Angre — behold kontoen min
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Trash2 className="w-4 h-4 text-red-400" />
        <p className="text-sm font-bold text-red-400">Sletting av konto</p>
      </div>
      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
        <p>
          Sletting av konto er en separat og permanent handling.
          Kontoen settes i en <strong className="text-foreground">14-dagers sletteventekø</strong> — du kan angre i denne perioden.
        </p>
        <p>
          <strong className="text-foreground">Slettes:</strong>{" "}
          Kjøretøy, servicelogg, kvitteringer, klubbmedlemskap og personlige innstillinger.
        </p>
        <p>
          <strong className="text-foreground">Beholdes:</strong>{" "}
          Kun det som er lovpålagt — minimale revisjons- og faktureringsdata for regnskapsformål.
        </p>
        <p>Abonnementsavtalen avsluttes automatisk. Ingen refusjon for gjenstående periode.</p>
      </div>

      {!showConfirm ? (
        <Button
          variant="outline"
          size="sm"
          className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
          onClick={() => { setShowConfirm(true); setError(null); }}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Be om sletting av konto
        </Button>
      ) : (
        <div className="space-y-3 pt-1">
          <p className="text-xs text-red-400 font-semibold">
            Skriv inn <span className="font-mono bg-red-500/10 px-1.5 py-0.5 rounded">{DELETION_CONFIRM_PHRASE}</span> for å bekrefte:
          </p>
          <input
            type="text"
            value={confirmInput}
            onChange={e => { setConfirmInput(e.target.value); setError(null); }}
            placeholder={DELETION_CONFIRM_PHRASE}
            className="w-full px-3 py-2 text-sm rounded-lg border border-red-500/30 bg-red-500/5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-red-500/60"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-red-400 border-red-500/30 hover:bg-red-500/20"
              onClick={handleRequestDeletion}
              disabled={loading || !confirmInput.trim()}
            >
              {loading ? "Behandler…" : "Bekreft sletting"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => { setShowConfirm(false); setConfirmInput(""); setError(null); }}
              disabled={loading}
            >
              Avbryt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Billing() {
  const { t }             = useTranslation();
  const [, navigate]      = useLocation();
  const { isAuthenticated, isAuthLoading } = useUserAuth();

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) { navigate("/sign-in"); return; }
  }, [isAuthenticated, isAuthLoading, navigate]);
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
          Full tilgang til DriveGarage for 50 kr per måned. Abonnementet administreres og betales med Vipps.
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
                <span className="text-3xl font-black text-foreground">50 kr</span>
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
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] light:border-border light:bg-white p-6">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-5">
          Slik fungerer betalingen
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { step: "1", label: "Opprett konto og logg inn" },
            { step: "2", label: "Godkjenn Vipps-betalingsavtale" },
            { step: "3", label: "Full tilgang for 50 kr/mnd" },
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
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] light:border-border light:bg-white p-6">
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
