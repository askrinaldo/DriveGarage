import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { LoadingState } from "@/components/ui-states";
import { useTranslation } from "react-i18next";
import html2canvas from "html2canvas";

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

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatMemberNumber(id: number) {
  return `VG-${String(id).padStart(6, "0")}`;
}

const TIER_CONFIG = {
  free:     { color: "#9ca3af", glow: "rgba(156,163,175,0.25)" },
  standard: { color: "#3b82f6", glow: "rgba(59,130,246,0.3)"  },
  premium:  { color: "#c97c2e", glow: "rgba(201,124,46,0.4)"  },
};

function VintageCarSvg({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 340 110" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      {/* Classic muscle car silhouette (1960s style, side view) */}
      <g opacity="0.18" fill={color}>
        {/* Main body */}
        <path d="M 18 76 L 18 58 Q 20 50 28 44 L 52 34 Q 72 26 98 24 L 148 22 Q 178 21 200 25 Q 218 30 228 40 L 238 52 L 248 58 L 252 76 Z" />
        {/* Roof / cabin */}
        <path d="M 62 58 L 68 34 Q 78 26 98 24 L 148 22 Q 170 21 192 26 L 210 34 L 218 52 L 62 52 Z" />
        {/* Windshield */}
        <path d="M 72 52 L 78 32 Q 90 26 110 24 L 148 23 L 148 52 Z" opacity="0.5" />
        {/* Rear window */}
        <path d="M 152 52 L 152 23 L 190 26 L 208 35 L 216 50 Z" opacity="0.5" />
        {/* Front bumper / grille */}
        <rect x="236" y="58" width="18" height="8" rx="2" />
        <rect x="240" y="50" width="12" height="6" rx="1" />
        {/* Rear bumper */}
        <rect x="16" y="62" width="12" height="7" rx="2" />
        {/* Headlight */}
        <ellipse cx="251" cy="56" rx="5" ry="4" opacity="0.7" />
        {/* Door panel detail */}
        <rect x="92" y="44" width="80" height="20" rx="3" opacity="0.15" />
        {/* Chrome strips */}
        <rect x="18" y="58" width="234" height="2" rx="1" opacity="0.3" />
        {/* Wheels */}
        <circle cx="68"  cy="76" r="21" />
        <circle cx="68"  cy="76" r="13" fill="#1a1a2e" />
        <circle cx="68"  cy="76" r="7"  />
        <circle cx="194" cy="76" r="21" />
        <circle cx="194" cy="76" r="13" fill="#1a1a2e" />
        <circle cx="194" cy="76" r="7"  />
        {/* Wheel spokes */}
        {[0,60,120,180,240,300].map(a => {
          const rad = a * Math.PI / 180;
          return (
            <line key={a}
              x1={68 + Math.cos(rad) * 7} y1={76 + Math.sin(rad) * 7}
              x2={68 + Math.cos(rad) * 13} y2={76 + Math.sin(rad) * 13}
              stroke="#1a1a2e" strokeWidth="1.5"
            />
          );
        })}
        {[0,60,120,180,240,300].map(a => {
          const rad = a * Math.PI / 180;
          return (
            <line key={a}
              x1={194 + Math.cos(rad) * 7} y1={76 + Math.sin(rad) * 7}
              x2={194 + Math.cos(rad) * 13} y2={76 + Math.sin(rad) * 13}
              stroke="#1a1a2e" strokeWidth="1.5"
            />
          );
        })}
        {/* Ground shadow */}
        <ellipse cx="131" cy="99" rx="120" ry="5" opacity="0.2" />
      </g>
    </svg>
  );
}

