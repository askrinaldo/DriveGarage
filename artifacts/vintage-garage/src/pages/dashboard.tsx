import { Link } from "wouter";
import { memo, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Wrench, Banknote, Route, ArrowRight, Users,
  Shield, Flame, ChevronRight, MapPin, Zap, TrendingUp,
  Clock, Plus, Activity, CreditCard, Smartphone, CheckCircle,
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

const categoryColors: Record<string, string> = {
  "oil-change": "from-amber-500 to-orange-400",
  brakes: "from-red-500 to-rose-400",
  tires: "from-slate-500 to-slate-400",
  engine: "from-blue-500 to-cyan-400",
  electrical: "from-yellow-400 to-amber-300",
  bodywork: "from-purple-500 to-violet-400",
  other: "from-emerald-500 to-teal-400",
};

function useCountUp(target: number, duration = 1200, trigger: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger || target === 0) { setValue(target); return; }
    const start = Date.now();
    const raf = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [target, trigger, duration]);
  return value;
}

const StatCard = memo(function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
  delay = 0,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
  delay?: number;
  href?: string;
}) {
  const locale = getCurrentLocale();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const numValue = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;
  const counted = useCountUp(numValue, 1200, visible);
  const displayValue = typeof value === "string" && value.includes("kr")
    ? `kr ${counted.toLocaleString(locale)}`
    : typeof value === "string" && value.includes("km")
    ? `${counted.toLocaleString(locale)} km`
    : counted;

  const card = (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className={`relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 group transition-all duration-200 ${href ? "hover:border-border hover:shadow-md hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : "hover:border-border"}`}
      tabIndex={href ? 0 : undefined}
      role={href ? "link" : undefined}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradient} opacity-[0.04]`} />
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-foreground" />
        </div>
        {href ? <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors" /> : <TrendingUp className="w-4 h-4 text-muted-foreground/50" />}
      </div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{displayValue}</div>
      <div className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground/60 mt-0.5">{sub}</div>}
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{card}</Link>;
  }
  return card;
});

const VehicleCard = memo(function VehicleCard({ vehicle, delay = 0 }: { vehicle: { id: number; make: string; model: string; year: number; type: string; color?: string | null; mileage?: number | null; imageUrl?: string | null }; delay?: number }) {
  const locale = getCurrentLocale();
  const isMoto = vehicle.type === "motorcycle";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link href={`/vehicles/${vehicle.id}`}>
        <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card hover:border-border transition-all duration-300 cursor-pointer">
          <div className="h-28 relative overflow-hidden">
            {vehicle.imageUrl ? (
              <img src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${isMoto ? "from-indigo-900/60 to-purple-900/40" : "from-amber-900/40 to-orange-900/30"}`}>
                {isMoto ? <span className="text-4xl">🏍️</span> : <span className="text-4xl">🚗</span>}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>
          <div className="p-4 pt-2">
            <div className="text-sm font-bold text-foreground">{vehicle.make} {vehicle.model}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{vehicle.year} {vehicle.color ? `· ${vehicle.color}` : ""}</div>
            {vehicle.mileage && (
              <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground/70">
                <Route className="w-3 h-3" />
                {vehicle.mileage.toLocaleString(locale)} km
              </div>
            )}
          </div>
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <ChevronRight className="w-3.5 h-3.5 text-foreground" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

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

  const initialLoading = (statsLoading && !stats) || (activityLoading && !activity) || (vehiclesLoading && !vehicles);
  const isError = statsError || activityError;

  if (initialLoading) return <DashboardSkeleton />;
  if (isError) return <ErrorState onRetry={() => { refetchStats(); refetchActivity(); }} />;

  const firstName = name?.split(" ")[0] ?? t("dashboard.defaultName");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("dashboard.greetingMorning") : hour < 18 ? t("dashboard.greetingDay") : t("dashboard.greetingEvening");

  const maxCat = Math.max(...(stats?.servicesByCategory ?? []).map(c => c.count), 1);

  const recentVehicles = (vehicles ?? []).slice(0, 4);
  const myClubs = (clubs ?? []).slice(0, 3);

  const quickActions = [
    { label: t("dashboard.newService"), href: vehicles?.[0] ? `/vehicles/${vehicles[0].id}/service/new` : "/vehicles", icon: Wrench, color: "from-amber-600 to-orange-600" },
    { label: t("dashboard.logbook"),   href: vehicles?.[0] ? `/vehicles/${vehicles[0].id}` : "/vehicles",              icon: Route,  color: "from-emerald-600 to-teal-600" },
    { label: t("dashboard.clubs"),     href: "/clubs",                                                                  icon: Users,  color: "from-violet-600 to-purple-600" },
    { label: t("dashboard.profile"),   href: "/profile",                                                                icon: Shield, color: "from-indigo-600 to-cyan-600" },
  ];

  return (
    <div className="min-h-screen space-y-8 pb-12">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400/80 uppercase tracking-widest">Dashboard</span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isPersonalTenant ? t("dashboard.personalGarage") : tenantName ?? t("dashboard.yourGarage")} · {new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Link href="/vehicles/new">
          <Button className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-foreground border-0 shadow-lg shadow-indigo-900/30 rounded-xl px-5 h-10 font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            {t("dashboard.newVehicle")}
          </Button>
        </Link>
      </motion.div>

      {/* Trial/Billing banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.02, duration: 0.45 }}
        className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/30">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-300">DriveGarage – 50 kr/mnd</p>
            <p className="text-xs text-emerald-400/70 mt-0.5">Betaling er ikke aktivert ennå</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Smartphone className="w-3 h-3 text-emerald-400/60" />
              <span className="text-[11px] text-emerald-400/60">Vipps-betaling kommer snart</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/pricing">
            <button className="text-xs font-semibold text-emerald-300 border border-emerald-500/30 rounded-lg px-3 py-1.5 hover:bg-emerald-500/15 transition-colors">
              Se priser
            </button>
          </Link>
          <Link href="/billing">
            <button className="text-xs font-semibold text-white bg-emerald-600/70 hover:bg-emerald-500/80 rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              Administrer abonnement
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Car}     label={t("dashboard.vehicles")}       value={stats?.totalVehicles ?? 0}       sub={`${stats?.vehiclesWithFinnUrl ?? 0} ${t("dashboard.onFinnNo")}`} gradient="from-indigo-500 to-cyan-500"    delay={0.05}  href="/vehicles" />
        <StatCard icon={Wrench}  label={t("dashboard.serviceRecords")} value={stats?.totalServiceRecords ?? 0} sub={t("dashboard.allVehicles")}                                        gradient="from-amber-500 to-orange-400"  delay={0.1}   href="/vehicles" />
        <StatCard icon={Banknote} label={t("dashboard.totalSpent")}    value={`kr ${stats?.totalSpent ?? 0}`} sub={t("dashboard.lifetimeMaintenance")}                                gradient="from-emerald-500 to-teal-400"  delay={0.15}  href="/billing" />
        <StatCard icon={Route}   label={t("dashboard.totalDriven")}    value={`${stats?.totalTripKm ?? 0} km`} sub={t("dashboard.loggedTrips")}                                       gradient="from-violet-500 to-purple-400" delay={0.2}   href="/vehicles" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Vehicles */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-widest flex items-center gap-2">
              <Car className="w-4 h-4 text-indigo-400" /> {t("dashboard.myVehicles")}
            </h2>
            <Link href="/vehicles">
              <button className="text-xs text-muted-foreground/70 hover:text-indigo-400 transition-colors flex items-center gap-1">
                {t("dashboard.seeAll")} <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
          {recentVehicles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-dashed border-border bg-card p-10 flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-full bg-indigo-900/30 flex items-center justify-center">
                <Car className="w-7 h-7 text-indigo-400/50" />
              </div>
              <div>
                <p className="text-muted-foreground font-medium text-sm">{t("dashboard.noVehicles")}</p>
                <p className="text-muted-foreground/60 text-xs mt-0.5">{t("dashboard.addFirstVehicle")}</p>
              </div>
              <Link href="/vehicles/new">
                <Button size="sm" className="mt-1 bg-indigo-600 hover:bg-indigo-500 text-foreground border-0 rounded-lg text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> {t("dashboard.addVehicle")}
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {recentVehicles.map((v, i) => (
                <VehicleCard key={v.id} vehicle={v} delay={0.05 * i} />
              ))}
            </div>
          )}

          {/* Category Breakdown */}
          {stats?.servicesByCategory && stats.servicesByCategory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="rounded-2xl border border-border/50 bg-card p-5"
            >
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> {t("dashboard.servicesByCategory")}
              </h3>
              <div className="space-y-3">
                {stats.servicesByCategory.map((cat, i) => (
                  <motion.div
                    key={cat.category}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-20 shrink-0 text-xs text-muted-foreground font-medium truncate">
                      {t(`categories.${cat.category}`, cat.category)}
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(cat.count / maxCat) * 100}%` }}
                        transition={{ delay: 0.35 + i * 0.06, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                        className={`h-full rounded-full bg-gradient-to-r ${categoryColors[cat.category] ?? "from-indigo-500 to-cyan-500"}`}
                      />
                    </div>
                    <div className="w-6 text-right text-xs font-bold text-muted-foreground">{cat.count}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">

          {/* Activity Feed */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> {t("dashboard.recentActivity")}
              </h2>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              {!activity || activity.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground/70 text-sm">{t("dashboard.noRecentActivity")}</div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  <AnimatePresence>
                    {activity.slice(0, 6).map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
                        className="flex items-start gap-3 p-3.5 group hover:bg-muted/15 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-xl shrink-0 bg-gradient-to-br ${categoryColors[item.category] ?? "from-indigo-500 to-cyan-500"} flex items-center justify-center shadow-sm`}>
                          <Wrench className="w-3.5 h-3.5 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground leading-snug truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">{item.vehicleName}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-2.5 h-2.5 text-muted-foreground/50" />
                            <span className="text-[10px] text-muted-foreground/60">
                              {new Date(item.serviceDate).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </div>
                        {item.cost != null && (
                          <div className="text-[11px] font-mono text-muted-foreground/80 shrink-0">
                            kr {item.cost.toLocaleString(locale)}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Clubs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" /> {t("dashboard.myClubs")}
              </h2>
              <Link href="/clubs">
                <button className="text-xs text-muted-foreground/70 hover:text-violet-400 transition-colors flex items-center gap-1">
                  {t("dashboard.seeAll")} <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
            <div className="space-y-2">
              {myClubs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-center">
                  <p className="text-muted-foreground/70 text-xs">{t("dashboard.noClubs")}</p>
                  <Link href="/clubs">
                    <button className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors">{t("dashboard.findClub")}</button>
                  </Link>
                </div>
              ) : (
                myClubs.map((club, i) => (
                  <motion.div
                    key={club.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                  >
                    <Link href={`/clubs/${club.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:border-violet-500/30 hover:bg-violet-900/10 transition-all duration-200 cursor-pointer group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-sm font-bold text-foreground shrink-0 shadow-sm">
                          {club.logoUrl ? (
                            <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            club.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{club.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" /> {club.memberCount}
                            </span>
                            {club.location && (
                              <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" /> {club.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-violet-400 transition-colors" />
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="rounded-2xl border border-border/50 bg-card p-4"
          >
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-cyan-400" /> {t("dashboard.quickAccess")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/[0.06] bg-muted/15 hover:bg-muted/35 hover:border-border/70 transition-all duration-200 cursor-pointer group">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center shadow-sm`}>
                      <action.icon className="w-4 h-4 text-foreground" />
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground/80 transition-colors text-center leading-tight">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Made by Evolvit */}
      <div className="flex items-center justify-center gap-2 pt-4 pb-2 opacity-30 hover:opacity-60 transition-opacity">
        <span className="text-[10px] text-muted-foreground">{t("dashboard.madeBy")}</span>
        <img src="/evolvit-logo.webp" alt="Evolvit Solution Norge" className="h-3.5 object-contain" style={{ filter: "grayscale(1) brightness(1.5)" }} />
        <span className="text-[10px] text-muted-foreground">{t("dashboard.solutionNorge")}</span>
      </div>
    </div>
  );
}
