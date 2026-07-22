import { Link } from "wouter";
import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Wrench, Banknote, Route, ArrowRight, Users,
  ChevronRight, MapPin, Plus, Bike, Gauge, Clock,
  CheckCircle2, Circle, FileText, Search, Receipt,
  Crown, Shield, User,
} from "lucide-react";
import {
  useGetDashboardStats,
  useGetRecentActivity,
  getGetDashboardStatsQueryKey,
  getGetRecentActivityQueryKey,
  useListVehicles,
  getListVehiclesQueryKey,
  useListClubs,
  getListClubsQueryKey,
} from "@workspace/api-client-react";
import { keepPreviousData } from "@tanstack/react-query";
import { DashboardSkeleton, ErrorState } from "@/components/ui-states";
import { useAuth } from "@clerk/react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useTranslation } from "react-i18next";
import { getCurrentLocale } from "@/i18n";
import { useSubscription } from "@/hooks/use-subscription";

/* ── Role pill ─────────────────────────────────────────────────── */
function RolePill({ role }: { role: string | null | undefined }) {
  if (role === "owner")
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/20">
        <Crown className="w-2 h-2" /> Eier
      </span>
    );
  if (role === "admin")
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
        <Shield className="w-2 h-2" /> Admin
      </span>
    );
  if (role === "member")
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400/80 border border-emerald-500/20">
        <User className="w-2 h-2" /> Medlem
      </span>
    );
  return null;
}

/* ── Category colours ──────────────────────────────────────────── */
const CATEGORY_DOT: Record<string, string> = {
  "oil-change": "bg-amber-500",
  brakes:       "bg-red-500",
  tires:        "bg-slate-400",
  engine:       "bg-blue-500",
  electrical:   "bg-yellow-400",
  bodywork:     "bg-purple-500",
  other:        "bg-emerald-500",
};