function MotorcycleSvg({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 220 110" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
      <g opacity="0.18" fill={color}>
        {/* Rear wheel */}
        <circle cx="42"  cy="74" r="26" />
        <circle cx="42"  cy="74" r="17" fill="#1a1a2e" />
        <circle cx="42"  cy="74" r="8"  />
        {[0,45,90,135,180,225,270,315].map(a => {
          const rad = a * Math.PI / 180;
          return (
            <line key={a}
              x1={42 + Math.cos(rad) * 8} y1={74 + Math.sin(rad) * 8}
              x2={42 + Math.cos(rad) * 17} y2={74 + Math.sin(rad) * 17}
              stroke="#1a1a2e" strokeWidth="1.2"
            />
          );
        })}
        {/* Front wheel */}
        <circle cx="174" cy="74" r="26" />
        <circle cx="174" cy="74" r="17" fill="#1a1a2e" />
        <circle cx="174" cy="74" r="8"  />
        {[0,45,90,135,180,225,270,315].map(a => {
          const rad = a * Math.PI / 180;
          return (
            <line key={a}
              x1={174 + Math.cos(rad) * 8} y1={74 + Math.sin(rad) * 8}
              x2={174 + Math.cos(rad) * 17} y2={74 + Math.sin(rad) * 17}
              stroke="#1a1a2e" strokeWidth="1.2"
            />
          );
        })}
        {/* Frame */}
        <path d="M 42 74 L 62 46 L 108 38 L 138 46 L 174 74" stroke={color} strokeWidth="4" fill="none" opacity="0.18" />
        {/* Engine / body */}
        <path d="M 68 48 L 62 46 L 62 68 L 120 68 L 120 46 L 108 38 Z" opacity="0.9" />
        {/* Fuel tank */}
        <path d="M 80 38 Q 94 28 108 38 L 120 46 L 68 48 Z" opacity="0.95" />
        {/* Seat */}
        <path d="M 58 44 L 58 40 Q 64 35 80 35 L 80 38 L 62 46 Z" />
        {/* Rider seat pad */}
        <rect x="55" y="36" width="32" height="6" rx="3" opacity="0.7" />
        {/* Headlight */}
        <circle cx="186" cy="60" r="8" opacity="0.7" />
        <circle cx="186" cy="60" r="5" opacity="0.4" />
        {/* Exhaust pipe */}
        <path d="M 64 68 L 46 76" stroke={color} strokeWidth="3" fill="none" opacity="0.25" />
        {/* Handlebar */}
        <path d="M 164 46 L 168 38 L 178 36 L 180 40" stroke={color} strokeWidth="2.5" fill="none" opacity="0.2" />
        {/* Front fork */}
        <path d="M 168 48 L 174 74" stroke={color} strokeWidth="3" fill="none" opacity="0.2" />
        <path d="M 172 48 L 174 74" stroke={color} strokeWidth="3" fill="none" opacity="0.2" />
        {/* Rear swing arm */}
        <path d="M 42 74 L 58 66" stroke={color} strokeWidth="3" fill="none" opacity="0.2" />
        {/* Ground shadow */}
        <ellipse cx="108" cy="101" rx="80" ry="4" opacity="0.15" />
      </g>
    </svg>
  );
}

