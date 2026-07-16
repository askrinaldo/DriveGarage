import { Link } from "wouter";
import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Wrench, Banknote, Route, ArrowRight, Users,
  ChevronRight, MapPin, Plus, Bike, Gauge, Clock,
  CheckCircle2, Circle, FileText, Search,
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
import { useUserAuth } from "@/hooks/use-user-auth";
import { useTranslation } from "react-i18next";
import { getCurrentLocale } from "@/i18n";
import { useSubscription } from "@/hooks/use-subscription";

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

/* ── Vehicle hero ──────────────────────────────────────────────── */
function VehicleHero({
  vehicle, systemOk,
}: {
  vehicle: { id: number; make: string; model: string; year: number | null; type: string; color?: string | null; mileage?: number | null; imageUrl?: string | null };
  systemOk: boolean;
}) {
  const locale = getCurrentLocale();
  const isMoto = vehicle.type === "motorcycle";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card group">
      <div className="relative h-72 md:h-80 lg:h-[400px] overflow-hidden">
        {vehicle.imageUrl ? (
          <img
            src={vehicle.imageUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted/30 via-background to-sidebar flex items-center justify-center">
            <div className="opacity-[0.04] select-none pointer-events-none">
              {isMoto
                ? <Bike style={{ width: 320, height: 320 }} className="text-foreground" />
                : <Car style={{ width: 320, height: 320 }} className="text-foreground" />}
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-primary/90 rounded-full px-3 py-1">
            <span className="text-[10px] font-black text-primary-foreground uppercase tracking-widest">Aktivt kjøretøy</span>
          </div>
          <div className="flex items-center gap-2">
            {vehicle.imageUrl && (
              <Link href={`/vehicles/${vehicle.id}/edit`}>
                <div className="text-[10px] font-semibold text-white/50 hover:text-white/80 transition-colors uppercase tracking-wider">
                  Bytt bilde
                </div>
              </Link>
            )}
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
              <div className={`w-1.5 h-1.5 rounded-full ${systemOk ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                {systemOk ? "System ok" : "Advarsel"}
              </span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 flex items-end justify-between">
          <div>
            {vehicle.year && (
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-1.5">
                {vehicle.year} · {isMoto ? "Motorsykkel" : "Bil"}
              </p>
            )}
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight leading-none">
              {vehicle.make} {vehicle.model}
            </h2>
          </div>
          {vehicle.mileage && (
            <div className="text-right shrink-0 ml-4">
              <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest mb-1">Kilometerstand</p>
              <p className="text-2xl font-black text-white tabular-nums">
                {vehicle.mileage.toLocaleString(locale)}
                <span className="text-base font-semibold text-white/50 ml-1">km</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 px-5 py-3.5 border-t border-border/30">
        <Link href={`/vehicles/${vehicle.id}/service/new`} className="flex-1">
          <button className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-[12px] font-bold uppercase tracking-wide">
            <Wrench className="w-3.5 h-3.5" />
            Ny service
          </button>
        </Link>
        <Link href={`/vehicles/${vehicle.id}`} className="flex-1">
          <button className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-border/60 hover:border-border hover:bg-muted/20 transition-colors text-[12px] font-bold uppercase tracking-wide text-foreground/70">
            <Route className="w-3.5 h-3.5" />
            Kjørebok
          </button>
        </Link>
        <Link href={`/vehicles/${vehicle.id}`}>
          <button className="flex items-center justify-center px-3 py-2.5 rounded-lg border border-border/60 hover:border-border hover:bg-muted/20 transition-colors text-foreground/40 hover:text-foreground/70">
            <ChevronRight className="w-4 h-4" />
          </button>
        </Link>
      </div>
    </div>
  );
}

/* ── Vehicle gallery selector ──────────────────────────────────── */
function VehicleGallery({
  vehicles, selectedIdx, onSelect,
}: {
  vehicles: { id: number; make: string; model: string; year: number | null; type: string; imageUrl?: string | null }[];
  selectedIdx: number;
  onSelect: (i: number) => void;
}) {
  if (vehicles.length <= 1) return null;
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {vehicles.map((v, i) => (
        <button
          key={v.id}
          onClick={() => onSelect(i)}
          className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full border text-[11px] font-bold uppercase tracking-wide transition-all duration-200 ${
            i === selectedIdx
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          {v.imageUrl ? (
            <img src={v.imageUrl} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
          ) : (
            v.type === "motorcycle"
              ? <Bike className="w-3.5 h-3.5 shrink-0" />
              : <Car className="w-3.5 h-3.5 shrink-0" />
          )}
          {v.year} {v.make} {v.model}
        </button>
      ))}
      <Link href="/vehicles/new">
        <button className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-dashed border-border/50 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/50 hover:border-border hover:text-muted-foreground transition-all duration-200">
          <Plus className="w-3.5 h-3.5" />
          Legg til
        </button>
      </Link>
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
      <div className="relative h-72 md:h-80 flex flex-col items-center justify-center text-center px-8 bg-gradient-to-br from-muted/20 via-background to-sidebar">
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
      {/* Feature highlights strip */}
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

/* ── Onboarding timeline (service history empty state) ─────────── */
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
              {/* Timeline line + dot */}
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
              {/* Content */}
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
                    <Link href={step.href}>
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
        {/* Progress bar */}
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
      <div className="text-right shrink-0">
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
  const { name, tenantName, isPersonalTenant } = useUserAuth();
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
    {},
    { query: { queryKey: getListClubsQueryKey({}) } }
  );
  const { data: subscription } = useSubscription();

  const [selectedVehicleIdx, setSelectedVehicleIdx] = useState(0);

  const initialLoading = (statsLoading && !stats) || (activityLoading && !activity) || (vehiclesLoading && !vehicles);
  const isError = statsError || activityError;

  if (initialLoading) return <DashboardSkeleton />;
  if (isError) return <ErrorState onRetry={() => { refetchStats(); refetchActivity(); }} />;

  const firstName = name?.split(" ")[0] ?? t("dashboard.defaultName");
  const garageTitle = isPersonalTenant
    ? `${firstName}s Garasje`
    : (tenantName ?? "Min Garasje");

  const vehicleList = vehicles ?? [];
  const safeIdx = Math.min(selectedVehicleIdx, Math.max(0, vehicleList.length - 1));
  const primaryVehicle = vehicleList[safeIdx] ?? null;
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

  /* Determine if we're in "new user" mode for layout decisions */
  const isNewUser = !hasVehicle;

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
          <h1 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tight leading-none">
            {garageTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Link href={primaryVehicle ? `/vehicles/${primaryVehicle.id}/service/new` : "/vehicles/new"}>
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border/50 hover:border-border bg-transparent hover:bg-muted/20 transition-colors text-[11px] font-bold uppercase tracking-wide text-foreground/70">
              <Wrench className="w-3.5 h-3.5" />
              Ny service
            </button>
          </Link>
          <Link href={primaryVehicle ? `/vehicles/${primaryVehicle.id}` : "/vehicles"}>
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border/50 hover:border-border bg-transparent hover:bg-muted/20 transition-colors text-[11px] font-bold uppercase tracking-wide text-foreground/70">
              <Gauge className="w-3.5 h-3.5" />
              Kjørebok
            </button>
          </Link>
          <Link href="/vehicles/new">
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-primary/50 hover:border-primary bg-transparent hover:bg-primary/5 transition-all duration-200 text-[11px] font-bold uppercase tracking-wide text-primary hover:scale-[1.02] active:scale-[0.98]">
              <Plus className="w-3.5 h-3.5" />
              Legg til bil
            </button>
          </Link>
        </div>
      </motion.div>

      {/* ── Vehicle hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        {primaryVehicle ? (
          <VehicleHero vehicle={primaryVehicle} systemOk={systemOk} />
        ) : (
          <EmptyGarage firstName={firstName} />
        )}
      </motion.div>

      {/* ── Vehicle gallery (multi-vehicle) ── */}
      {vehicleList.length > 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <VehicleGallery vehicles={vehicleList} selectedIdx={safeIdx} onSelect={setSelectedVehicleIdx} />
        </motion.div>
      )}

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

      {/* ── Main content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: service history / onboarding timeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest">
              {recentActivity.length > 0 ? "Servicehistorikk" : "Kom i gang"}
            </h2>
            {primaryVehicle && recentActivity.length > 0 && (
              <Link href={`/vehicles/${primaryVehicle.id}/service/new`}>
                <button className="text-[11px] font-bold uppercase tracking-wide text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
                  Legg til post <Plus className="w-3 h-3" />
                </button>
              </Link>
            )}
          </div>

          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {recentActivity.length === 0 ? (
              /* Onboarding timeline */
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
          </div>
        </motion.div>

        {/* Right: clubs + checklist */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="space-y-4"
        >
          {/* Quick start checklist — only when not all done */}
          {(!hasVehicle || !hasService || !hasClub) && (
            <QuickStartChecklist
              hasVehicle={hasVehicle}
              hasService={hasService}
              hasClub={hasClub}
              primaryVehicleId={primaryVehicle?.id}
            />
          )}

          {/* Clubs */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest">
                {myClubs.length > 0 ? "Mine Klubber" : "Klubber"}
              </h2>
              <Link href="/clubs">
                <button className="text-sidebar-foreground/30 hover:text-sidebar-foreground/60 transition-colors">
                  <span className="text-[18px] leading-none tracking-widest">···</span>
                </button>
              </Link>
            </div>

            {myClubs.length === 0 ? (
              /* Club discovery panel */
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
                            <p className="text-[12.5px] font-bold text-foreground truncate">{club.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
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
          </div>
        </motion.div>
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
