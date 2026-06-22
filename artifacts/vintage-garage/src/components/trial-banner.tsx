import { Link } from "wouter";
import { Clock, X } from "lucide-react";
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

  if (status === "trialing") {
    const daysLeft = getDaysRemaining(
      (sub as { trialEndsAt?: string }).trialEndsAt ?? null
    );
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
              Godkjenn Vipps
            </button>
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-400/60 hover:text-amber-400 transition-colors"
            aria-label="Lukk"
          >
            <X className="w-4 h-4" />
          </button>
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
          <button
            onClick={() => setDismissed(true)}
            className="text-orange-400/60 hover:text-orange-400 transition-colors"
            aria-label="Lukk"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (status === "past_due") {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 truncate">
            Siste betaling feilet. Vi prøver igjen automatisk — sjekk Vipps-appen din.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/billing">
            <button className="text-xs font-semibold text-red-300 border border-red-500/30 rounded-lg px-3 py-1 hover:bg-red-500/20 transition-colors whitespace-nowrap">
              Se abonnement
            </button>
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-red-400/60 hover:text-red-400 transition-colors"
            aria-label="Lukk"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
