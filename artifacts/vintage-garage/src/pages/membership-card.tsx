import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Car, Wrench, Star, Shield, Download } from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { LoadingState } from "@/components/ui-states";

interface Profile {
  id: number;
  name: string;
  email: string;
  subscriptionTier: "free" | "standard" | "premium";
  createdAt: string;
  stats: {
    vehicleCount: number;
    serviceCount: number;
    score: number;
  };
}

const TIER_CONFIG = {
  free: { label: "Gratis", color: "#6b7280", glow: "rgba(107,114,128,0.3)", text: "text-gray-400" },
  standard: { label: "Standard", color: "#3b82f6", glow: "rgba(59,130,246,0.3)", text: "text-blue-400" },
  premium: { label: "Premium", color: "#b87333", glow: "rgba(184,115,51,0.4)", text: "text-amber-400" },
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatMemberNumber(id: number) {
  return `VG-${String(id).padStart(6, "0")}`;
}

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

export default function MembershipCard() {
  const [, navigate] = useLocation();
  const { isAuthenticated, token } = useUserAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    void (async () => {
      const res = await fetch("/api/profile/me", { headers: { "x-user-token": token ?? "" } });
      if (res.ok) setProfile(await res.json() as Profile);
      setLoading(false);
    })();
  }, [isAuthenticated, token, navigate]);

  if (loading) return <LoadingState message="Laster medlemskort..." />;
  if (!profile) return null;

  const tier = TIER_CONFIG[profile.subscriptionTier];
  const memberSince = new Date(profile.createdAt);
  const memberSinceStr = `${MONTH_NAMES[memberSince.getMonth()]} ${memberSince.getFullYear()}`;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Digitalt medlemskort</h1>
          <p className="text-sm text-muted-foreground">Ditt personlige kort for GaragePilot</p>
        </div>
      </div>

      {/* Card */}
      <div className="flex justify-center">
        <div
          className="relative w-full max-w-md rounded-2xl overflow-hidden select-none"
          style={{
            background: "linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)",
            border: `1px solid ${tier.color}40`,
            boxShadow: `0 0 40px ${tier.glow}, 0 20px 60px rgba(0,0,0,0.5)`,
          }}
        >
          {/* Top copper strip */}
          <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${tier.color}, transparent)` }} />

          {/* Header */}
          <div className="px-7 pt-6 pb-4 flex items-start justify-between">
            <div>
              <div className="text-xs font-bold tracking-[0.3em] text-gray-500 uppercase mb-1">GaragePilot</div>
              <div className="text-[10px] text-gray-600 tracking-widest uppercase">Medlemskort</div>
            </div>
            <div
              className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase"
              style={{ background: `${tier.color}20`, color: tier.color, border: `1px solid ${tier.color}40` }}
            >
              {tier.label}
            </div>
          </div>

          {/* Avatar + name */}
          <div className="px-7 py-4 flex items-center gap-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
              style={{ background: `${tier.color}20`, color: tier.color, border: `2px solid ${tier.color}60` }}
            >
              {getInitials(profile.name)}
            </div>
            <div>
              <div className="text-white text-lg font-bold">{profile.name}</div>
              <div className="text-gray-500 text-xs mt-0.5">{profile.email}</div>
              <div className="text-gray-600 text-[10px] mt-1 font-mono">{formatMemberNumber(profile.id)}</div>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-7 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tier.color}40, transparent)` }} />

          {/* Stats row */}
          <div className="px-7 py-5 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold" style={{ color: tier.color }}>{profile.stats.vehicleCount}</div>
              <div className="text-[10px] text-gray-600 mt-0.5 flex items-center justify-center gap-1">
                <Car className="w-3 h-3" />Kjøretøy
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: tier.color }}>{profile.stats.serviceCount}</div>
              <div className="text-[10px] text-gray-600 mt-0.5 flex items-center justify-center gap-1">
                <Wrench className="w-3 h-3" />Service
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: tier.color }}>{profile.stats.score}</div>
              <div className="text-[10px] text-gray-600 mt-0.5 flex items-center justify-center gap-1">
                <Star className="w-3 h-3" />Poeng
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mx-7 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tier.color}40, transparent)` }} />

          {/* Footer */}
          <div className="px-7 py-5 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-widest">Medlem siden</div>
              <div className="text-sm text-gray-400 font-medium mt-0.5">{memberSinceStr}</div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Tilgang</div>
              <Shield className="w-5 h-5" style={{ color: tier.color }} />
            </div>
          </div>

          {/* Decorative QR-like pattern */}
          <div className="absolute bottom-4 right-6 opacity-10">
            <div className="grid grid-cols-4 gap-0.5">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-sm" style={{ background: tier.color, opacity: Math.random() > 0.4 ? 1 : 0 }} />
              ))}
            </div>
          </div>

          {/* Bottom copper strip */}
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, transparent, ${tier.color}60, transparent)` }} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => window.print()}
        >
          <Download className="w-4 h-4" />
          Lagre / skriv ut
        </Button>
        <Button variant="outline" onClick={() => navigate("/billing")}>
          Oppgrader abonnement
        </Button>
      </div>

      {/* Score explanation */}
      <div className="max-w-md mx-auto">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="font-semibold text-sm">Poeng-oversikt</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Kjøretøy ({profile.stats.vehicleCount} × 50 p)</span>
              <span className="font-mono">{profile.stats.vehicleCount * 50}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Serviceoppføringer ({profile.stats.serviceCount} × 10 p)</span>
              <span className="font-mono">{profile.stats.serviceCount * 10}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-border pt-2">
              <span>Totalt</span>
              <span className="font-mono text-primary">{profile.stats.score}</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Poeng øker med aktivitet — legg til kjøretøy, logg service og delta i klubber for å klatre på leaderboardet.
          </p>
        </div>
      </div>
    </div>
  );
}