export default function MembershipCard() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isAuthenticated, isAuthLoading, getAuthHeaders } = useUserAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  const months = t("memberCard.months", { returnObjects: true }) as string[];

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) { navigate("/login"); return; }
    void (async () => {
      const authHeaders = await getAuthHeaders();
      const res = await fetch("/api/profile/me", { headers: authHeaders });
      if (res.ok) setProfile(await res.json() as Profile);
      setLoading(false);
    })();
  }, [isAuthenticated, isAuthLoading, getAuthHeaders, navigate]);

  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `drivegarage-${profile?.name?.replace(/\s+/g, "-").toLowerCase() ?? "card"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <LoadingState message={t("memberCard.loading")} />;
  if (!profile) return null;

  const tier = TIER_CONFIG[profile.subscriptionTier];
  const tierLabel = t(`memberCard.tier${profile.subscriptionTier.charAt(0).toUpperCase() + profile.subscriptionTier.slice(1)}`);
  const memberSince = new Date(profile.createdAt);
  const memberSinceStr = `${months[memberSince.getMonth()]} ${memberSince.getFullYear()}`;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #membership-print-root { display: block !important; }
          #membership-print-root .no-print { display: none !important; }
          #membership-print-root .print-card-wrapper {
            display: flex !important;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: white;
          }
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
      `}</style>

      <div id="membership-print-root" className="space-y-6 pb-10">
        {/* Header — hidden when printing */}
        <div className="flex items-center gap-3 no-print">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("memberCard.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("memberCard.subtitle")}</p>
          </div>
        </div>

        {/* Card */}
        <div className="print-card-wrapper flex justify-center">
          <div
            ref={cardRef}
            className="relative overflow-hidden select-none"
            style={{
              width: "520px",
              height: "310px",
              borderRadius: "20px",
              background: `linear-gradient(145deg, #0f0f1a 0%, #1a1230 40%, #0f0f1a 100%)`,
              border: `1.5px solid ${tier.color}50`,
              boxShadow: `0 0 60px ${tier.glow}, 0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 ${tier.color}30`,
            }}
          >
            {/* Grain texture overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
                opacity: 0.4,
              }}
            />

            {/* Background: old car (left side) */}
            <div className="absolute" style={{ left: "-30px", bottom: "-10px", width: "320px", height: "130px", pointerEvents: "none" }}>
              <VintageCarSvg color={tier.color} />
            </div>

            {/* Background: motorcycle (right side) */}
            <div className="absolute" style={{ right: "-20px", bottom: "-8px", width: "220px", height: "120px", pointerEvents: "none" }}>
              <MotorcycleSvg color={tier.color} />
            </div>

            {/* Radial glow from center-top */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: "-60px", left: "50%", transform: "translateX(-50%)",
                width: "300px", height: "200px",
                background: `radial-gradient(ellipse, ${tier.color}18 0%, transparent 70%)`,
              }}
            />

            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: `linear-gradient(90deg, transparent 5%, ${tier.color} 40%, ${tier.color}cc 60%, transparent 95%)` }}
            />

            {/* Content layer */}
            <div className="relative z-10 flex flex-col h-full p-7">

              {/* Top row: logo + tier badge */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div
                    className="text-base font-black tracking-[0.25em] uppercase"
                    style={{ color: tier.color, letterSpacing: "0.3em", fontFamily: "system-ui, sans-serif" }}
                  >
                    DriveGarage
                  </div>
                  <div className="text-[9px] tracking-[0.25em] uppercase mt-0.5" style={{ color: `${tier.color}80` }}>
                    {t("memberCard.cardLabel")}
                  </div>
                </div>
                <div
                  className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
                  style={{
                    background: `${tier.color}18`,
                    color: tier.color,
                    border: `1px solid ${tier.color}50`,
                    boxShadow: `0 0 12px ${tier.glow}`,
                  }}
                >
                  {tierLabel}
                </div>
              </div>

              {/* Name — the centrepiece */}
              <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div
                    className="shrink-0 flex items-center justify-center text-lg font-black rounded-full"
                    style={{
                      width: "54px",
                      height: "54px",
                      background: `linear-gradient(145deg, ${tier.color}30, ${tier.color}10)`,
                      border: `2px solid ${tier.color}70`,
                      color: tier.color,
                      boxShadow: `0 0 16px ${tier.glow}`,
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {getInitials(profile.name)}
                  </div>
                  <div>
                    <div
                      className="font-black leading-tight"
                      style={{
                        fontSize: "1.55rem",
                        color: "#f8fafc",
                        textShadow: `0 0 30px ${tier.color}60`,
                        fontFamily: "system-ui, sans-serif",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {profile.name}
                    </div>
                    <div className="text-[11px] mt-0.5 font-mono" style={{ color: `${tier.color}90` }}>
                      {formatMemberNumber(profile.id)}
                    </div>
                  </div>
                </div>

                {/* Thin divider */}
                <div className="mt-4 mb-3 h-px" style={{ background: `linear-gradient(90deg, ${tier.color}40, ${tier.color}10, transparent)` }} />

                {/* Stats row */}
                <div className="flex gap-6">
                  <div>
                    <div className="text-[9px] uppercase tracking-widest" style={{ color: `${tier.color}70` }}>
                      {t("memberCard.vehicles")}
                    </div>
                    <div className="text-xl font-bold mt-0.5" style={{ color: tier.color }}>
                      {profile.stats.vehicleCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom row: member since + email */}
              <div className="flex items-end justify-between mt-2">
                <div>
                  <div className="text-[9px] uppercase tracking-widest" style={{ color: `${tier.color}60` }}>
                    {t("memberCard.memberSince")}
                  </div>
                  <div className="text-xs font-semibold mt-0.5" style={{ color: "#cbd5e1" }}>
                    {memberSinceStr}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px]" style={{ color: `${tier.color}50` }}>
                    {profile.email}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px]"
              style={{ background: `linear-gradient(90deg, transparent 10%, ${tier.color}60 50%, transparent 90%)` }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-3 no-print">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="w-4 h-4" />
            {downloading ? t("memberCard.downloading") : t("memberCard.downloadPng")}
          </Button>
          <Button
            className="gap-2"
            onClick={handlePrint}
            style={{ background: tier.color, color: "#fff", border: `1px solid ${tier.color}` }}
          >
            <Printer className="w-4 h-4" />
            {t("memberCard.print")}
          </Button>
        </div>

      </div>
    </>
  );
}
