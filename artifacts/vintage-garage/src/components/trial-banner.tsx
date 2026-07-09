import { Link } from "wouter";
import { Clock, X, AlertTriangle, XCircle } from "lucide-react";
import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";

function getDaysRemaining(trialEndsAt: string | null | undefined): number | null {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function TrialBanner() {
  const { data: sub } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const status = sub?.status;

  const DismissBtn = ({ color = "amber" }: { color?: string }) => (
    <button
      onClick={() => setDismissed(true)}
      className={`text-${color}-400/60 hover:text-${color}-400 transition-colors shrink-0`}
      aria-label="Lukk"
    >
      <X className="w-4 h-4" />
    </button>
  );

  if (status === "trialing") {
    const daysLeft = getDaysRemaining(sub?.trialEndsAt);
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300 truncate">
            {daysLeft !== null
              ? `Prøveperiode utløper om ${daysLeft} dag${daysLeft === 1 ? "" : "er"} — godkjenn Vipps-avtale for å fortsette.`
              : "Din gratis prøveperiode er aktiv — godkjenn Vipps-avtale for å fortsette etter prøveperioden."}
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

  if (status === "pending_vipps_agreement") {
    return (
      <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-orange-400 shrink-0" />
          <p className="text-sm text-orange-300 truncate">
            Prøveperioden er avsluttet. Godkjenn Vipps-betalingsavtale for å gjenopprette tilgangen.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/billing">
            <button className="text-xs font-semibold text-orange-300 border border-orange-500/30 rounded-lg px-3 py-1 hover:bg-orange-500/20 transition-colors whitespace-nowrap">
              Gjenopprett tilgang
            </button>
          </Link>
          <DismissBtn color="orange" />
        </div>
      </div>
    );
  }

  if (status === "past_due" || status === "payment_failed") {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 truncate">
            Siste betaling feilet. Sjekk Vipps-appen din — data slettes ikke automatisk.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/billing">
            <button className="text-xs font-semibold text-red-300 border border-red-500/30 rounded-lg px-3 py-1 hover:bg-red-500/20 transition-colors whitespace-nowrap">
              Se abonnement
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
            Abonnementet ditt har utløpt. Aktiver Vipps-betaling for å gjenopprette tilgangen.
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
    return (
      <div className="bg-muted/20 border-b border-border/40 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground truncate">
            Abonnementet er kansellert. Du beholder tilgang til slutten av perioden.
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
