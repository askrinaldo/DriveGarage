import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Wrench, Banknote, Route, ArrowRight, Users,
  Shield, Flame, ChevronRight, MapPin, Zap, TrendingUp,
  Clock, Plus, Activity
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
import { LoadingState, ErrorState } from "@/components/ui-states";
import { useUserAuth } from "@/hooks/use-user-auth";
import { Button } from "@/components/ui/button";

const categoryTranslations: Record<string, string> = {
  "oil-change": "Oljeskift",
  brakes: "Bremser",
  tires: "Dekk",
  engine: "Motor",
  electrical: "Elektro",
  bodywork: "Karosseri",
  other: "Annet",
};

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

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  gradient,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
  delay?: number;
}) {
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
    ? `kr ${counted.toLocaleString("no-NO")}`
    : typeof value === "string" && value.includes("km")
    ? `${counted.toLocaleString("no-NO")} km`
    : counted;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1117] p-5 group hover:border-white/20 transition-colors"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${gradient} opacity-[0.04]`} />
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <TrendingUp className="w-4 h-4 text-white/20" />
      </div>
      <div className="text-2xl font-bold text-white tabular-nums">{displayValue}</div>
      <div className="text-xs text-white/40 mt-1 font-medium uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[11px] text-white/25 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

function VehicleCard({ vehicle, delay = 0 }: { vehicle: { id: number; make: string; model: string; year: number; type: string; color?: string | null; mileage?: number | null; imageUrl?: string | null }; delay?: number }) {
  const isMoto = vehicle.type === "motorcycle";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link href={`/vehicles/${vehicle.id}`}>
        <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0f1117] hover:border-white/20 transition-all duration-300 cursor-pointer">
          <div className="h-28 relative overflow-hidden">
            {vehicle.imageUrl ? (
              <img src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${isMoto ? "from-indigo-900/60 to-purple-900/40" : "from-amber-900/40 to-orange-900/30"}`}>
                {isMoto ? <span className="text-4xl">🏍️</span> : <span className="text-4xl">🚗</span>}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] to-transparent" />
          </div>
          <div className="p-4 pt-2">
            <div className="text-sm font-bold text-white">{vehicle.make} {vehicle.model}</div>
            <div className="text-xs text-white/40 mt-0.5">{vehicle.year} {vehicle.color ? `· ${vehicle.color}` : ""}</div>
            {vehicle.mileage && (
              <div className="flex items-center gap-1 mt-2 text-[11px] text-white/30">
                <Route className="w-3 h-3" />
                {vehicle.mileage.toLocaleString("no-NO")} km
              </div>
            )}
          </div>
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Dashboard() {
  const { name, tenantName, isPersonalTenant } = useUserAuth();

  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() },
  });
  const { data: activity, isLoading: activityLoading, isError: activityError, refetch: refetchActivity } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() },
  });
  const { data: vehicles, isLoading: vehiclesLoading } = useListVehicles({
    query: { queryKey: getListVehiclesQueryKey() },
  });
  const { data: clubs } = useListClubs(
    {},
    { query: { queryKey: getListClubsQueryKey({}) } }
  );

  const isLoading = statsLoading || activityLoading || vehiclesLoading;
  const isError = statsError || activityError;

  if (isLoading) return <LoadingState message="Laster garasjen din..." />;
  if (isError) return <ErrorState onRetry={() => { refetchStats(); refetchActivity(); }} />;

  const firstName = name?.split(" ")[0] ?? "Sjåfør";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "God morgen" : hour < 18 ? "God dag" : "God kveld";

  const maxCat = Math.max(...(stats?.servicesByCategory ?? []).map(c => c.count), 1);

  const recentVehicles = (vehicles ?? []).slice(0, 4);
  const myClubs = (clubs ?? []).slice(0, 3);

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
          <h1 className="text-3xl font-black text-white tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {isPersonalTenant ? "Din personlige garasje" : tenantName ?? "Din garasje"} · {new Date().toLocaleDateString("no-NO", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Link href="/vehicles/new">
          <Button className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-indigo-900/30 rounded-xl px-5 h-10 font-semibold">
            <Plus className="w-4 h-4 mr-2" />
            Nytt kjøretøy
          </Button>
        </Link>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Car} label="Kjøretøy" value={stats?.totalVehicles ?? 0} sub={`${stats?.vehiclesWithFinnUrl ?? 0} på Finn.no`} gradient="from-indigo-500 to-cyan-500" delay={0.05} />
        <StatCard icon={Wrench} label="Serviceposter" value={stats?.totalServiceRecords ?? 0} sub="Alle kjøretøy" gradient="from-amber-500 to-orange-400" delay={0.1} />
        <StatCard icon={Banknote} label="Totalt brukt" value={`kr ${stats?.totalSpent ?? 0}`} sub="Livstidsvedlikehold" gradient="from-emerald-500 to-teal-400" delay={0.15} />
        <StatCard icon={Route} label="Totalt kjørt" value={`${stats?.totalTripKm ?? 0} km`} sub="Loggede turer" gradient="from-violet-500 to-purple-400" delay={0.2} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Vehicles */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
              <Car className="w-4 h-4 text-indigo-400" /> Mine kjøretøy
            </h2>
            <Link href="/vehicles">
              <button className="text-xs text-white/30 hover:text-indigo-400 transition-colors flex items-center gap-1">
                Se alle <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
          {recentVehicles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-dashed border-white/10 bg-[#0f1117] p-10 flex flex-col items-center text-center gap-3"
            >
              <div className="w-14 h-14 rounded-full bg-indigo-900/30 flex items-center justify-center">
                <Car className="w-7 h-7 text-indigo-400/50" />
              </div>
              <div>
                <p className="text-white/50 font-medium text-sm">Ingen kjøretøy ennå</p>
                <p className="text-white/25 text-xs mt-0.5">Legg til din første veteranbil eller motorsykkel</p>
              </div>
              <Link href="/vehicles/new">
                <Button size="sm" className="mt-1 bg-indigo-600 hover:bg-indigo-500 text-white border-0 rounded-lg text-xs">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Legg til kjøretøy
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
              className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-5"
            >
              <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Tjenester etter kategori
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
                    <div className="w-20 shrink-0 text-xs text-white/40 font-medium truncate">
                      {categoryTranslations[cat.category] ?? cat.category}
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(cat.count / maxCat) * 100}%` }}
                        transition={{ delay: 0.35 + i * 0.06, duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                        className={`h-full rounded-full bg-gradient-to-r ${categoryColors[cat.category] ?? "from-indigo-500 to-cyan-500"}`}
                      />
                    </div>
                    <div className="w-6 text-right text-xs font-bold text-white/40">{cat.count}</div>
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
              <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> Siste aktivitet
              </h2>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-[#0f1117] overflow-hidden">
              {!activity || activity.length === 0 ? (
                <div className="p-8 text-center text-white/30 text-sm">Ingen nylig aktivitet</div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  <AnimatePresence>
                    {activity.slice(0, 6).map((item, i) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.07, duration: 0.4 }}
                        className="flex items-start gap-3 p-3.5 group hover:bg-white/[0.03] transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-xl shrink-0 bg-gradient-to-br ${categoryColors[item.category] ?? "from-indigo-500 to-cyan-500"} flex items-center justify-center shadow-sm`}>
                          <Wrench className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white leading-snug truncate">{item.title}</p>
                          <p className="text-[11px] text-white/35 mt-0.5 truncate">{item.vehicleName}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-2.5 h-2.5 text-white/20" />
                            <span className="text-[10px] text-white/25">
                              {new Date(item.serviceDate).toLocaleDateString("no-NO", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                        </div>
                        {item.cost != null && (
                          <div className="text-[11px] font-mono text-white/35 shrink-0">
                            kr {item.cost.toLocaleString("no-NO")}
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
              <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-400" /> Mine klubber
              </h2>
              <Link href="/clubs">
                <button className="text-xs text-white/30 hover:text-violet-400 transition-colors flex items-center gap-1">
                  Se alle <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            </div>
            <div className="space-y-2">
              {myClubs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#0f1117] p-5 text-center">
                  <p className="text-white/30 text-xs">Ikke med i noen klubb ennå</p>
                  <Link href="/clubs">
                    <button className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors">Finn en klubb →</button>
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
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.07] bg-[#0f1117] hover:border-violet-500/30 hover:bg-violet-900/10 transition-all duration-200 cursor-pointer group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm">
                          {club.logoUrl ? (
                            <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            club.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{club.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-white/30 flex items-center gap-1">
                              <Users className="w-2.5 h-2.5" /> {club.memberCount}
                            </span>
                            {club.location && (
                              <span className="text-[10px] text-white/25 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" /> {club.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-violet-400 transition-colors" />
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
            className="rounded-2xl border border-white/[0.07] bg-[#0f1117] p-4"
          >
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-cyan-400" /> Hurtigtilgang
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Ny service", href: vehicles?.[0] ? `/vehicles/${vehicles[0].id}/service/new` : "/vehicles", icon: Wrench, color: "from-amber-600 to-orange-600" },
                { label: "Kjørebok", href: vehicles?.[0] ? `/vehicles/${vehicles[0].id}` : "/vehicles", icon: Route, color: "from-emerald-600 to-teal-600" },
                { label: "Klubber", href: "/clubs", icon: Users, color: "from-violet-600 to-purple-600" },
                { label: "Profil", href: "/profile", icon: Shield, color: "from-indigo-600 to-cyan-600" },
              ].map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15 transition-all duration-200 cursor-pointer group">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center shadow-sm`}>
                      <action.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[11px] font-semibold text-white/50 group-hover:text-white/80 transition-colors text-center leading-tight">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Made by Evolvit */}
      <div className="flex items-center justify-center gap-2 pt-4 pb-2 opacity-30 hover:opacity-60 transition-opacity">
        <span className="text-[10px] text-white/40">Made by</span>
        <img src="/evolvit-logo.webp" alt="Evolvit Solution Norge" className="h-3.5 object-contain" style={{ filter: "grayscale(1) brightness(1.5)" }} />
        <span className="text-[10px] text-white/40">Solution Norge</span>
      </div>
    </div>
  );
}
