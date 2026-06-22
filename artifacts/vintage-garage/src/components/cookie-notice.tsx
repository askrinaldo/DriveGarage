import { useState } from "react";
import { Link } from "wouter";
import { X, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const NOTICE_KEY = "dg-cookie-notice-v1";

export function CookieNotice() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(NOTICE_KEY) === "1";
    } catch {
      return true;
    }
  });

  if (dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(NOTICE_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label="Informasjonskapsler"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#0d1220]/95 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Cookie className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-xs text-[#c5d0e8] flex-1 leading-relaxed">
          DriveGarage bruker kun <strong className="text-white">nødvendig lokal lagring</strong> for
          autentisering, preferanser og appfunksjonalitet. Vi bruker ingen sporings- eller
          analyseverktøy.{" "}
          <Link href="/cookies" className="underline hover:text-white transition-colors">Les mer om informasjonskapsler</Link>
          .
        </p>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-7 px-3 text-xs border-white/20 bg-white/5 hover:bg-white/10 text-white"
          onClick={dismiss}
        >
          OK, forstått
        </Button>
        <button
          aria-label="Lukk"
          className="shrink-0 text-[#8899bb] hover:text-white transition-colors sm:ml-1"
          onClick={dismiss}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
