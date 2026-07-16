import { Link } from "wouter";
import { memo, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Wrench, Banknote, Route, ArrowRight, Users,
  Shield, ChevronRight, MapPin, Zap,
  Clock, Plus, Activity, CreditCard, Bike,
  Gauge, CalendarDays, AlertCircle,
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
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { getCurrentLocale } from "@/i18n";
import { useSubscription, canAccessApp } from "@/hooks/use-subscription";

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
const CATEGORY_BAR: Record<string, string> = {
  "oil-change": "bg-amber-500",
  brakes:       "bg-red-500",
  tires:        "bg-slate-400",
  engine:       "bg-blue-400",
  electrical:   "bg-yellow-400",
  bodywork:     "bg-purple-400",
  other:        "bg-emerald-400",
};

/* ── Stat card ─────────────────────────────────────────────────── */
const StatCard = memo(function StatCard({
  icon: Icon, label, value, sub, accent = "text-primary", href,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; accent?: string; href?: string;
}) {
  const card = (
    <div className={`group relative rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 ${href ? "hover:border-border hover:shadow-md cursor-pointer" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <Icon className={`w-4 h-4 ${accent} opacity-70`} />
        {href && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />}
      </div>
      <div className="text-xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/50 mt-0.5">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
});

/* ── Vehicle hero ──────────────────────────────────────────────── */
function VehicleHero({ vehicle }: {
  vehicle: { id: number; make: string; model: string; year: number | null; type: string; color?: string | null; mileage?: number | null; imageUrl?: string | null };
}) {
  const locale = getCurrentLocale();
  const isMoto = vehicle.type === "motorcycle";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card group">
      {/* Image / no-image surface */}
      <div className="relative h-64 md:h-72 overflow-hidden">
        {vehicle.imageUrl ? (
          <img
            src={vehicle.imageUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${isMoto ? "bg-gradient-to-br from-sidebar to-muted/80" : "bg-gradient-to-br from-sidebar to-muted/80"}`}>
            <div className="opacity-[0.06]">
              {isMoto
                ? <Bike className="w-48 h-48 text-foreground" />
                : <Car className="w-48 h-48 text-foreground" />}
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

        {/* Status badge top-left */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Aktivt kjøretøy</span>
          </div>
        </div>

        {/* Vehicle info overlay — bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between">
          <div>
            {vehicle.year && (
              <p className="text-[11px] font-medium text-white/50 mb-1 uppercase tracking-widest">
                {vehicle.year} · {isMoto ? "Motorsykkel" : "Bil"}
              </p>
            )}
            <h2 className="text-3xl font-black text-white tracking-tight leading-none">
              {vehicle.make} {vehicle.model}
            </h2>
          </div>
          {vehicle.mileage && (
            <div className="text-right">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Kilometerstand</p>
              <p className="text-lg font-bold text-white tabular-nums">{vehicle.mileage.toLocaleString(locale)} km</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border/40 bg-card">
        <Link href={`/vehicles/${vehicle.id}/service/new`} className="flex-1">
          <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-semibold">
            <Wrench className="w-3.5 h-3.5" />
            Ny service
          </button>
        </Link>
        <Link href={`/vehicles/${vehicle.id}`} className="flex-1">
          <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-xs font-semibold text-foreground/80">
            <Route className="w-3.5 h-3.5" />
            Kjørebok
          </button>
        </Link>
        <Link href={`/vehicles/${vehicle.id}`}>
          <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-xs font-semibold text-muted-foreground">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}

/* ── Vehicle selector ─────────────────────────────────────────── */
function VehicleSelector({
  vehicles, selectedIdx, onSelect,
}: {
  vehicles: { id: number; make: string; model: string; year: number | null; type: string; imageUrl?: string | null }[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
}) {
  if (vehicles.length <= 1) return null;
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {vehicles.map((v, i) => (
        <button
          key={v.id}
          onClick={() => onSelect(i)}
          className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
            i === selectedIdx
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
          }`}
        >
          {v.imageUrl ? (
            <img src={v.imageUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
          ) : (
            v.type === "motorcycle" ? <Bike className="w-3.5 h-3.5" /> : <Car className="w-3.5 h-3.5" />
          )}
          <span>{v.year} {v.make} {v.model}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Empty vehicle state ──────────────────────────────────────── */
function NoVehicles() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card flex flex-col items-center justify-center text-center gap-4 py-14 px-6">
      <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center">
        <Car className="w-7 h-7 text-muted-foreground/50" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground/70">Ingen kjøretøy ennå</p>
        <p className="text-xs text-muted-foreground mt-0.5">Legg til ditt første kjøretøy for å komme i gang</p>
      </div>
      <Link href="/vehicles/new">
        <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 rounded-lg text-xs">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Legg til kjøretøy
        </Button>
      </Link>
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
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("dashboard.greetingMorning") : hour < 18 ? t("dashboard.greetingDay") : t("dashboard.greetingEvening");

  const maxCat = Math.max(...(stats?.servicesByCategory ?? []).map(c => c.count), 1);
  const vehicleList = vehicles ?? [];
  const safeIdx = Math.min(selectedVehicleIdx, Math.max(0, vehicleList.length - 1));
  const primaryVehicle = vehicleList[safeIdx] ?? null;
  const myClubs = (clubs ?? []).slice(0, 3);

  const quickActions = [
    { label: t("dashboard.newService"), href: primaryVehicle ? `/vehicles/${primaryVehicle.id}/service/new` : "/vehicles", icon: Wrench },
    { label: t("dashboard.logbook"),    href: primaryVehicle ? `/vehicles/${primaryVehicle.id}` : "/vehicles",              icon: Route  },
    { label: t("dashboard.clubs"),      href: "/clubs",                                                                      icon: Users  },
    { label: t("dashboard.profile"),    href: "/profile",                                                                    icon: Shield },
  ];

  /* Billing notice — only show if payment not set up or past due */
  const showBillingNotice = subscription && !canAccessApp(subscription.status, subscription.enforcementEnabled) &&
    subscription.status !== "exempt_internal";
  const billingIsPendingSetup = subscription?.status === "pending_payment_setup";

  return (
    <div className="min-h-screen space-y-6 pb-12">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1"
      >
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-1">
            {isPersonalTenant ? t("dashboard.personalGarage") : tenantName ?? t("dashboard.yourGarage")}
            {" · "}
            {new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            {greeting}, {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/vehicles">
            <Button variant="outline" size="sm" className="rounded-lg text-xs font-semibold h-9 px-4 hidden sm:flex">
              <Gauge className="w-3.5 h-3.5 mr-1.5" />
              {t("nav.myGarage")}
            </Button>
          </Link>
          <Link href="/vehicles/new">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 rounded-lg text-xs font-semibold h-9 px-4">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {t("dashboard.newVehicle")}
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* ── Billing notice (compact) ── */}
      {(showBillingNotice || billingIsPendingSetup) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5"
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-400/90 flex-1">
            {billingIsPendingSetup
              ? "Abonnement ikke satt opp ennå — Vipps-betaling kommer snart."
              : "Abonnementet krever oppmerksomhet."}
          </p>
          <Link href="/billing">
            <button className="text-[11px] font-semibold text-amber-300 border border-amber-500/30 rounded-lg px-2.5 py-1 hover:bg-amber-500/10 transition-colors shrink-0 flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              Administrer
            </button>
          </Link>
          <Link href="/pricing">
            <button className="text-[11px] text-amber-400/60 hover:text-amber-300 transition-colors shrink-0">Se priser</button>
          </Link>
        </motion.div>
      )}

      {/* When billing enforcement is off, show a quiet status-ok note only if no warning */}
      {!showBillingNotice && !billingIsPendingSetup && subscription && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/30 bg-card/50"
        >
          <div className="flex items-center gap-1.5 flex-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-muted-foreground/60">
              DriveGarage · {subscription.enforcementEnabled === false ? "Betaling ikke aktivert ennå" : "Aktivt abonnement"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/pricing">
              <button className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">Se priser</button>
            </Link>
            <span className="text-muted-foreground/20">·</span>
            <Link href="/billing">
              <button className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                Abonnement
              </button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* ── Stats bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.45 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <StatCard icon={Car}      label={t("dashboard.vehicles")}       value={stats?.totalVehicles ?? 0}       sub={`${stats?.vehiclesWithFinnUrl ?? 0} ${t("dashboard.onFinnNo")}`} accent="text-primary"           href="/vehicles" />
        <StatCard icon={Wrench}   label={t("dashboard.serviceRecords")} value={stats?.totalServiceRecords ?? 0} sub={t("dashboard.allVehicles")}                                        accent="text-amber-500"         href="/vehicles" />
        <StatCard icon={Banknote} label={t("dashboard.totalSpent")}     value={`kr ${(stats?.totalSpent ?? 0).toLocaleString(locale)}`} sub={t("dashboard.lifetimeMaintenance")}      accent="text-emerald-500"       href="/billing"  />
        <StatCard icon={Route}    label={t("dashboard.totalDriven")}    value={`${(stats?.totalTripKm ?? 0).toLocaleString(locale)} km`} sub={t("dashboard.loggedTrips")}             accent="text-blue-400"          href="/vehicles" />
      </motion.div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left column — vehicle hero + categories */}
        <div className="lg:col-span-2 space-y-4">

          {/* Vehicle hero / empty state */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          >
            {vehicleList.length === 0 ? (
              <NoVehicles />
            ) : (
              <>
                <VehicleHero vehicle={primaryVehicle!} />
                <VehicleSelector
                  vehicles={vehicleList}
                  selectedIdx={safeIdx}
                  onSelect={setSelectedVehicleIdx}
                />
              </>
            )}
          </motion.div>

          {/* Category breakdown */}
          {stats?.servicesByCategory && stats.servicesByCategory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.5 }}
              className="rounded-xl border border-border/50 bg-card p-5"
            >
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary" /> {t("dashboard.servicesByCategory")}
              </h3>
              <div className="space-y-2.5">
                {stats.servicesByCategory.map((cat, i) => (
                  <motion.div
                    key={cat.category}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.22 + i * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_DOT[cat.category] ?? "bg-primary"}`} />
                    <div className="w-20 shrink-0 text-xs text-muted-foreground truncate">
                      {t(`categories.${cat.category}`, cat.category)}
                    </div>
                    <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(cat.count / maxCat) * 100}%` }}
                        transition={{ delay: 0.25 + i * 0.05, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                        className={`h-full rounded-full ${CATEGORY_BAR[cat.category] ?? "bg-primary"}`}
                      />
                    </div>
                    <div className="w-5 text-right text-xs font-bold text-muted-foreground">{cat.count}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right column — activity + clubs + quick actions */}
        <div className="space-y-4">

          {/* Recent activity */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, duration: 0.45 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> {t("dashboard.recentActivity")}
              </h2>
            </div>
            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              {!activity || activity.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground/60 text-xs">{t("dashboard.noRecentActivity")}</div>
              ) : (
                <div className="divide-y divide-border/30">
                  <AnimatePresence>
                    {activity.slice(0, 6).map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-muted/10 transition-colors"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${CATEGORY_DOT[item.category] ?? "bg-primary"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground leading-snug truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground/70 truncate">{item.vehicleName}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-muted-foreground/40" />
                            <span className="text-[10px] text-muted-foreground/50">
                              {new Date(item.serviceDate).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </div>
                        {item.cost != null && (
                          <div className="text-[11px] font-mono text-muted-foreground/70 shrink-0">
                            kr {item.cost.toLocaleString(locale)}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>

          {/* My clubs */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.18, duration: 0.45 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-violet-400" /> {t("dashboard.myClubs")}
              </h2>
              <Link href="/clubs">
                <button className="text-[11px] text-muted-foreground/50 hover:text-foreground transition-colors flex items-center gap-0.5">
                  {t("dashboard.seeAll")} <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
            <div className="space-y-1.5">
              {myClubs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-card p-5 text-center">
                  <p className="text-muted-foreground/60 text-xs">{t("dashboard.noClubs")}</p>
                  <Link href="/clubs">
                    <button className="mt-2 text-xs text-primary hover:text-primary/80 transition-colors">{t("dashboard.findClub")}</button>
                  </Link>
                </div>
              ) : (
                myClubs.map((club, i) => (
                  <motion.div
                    key={club.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.22 + i * 0.07, duration: 0.35 }}
                  >
                    <Link href={`/clubs/${club.id}`}>
                      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 bg-card hover:border-border/80 hover:bg-muted/10 transition-all duration-200 cursor-pointer group">
                        <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center text-sm font-bold text-foreground/70 shrink-0 overflow-hidden">
                          {club.logoUrl ? (
                            <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                          ) : (
                            club.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{club.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" /> {club.memberCount}
                            </span>
                            {club.location && (
                              <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" /> {club.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors" />
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.24, duration: 0.4 }}
            className="rounded-xl border border-border/50 bg-card p-4"
          >
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-primary/70" /> {t("dashboard.quickAccess")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border/40 bg-muted/15 hover:bg-muted/35 hover:border-border/70 transition-all duration-200 cursor-pointer group text-center">
                    <action.icon className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground/80 transition-colors" />
                    <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground/80 transition-colors leading-tight">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-2 pt-4 pb-2 opacity-25 hover:opacity-50 transition-opacity">
        <span className="text-[10px] text-muted-foreground">{t("dashboard.madeBy")}</span>
        <img src="/evolvit-logo.webp" alt="Evolvit Solution Norge" className="h-3 object-contain" style={{ filter: "grayscale(1) brightness(1.5)" }} />
        <span className="text-[10px] text-muted-foreground">{t("dashboard.solutionNorge")}</span>
      </div>
    </div>
  );
}