/* ── Stat card ─────────────────────────────────────────────────── */
const StatCard = memo(function StatCard({
  icon: Icon, label, value, rawValue, hint, href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  rawValue?: number;
  hint?: string;
  href?: string;
}) {
  const isEmpty = rawValue !== undefined && rawValue === 0;
  const inner = (
    <div className={`group flex items-start gap-3.5 rounded-xl border bg-card px-5 py-4 transition-all duration-200 h-full ${
      href
        ? isEmpty
          ? "border-border/30 hover:border-primary/20 hover:bg-primary/[0.02] cursor-pointer"
          : "border-border/50 hover:border-primary/30 hover:bg-muted/20 cursor-pointer"
        : "border-border/50"
    }`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
        isEmpty ? "bg-muted/40" : "bg-primary/10"
      }`}>
        <Icon style={{ width: 18, height: 18 }} className={isEmpty ? "text-muted-foreground/30" : "text-primary"} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1.5">{label}</p>
        {isEmpty && hint ? (
          <p className="text-[11px] text-muted-foreground/40 leading-snug">{hint}</p>
        ) : (
          <p className="text-xl font-black text-foreground tabular-nums leading-none">{value}</p>
        )}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
});

/* ── Compact vehicle strip (replaces giant hero on dashboard) ──── */
function CompactVehicleStrip({
  vehicles, primaryVehicle, systemOk, locale,
}: {
  vehicles: { id: number; make: string; model: string; year: number | null; type: string; color?: string | null; mileage?: number | null; imageUrl?: string | null; registrationNumber?: string | null }[];
  primaryVehicle: { id: number; make: string; model: string; year: number | null; type: string; color?: string | null; mileage?: number | null; imageUrl?: string | null; registrationNumber?: string | null } | null;
  systemOk: boolean;
  locale: string;
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const safeIdx = Math.min(selectedIdx, Math.max(0, vehicles.length - 1));
  const vehicle = vehicles[safeIdx] ?? primaryVehicle;
  if (!vehicle) return null;

  const isMoto = vehicle.type === "motorcycle";

  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      {/* ── Primary vehicle row ── */}
      <div className="flex items-center gap-4 p-4">
        {/* Thumbnail */}
        <div className="relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border border-border/30">
          {vehicle.imageUrl ? (
            <img
              src={vehicle.imageUrl}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center bg-muted/30"
              style={vehicle.color ? {
                background: `color-mix(in srgb, ${vehicle.color} 12%, hsl(220 15% 12%))`,
              } : undefined}
            >
              {isMoto
                ? <Bike className="w-5 h-5 text-muted-foreground/20" />
                : <Car className="w-5 h-5 text-muted-foreground/20" />}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9.5px] font-black text-primary/70 uppercase tracking-widest">Aktivt kjøretøy</span>
            {vehicle.color && (
              <span
                className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                style={{ backgroundColor: vehicle.color }}
              />
            )}
          </div>
          <h3 className="text-[17px] font-black text-foreground uppercase tracking-tight leading-tight truncate">
            {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-[11px] text-muted-foreground/45 mt-0.5 flex items-center gap-1.5 flex-wrap">
            {vehicle.year && <span>{vehicle.year}</span>}
            {vehicle.registrationNumber && (
              <>
                <span className="text-muted-foreground/25">·</span>
                <span className="font-mono">{vehicle.registrationNumber}</span>
              </>
            )}
            {vehicle.mileage && (
              <>
                <span className="text-muted-foreground/25">·</span>
                <span className="flex items-center gap-1">
                  <Gauge className="w-2.5 h-2.5" />
                  {vehicle.mileage.toLocaleString(locale)} km
                </span>
              </>
            )}
          </p>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full border ${
          systemOk ? "border-emerald-500/20 bg-emerald-500/8" : "border-amber-500/20 bg-amber-500/8"
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${systemOk ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span className={`text-[9.5px] font-bold uppercase tracking-wider hidden sm:block ${
            systemOk ? "text-emerald-400/70" : "text-amber-400/70"
          }`}>
            {systemOk ? "System OK" : "Advarsel"}
          </span>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="flex items-center gap-2 px-4 pb-4 flex-wrap">
        <Link href={`/vehicles/${vehicle.id}/service/new`}>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-[11px] font-black uppercase tracking-wide">
            <Wrench className="w-3 h-3" />
            Ny service
          </button>
        </Link>
        <Link href={`/vehicles/${vehicle.id}/receipts/new`}>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border/50 hover:border-border hover:bg-muted/20 transition-colors text-[11px] font-bold uppercase tracking-wide text-foreground/60">
            <Receipt className="w-3 h-3" />
            Legg til dokument
          </button>
        </Link>
        <Link href={`/vehicles/${vehicle.id}`}>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border/50 hover:border-border hover:bg-muted/20 transition-colors text-[11px] font-bold uppercase tracking-wide text-foreground/60">
            <Route className="w-3 h-3" />
            Kjørebok
          </button>
        </Link>
        <Link href="/vehicles" className="ml-auto">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 text-[11px] font-bold text-muted-foreground/45 hover:text-primary">
            Min garasje
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>

      {/* ── Other vehicles strip (if multiple) ── */}
      {vehicles.length > 1 && (
        <div className="border-t border-border/25 px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {vehicles.map((v, i) => {
            const active = i === safeIdx;
            return (
              <button
                key={v.id}
                onClick={() => setSelectedIdx(i)}
                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wide transition-all duration-200 ${
                  active
                    ? "bg-primary/8 border-primary/30 text-primary"
                    : "border-border/30 text-muted-foreground/45 hover:border-border/60 hover:text-foreground/60"
                }`}
              >
                {v.type === "motorcycle"
                  ? <Bike className="w-3 h-3 shrink-0" />
                  : <Car className="w-3 h-3 shrink-0" />}
                <span className="truncate max-w-[80px]">{v.make} {v.model}</span>
              </button>
            );
          })}
          <Link href="/vehicles/new">
            <button className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border/25 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/30 hover:border-primary/25 hover:text-primary/50 transition-all duration-200">
              <Plus className="w-3 h-3" />
              Legg til
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── Premium empty garage ──────────────────────────────────────── */
function EmptyGarage({ firstName }: { firstName: string }) {
  const features = [
    { icon: FileText, label: "Digitalt servicehefte", desc: "All vedlikeholdshistorikk samlet på ett sted" },
    { icon: Banknote, label: "Kvitteringer & utgifter", desc: "Last opp fakturaer og følg kostnadene" },
    { icon: Users,    label: "Klubber & fellesskap",   desc: "Koble deg til andre entusiaster" },
  ];
  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <div className="relative h-60 md:h-72 flex flex-col items-center justify-center text-center px-8 bg-gradient-to-br from-muted/20 via-background to-sidebar">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <Car style={{ width: 400, height: 400 }} className="text-foreground" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Wrench className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">
              Velkommen, {firstName}
            </h2>
            <p className="text-sm text-muted-foreground/60 mt-1.5 max-w-xs mx-auto">
              Legg til ditt første kjøretøy og start din digitale garasje.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link href="/vehicles/new">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 text-[12px] font-bold uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98]">
                <Plus className="w-4 h-4" />
                Legg til kjøretøy
              </button>
            </Link>
            <Link href="/clubs">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border/60 hover:border-border hover:bg-muted/20 transition-colors text-[12px] font-bold uppercase tracking-wide text-foreground/60">
                <Users className="w-4 h-4" />
                Utforsk klubber
              </button>
            </Link>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-border/30 border-t border-border/30">
        {features.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="px-4 py-3.5 flex items-start gap-2.5">
            <Icon className="w-3.5 h-3.5 text-primary/60 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-foreground/60 uppercase tracking-wide">{label}</p>
              <p className="text-[10px] text-muted-foreground/40 mt-0.5 leading-snug hidden sm:block">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Onboarding timeline ────────────────────────────────────────── */
function OnboardingTimeline({ hasVehicle, hasService, hasReceipt, primaryVehicleId }: {
  hasVehicle: boolean;
  hasService: boolean;
  hasReceipt: boolean;
  primaryVehicleId?: number;
}) {
  const steps = [
    {
      done: hasVehicle,
      label: "Legg til ditt første kjøretøy",
      desc: "Start din digitale garasje med bil eller motorsykkel",
      href: "/vehicles/new",
      cta: "Legg til kjøretøy",
    },
    {
      done: hasService,
      label: "Logg din første service",
      desc: "Dokumenter oljeskift, bremser, dekk og mer",
      href: primaryVehicleId ? `/vehicles/${primaryVehicleId}/service/new` : "/vehicles/new",
      cta: "Start servicehefte",
    },
    {
      done: hasReceipt,
      label: "Last opp din første kvittering",
      desc: "Legg ved fakturaer og dokumenter til servicepostene",
      href: primaryVehicleId ? `/vehicles/${primaryVehicleId}/receipts/new` : "/vehicles",
      cta: "Last opp kvittering",
    },
    {
      done: false,
      label: "Registrer kilometerstand",
      desc: "Følg kjøredistansen og vedlikeholdsintervallene",
      href: primaryVehicleId ? `/vehicles/${primaryVehicleId}/edit` : "/vehicles/new",
      cta: "Oppdater km",
    },
  ];

  const firstIncomplete = steps.findIndex(s => !s.done);

  return (
    <div className="py-2 px-5">
      <div className="space-y-0">
        {steps.map((step, i) => {
          const isActive = i === firstIncomplete;
          const isFuture = i > firstIncomplete && firstIncomplete !== -1;
          return (
            <div key={step.label} className="flex gap-4 py-4">
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  step.done
                    ? "border-primary bg-primary"
                    : isActive
                      ? "border-primary bg-transparent"
                      : "border-border/40 bg-transparent"
                }`}>
                  {step.done
                    ? <CheckCircle2 className="w-3 h-3 text-primary-foreground fill-primary-foreground" />
                    : isActive
                      ? <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      : <Circle className="w-2.5 h-2.5 text-muted-foreground/20" />
                  }
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-px flex-1 mt-1 min-h-[20px] transition-colors duration-300 ${step.done ? "bg-primary/30" : "bg-border/30"}`} />
                )}
              </div>
              <div className={`flex-1 min-w-0 pb-2 transition-opacity duration-300 ${isFuture ? "opacity-30" : ""}`}>
                <p className={`text-[12.5px] font-bold leading-tight ${step.done ? "line-through text-muted-foreground/40" : "text-foreground"}`}>
                  {step.label}
                </p>
                {!step.done && (
                  <p className="text-[11px] text-muted-foreground/50 mt-0.5 leading-snug">{step.desc}</p>
                )}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-2.5"
                  >
                    <Link href={step.href} className="inline-flex">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all duration-200 text-[11px] font-bold text-primary uppercase tracking-wide">
                        {step.cta}
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </Link>
                  </motion.div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Club discovery panel ──────────────────────────────────────── */
const CLUB_CATEGORIES = [
  { icon: "🏎", label: "Sportsbiler", desc: "Ferrari, Porsche, Lamborghini" },
  { icon: "🏕", label: "Veteranbiler", desc: "Klassiske biler fra 60–80-tallet" },
  { icon: "🏍", label: "Motorsykler",  desc: "Enduro, cruiser og sportssykler" },
  { icon: "⚡", label: "Elbiler",      desc: "Tesla, BMW i, Polestar og mer" },
];

function ClubDiscovery() {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-border/30">
        <p className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest mb-0.5">
          Utforsk Garasjefellesskapet
        </p>
        <p className="text-[11px] text-muted-foreground/50">
          Bli med i én av hundrevis av norske bilklubber
        </p>
      </div>
      <div className="divide-y divide-border/20">
        {CLUB_CATEGORIES.map(cat => (
          <Link key={cat.label} href="/clubs">
            <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/10 transition-colors cursor-pointer group">
              <span className="text-lg leading-none shrink-0">{cat.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-foreground/80">{cat.label}</p>
                <p className="text-[10px] text-muted-foreground/45 truncate">{cat.desc}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
            </div>
          </Link>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-border/30 flex gap-2">
        <Link href="/clubs" className="flex-1">
          <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-[11px] font-bold uppercase tracking-wide">
            <Users className="w-3.5 h-3.5" />
            Finn din klubb
          </button>
        </Link>
        <Link href="/clubs">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border/50 hover:border-border hover:bg-muted/10 transition-colors text-muted-foreground/50 hover:text-foreground/60">
            <Search className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}

/* ── Quick start checklist ─────────────────────────────────────── */
function QuickStartChecklist({
  hasVehicle, hasService, hasClub, primaryVehicleId,
}: {
  hasVehicle: boolean;
  hasService: boolean;
  hasClub: boolean;
  primaryVehicleId?: number;
}) {
  const steps = [
    { done: hasVehicle,  label: "Legg til kjøretøy",   href: "/vehicles/new" },
    { done: hasService,  label: "Logg første service",  href: primaryVehicleId ? `/vehicles/${primaryVehicleId}/service/new` : "/vehicles" },
    { done: hasClub,     label: "Bli med i en klubb",   href: "/clubs" },
  ];
  const allDone = steps.every(s => s.done);
  if (allDone) return null;
  const doneCount = steps.filter(s => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="rounded-xl border border-border/50 bg-card overflow-hidden"
    >
      <div className="px-4 pt-3.5 pb-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest">Kom i gang</p>
          <span className="text-[10px] font-bold text-primary/70">{doneCount}/{steps.length}</span>
        </div>
        <div className="h-1 bg-muted/40 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: 0.5, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          />
        </div>
      </div>
      <div className="divide-y divide-border/20 pb-1">
        {steps.map((step) => (
          <Link key={step.label} href={step.href}>
            <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer group ${
              step.done ? "opacity-40" : "hover:bg-muted/10"
            }`}>
              {step.done ? (
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-border/50 group-hover:border-primary/50 transition-colors shrink-0" />
              )}
              <span className={`text-[12px] font-semibold flex-1 ${step.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {step.label}
              </span>
              {!step.done && (
                <ArrowRight className="w-3 h-3 text-muted-foreground/20 group-hover:text-primary/50 transition-colors shrink-0" />
              )}
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Activity item ─────────────────────────────────────────────── */
function ActivityItem({ item, locale }: {
  item: { id: number; title: string; vehicleName: string; serviceDate: string; category: string; cost?: number | null };
  locale: string;
}) {
  return (
    <div className="flex items-center gap-3.5 py-3 group">
      <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${CATEGORY_DOT[item.category] ?? "bg-primary"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-foreground truncate">{item.title}</p>
        <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{item.vehicleName}</p>
      </div>
      <div className="text-right shrink-0 pl-3 border-l border-border/30">
        {item.cost != null && (
          <p className="text-[12px] font-mono text-foreground/80 font-semibold">
            kr {item.cost.toLocaleString(locale)}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground/40 mt-0.5 flex items-center gap-1 justify-end">
          <Clock className="w-2.5 h-2.5" />
          {new Date(item.serviceDate).toLocaleDateString(locale, { day: "numeric", month: "short" })}
        </p>
      </div>
    </div>
  );
}

/* ── Main Dashboard ───────────────────────────────────────────── */
export default function Dashboard() {
  const { isSignedIn } = useAuth();
  const { name, tenantName, isPersonalTenant, isAuthLoading } = useUserAuth();
  const { t } = useTranslation();
  const locale = getCurrentLocale();

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey(), staleTime: 60_000, placeholderData: keepPreviousData },
  });
  const { data: activity, isLoading: activityLoading, isError: activityError, refetch: refetchActivity } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey(), staleTime: 60_000, placeholderData: keepPreviousData },
  });
  const { data: vehicles, isLoading: vehiclesLoading } = useListVehicles({
    query: { queryKey: getListVehiclesQueryKey(), staleTime: 60_000, placeholderData: keepPreviousData },
  });
  const { data: clubs } = useListClubs(
    { scope: "mine" },
    { query: { queryKey: getListClubsQueryKey({ scope: "mine" }), enabled: !!isSignedIn } }
  );
  const { data: subscription } = useSubscription();

  const initialLoading = (statsLoading && !stats) || (activityLoading && !activity) || (vehiclesLoading && !vehicles);
  const isError = statsError || activityError;

  if (initialLoading) return <DashboardSkeleton />;
  if (isError) return <ErrorState onRetry={() => { refetchStats(); refetchActivity(); }} />;

  const firstName = name?.split(" ")[0] ?? t("dashboard.defaultName");
  const garageTitle = isPersonalTenant
    ? `${firstName}s Garasje`
    : (tenantName ?? "Min Garasje");

  const vehicleList = vehicles ?? [];
  const primaryVehicle = vehicleList[0] ?? null;
  const myClubs = (clubs ?? []).slice(0, 4);
  const recentActivity = (activity ?? []).slice(0, 8);

  const hasVehicle = vehicleList.length > 0;
  const hasService = (stats?.totalServiceRecords ?? 0) > 0;
  const hasClub = myClubs.length > 0;
  const hasReceipt = recentActivity.some(a => a.cost != null && a.cost > 0);

  const systemOk = !subscription || subscription.enforcementEnabled === false || subscription.status === "active" || subscription.status === "exempt_internal";

  const dateStr = new Date().toLocaleDateString(locale, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-6 pb-12">

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-widest mb-1.5">
            {dateStr}
          </p>
          {isAuthLoading && !name ? (
            <div className="animate-pulse h-9 md:h-10 w-48 rounded bg-muted" />
          ) : (
            <h1 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tight leading-none">
              {garageTitle}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Link href="/vehicles/new">
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-primary/50 hover:border-primary bg-transparent hover:bg-primary/5 transition-all duration-200 text-[11px] font-bold uppercase tracking-wide text-primary hover:scale-[1.02] active:scale-[0.98]">
              <Plus className="w-3.5 h-3.5" />
              Legg til kjøretøy
            </button>
          </Link>
          <Link href="/clubs">
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border/50 hover:border-border bg-transparent hover:bg-muted/20 transition-colors text-[11px] font-bold uppercase tracking-wide text-foreground/70">
              <Users className="w-3.5 h-3.5" />
              Klubber
            </button>
          </Link>
        </div>
      </motion.div>

      {/* ── Compact vehicle strip OR empty garage ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      >
        {hasVehicle ? (
          <CompactVehicleStrip
            vehicles={vehicleList}
            primaryVehicle={primaryVehicle}
            systemOk={systemOk}
            locale={locale}
          />
        ) : (
          <EmptyGarage firstName={firstName} />
        )}
      </motion.div>

      {/* ── Stats bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <StatCard
          icon={Car}
          label={t("dashboard.vehicles")}
          value={stats?.totalVehicles ?? 0}
          rawValue={stats?.totalVehicles ?? 0}
          hint="Ditt første kjøretøy starter din digitale historikk"
          href="/vehicles"
        />
        <StatCard
          icon={Wrench}
          label={t("dashboard.serviceRecords")}
          value={stats?.totalServiceRecords ?? 0}
          rawValue={stats?.totalServiceRecords ?? 0}
          hint="Logg din første service for å starte tidslinjen"
          href="/vehicles"
        />
        <StatCard
          icon={Route}
          label={t("dashboard.totalDriven")}
          value={`${(stats?.totalTripKm ?? 0).toLocaleString(locale)} km`}
          rawValue={stats?.totalTripKm ?? 0}
          hint="Vises etter din første kjørelogg"
          href="/vehicles"
        />
        <StatCard
          icon={Banknote}
          label={t("dashboard.totalSpent")}
          value={`${(stats?.totalSpent ?? 0).toLocaleString(locale)} kr`}
          rawValue={stats?.totalSpent ?? 0}
          hint="Last opp kvitteringer for å spore utgifter"
          href="/billing"
        />
      </motion.div>

      {/* ── Main content ──
           Flat grid: headings share row-1, cards share row-2, footers share row-3.
           Same-row items are guaranteed to start at the same y by CSS Grid. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-x-5">

        {/* ── Row 1 left: "Siste aktivitet" heading ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="lg:col-start-1 lg:col-span-2 lg:row-start-1 flex items-center mb-4"
        >
          <h2 className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest">
            {recentActivity.length > 0 ? "Siste aktivitet" : "Kom i gang"}
          </h2>
        </motion.div>

        {/* ── Row 1 right: "Mine Klubber" heading ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="lg:col-start-3 lg:row-start-1 flex items-center justify-between mb-4 mt-5 lg:mt-0"
        >
          <h2 className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest">
            {myClubs.length > 0 ? "Mine Klubber" : "Klubber"}
          </h2>
          <Link href="/clubs">
            <button className="text-sidebar-foreground/30 hover:text-sidebar-foreground/60 transition-colors leading-none">
              <span className="text-[18px] leading-none tracking-widest">···</span>
            </button>
          </Link>
        </motion.div>

        {/* ── Row 2 left: activity card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="lg:col-start-1 lg:col-span-2 lg:row-start-2 self-start rounded-xl border border-border/50 bg-card overflow-hidden"
        >
          {recentActivity.length === 0 ? (
            <OnboardingTimeline
              hasVehicle={hasVehicle}
              hasService={hasService}
              hasReceipt={hasReceipt}
              primaryVehicleId={primaryVehicle?.id}
            />
          ) : (
            <div className="divide-y divide-border/30 px-5">
              <AnimatePresence>
                {recentActivity.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 + i * 0.04, duration: 0.3 }}
                  >
                    <ActivityItem item={item} locale={locale} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* ── Row 2 right: clubs card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="lg:col-start-3 lg:row-start-2 self-start mt-4 lg:mt-0"
        >
          {myClubs.length === 0 ? (
            <ClubDiscovery />
          ) : (
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div className="divide-y divide-border/30">
                {myClubs.map((club, i) => (
                  <motion.div
                    key={club.id}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.22 + i * 0.06 }}
                  >
                    <Link href={`/clubs/${club.id}`}>
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors cursor-pointer group">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-[12px] font-black text-primary shrink-0 overflow-hidden border border-primary/15">
                          {club.logoUrl ? (
                            <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                          ) : (
                            club.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-[12.5px] font-bold text-foreground truncate">{club.name}</p>
                            <RolePill role={club.userRole} />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" />
                              {club.memberCount}+ {club.memberCount === 1 ? "medlem" : "medlemmer"}
                            </span>
                            {club.location && (
                              <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" />
                                {club.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/25 group-hover:text-primary/50 transition-colors" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
                <div className="px-4 py-3">
                  <Link href="/clubs">
                    <button className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/40 hover:text-muted-foreground transition-colors py-1">
                      Utforsk klubber <ArrowRight className="w-3 h-3" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Row 3 left: "Se alle / Legg til post" footer ── */}
        {recentActivity.length > 0 && primaryVehicle && (
          <div className="lg:col-start-1 lg:col-span-2 lg:row-start-3 mt-3 flex items-center justify-between gap-2">
            <Link href="/vehicles">
              <button className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/40 hover:text-primary transition-colors py-2 group">
                Se alle kjøretøy og historikk
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <Link href={`/vehicles/${primaryVehicle.id}/service/new`}>
              <button className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/30 hover:text-primary transition-colors py-2">
                Legg til post <Plus className="w-3 h-3" />
              </button>
            </Link>
          </div>
        )}

        {/* ── Row 3 right: Fremdrift checklist (only while onboarding incomplete) ── */}
        {(!hasVehicle || !hasService || !hasClub) && (
          <div className="lg:col-start-3 lg:row-start-3 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest">
                Fremdrift
              </h2>
            </div>
            <QuickStartChecklist
              hasVehicle={hasVehicle}
              hasService={hasService}
              hasClub={hasClub}
              primaryVehicleId={primaryVehicle?.id}
            />
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-center gap-2 pt-2 pb-1 opacity-20 hover:opacity-40 transition-opacity">
        <span className="text-[10px] text-muted-foreground">{t("dashboard.madeBy")}</span>
        <img src="/evolvit-logo.webp" alt="Evolvit Solution Norge" className="h-3 object-contain" style={{ filter: "grayscale(1) brightness(1.5)" }} />
        <span className="text-[10px] text-muted-foreground">{t("dashboard.solutionNorge")}</span>
      </div>
    </div>
  );
}
