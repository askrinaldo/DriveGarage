import { Link } from "wouter";
import { AlertTriangle, XCircle, X, CreditCard, Clock } from "lucide-react";
import { useState } from "react";
import { useSubscription, canAccessApp } from "@/hooks/use-subscription";

export function TrialBanner() {
  const { data: sub }   = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const status             = sub?.status ?? null;
  const enforcementEnabled = sub?.enforcementEnabled ?? false;
  const currentPeriodEndsAt = sub?.currentPeriodEndsAt ?? null;

  const DismissBtn = ({ color = "amber" }: { color?: string }) => (
    <button
      onClick={() => setDismissed(true)}
      className={`text-${color}-400/60 hover:text-${color}-400 transition-colors shrink-0`}
      aria-label="Lukk"
    >
      <X className="w-4 h-4" />
    </button>
  );

  // pending_payment_setup — only show banner when enforcement is on
  if (status === "pending_payment_setup" && enforcementEnabled) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300 truncate">
            Abonnement er ikke aktivert. Sett opp betaling via Vipps for å fortsette.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/billing">
            <button className="text-xs font-semibold text-amber-300 border border-amber-500/30 rounded-lg px-3 py-1 hover:bg-amber-500/20 transition-colors whitespace-nowrap">
              Aktiver abonnement
            </button>
          </Link>
          <DismissBtn color="amber" />
        </div>
      </div>
    );
  }

  if (status === "past_due") {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300 truncate">
            Betaling forfalt. Sjekk Vipps-appen din — tilgang beholdes midlertidig.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/billing">
            <button className="text-xs font-semibold text-amber-300 border border-amber-500/30 rounded-lg px-3 py-1 hover:bg-amber-500/20 transition-colors whitespace-nowrap">
              Se abonnement
            </button>
          </Link>
          <DismissBtn color="amber" />
        </div>
      </div>
    );
  }

  if (status === "payment_failed") {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 truncate">
            Betaling feilet. Aktiver Vipps-avtalen på nytt for å beholde tilgangen.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/billing">
            <button className="text-xs font-semibold text-red-300 border border-red-500/30 rounded-lg px-3 py-1 hover:bg-red-500/20 transition-colors whitespace-nowrap">
              Aktiver abonnement
            </button>
          </Link>
          <DismissBtn color="red" />
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 truncate">
            Abonnementet har utløpt. Aktiver via Vipps for å gjenopprette tilgangen.
            Data beholdes i 90 dager.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/billing">
            <button className="text-xs font-semibold text-red-300 border border-red-500/30 rounded-lg px-3 py-1 hover:bg-red-500/20 transition-colors whitespace-nowrap">
              Aktiver abonnement
            </button>
          </Link>
          <DismissBtn color="red" />
        </div>
      </div>
    );
  }

  if (status === "canceled") {
    const periodEnds = currentPeriodEndsAt
      ? new Date(currentPeriodEndsAt).toLocaleDateString("no-NO")
      : null;
    return (
      <div className="bg-muted/20 border-b border-border/40 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground truncate">
            Abonnementet er kansellert.
            {periodEnds ? ` Du beholder tilgang til ${periodEnds}.` : " Du beholder tilgang til slutten av perioden."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/billing">
            <button className="text-xs font-semibold text-muted-foreground border border-border/60 rounded-lg px-3 py-1 hover:bg-muted/30 transition-colors whitespace-nowrap">
              Se detaljer
            </button>
          </Link>
          <DismissBtn color="muted-foreground" />
        </div>
      </div>
    );
  }

  return null;
}
