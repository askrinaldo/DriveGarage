import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListVehicles,
  getListVehiclesQueryKey,
} from "@workspace/api-client-react";
import { ErrorState, VehicleListSkeleton } from "@/components/ui-states";
import {
  Plus, Car, Bike, Wrench, FileText, Users,
  ChevronRight, ArrowRight, Search, LayoutGrid, List,
} from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { getCurrentLocale } from "@/i18n";

/* ── Vehicle type ──────────────────────────────────────────────── */
type VehicleSummary = {
  id: number; make: string; model: string; year: number | null;
  type: string; color?: string | null; mileage?: number | null;
  imageUrl?: string | null; registrationNumber?: string | null;
  notes?: string | null; finnUrl?: string | null;
};

/* ══════════════════════════════════════════════════════════════════
   VEHICLE CARD — grid view
══════════════════════════════════════════════════════════════════ */
function VehicleCard({ vehicle, locale, index }: {
  vehicle: VehicleSummary;
  locale: string;
  index: number;
}) {
  const isMoto = vehicle.type === "motorcycle";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link href={`/vehicles/${vehicle.id}`}>
        <div className="group relative rounded-2xl border border-border/40 bg-card overflow-hidden cursor-pointer hover:border-border/80 hover:shadow-2xl hover:shadow-black/40 transition-all duration-300">
          {/* Image area */}
          <div className="relative h-52 overflow-hidden">
            {vehicle.imageUrl ? (
              <img
                src={vehicle.imageUrl}
                alt={`${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/25 via-background to-sidebar"
                style={vehicle.color ? {
                  background: `linear-gradient(135deg, color-mix(in srgb, ${vehicle.color} 10%, transparent) 0%, hsl(220 15% 10%) 100%)`,
                } : undefined}
              >
                <div className="opacity-[0.04] select-none pointer-events-none">
                  {isMoto
                    ? <Bike style={{ width: 160, height: 160 }} className="text-foreground" />
                    : <Car style={{ width: 160, height: 160 }} className="text-foreground" />}
                </div>
              </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/15 to-transparent" />

            {/* Top badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <span className="text-[9.5px] font-black uppercase tracking-widest bg-black/50 backdrop-blur-sm text-white/60 px-2.5 py-1 rounded-full">
                {isMoto ? "Motorsykkel" : "Bil"}
              </span>
              {vehicle.color && (
                <span
                  className="w-3.5 h-3.5 rounded-full border-2 border-white/30 shadow-md shrink-0"
                  style={{ backgroundColor: vehicle.color }}
                />
              )}
            </div>

            {/* Vehicle name at bottom */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-3.5">
              {vehicle.year && (
                <p className="text-[10px] font-semibold text-white/35 uppercase tracking-widest mb-0.5">
                  {vehicle.year}
                </p>
              )}
              <h3 className="text-[19px] font-black text-white uppercase tracking-tight leading-tight">
                {vehicle.make} {vehicle.model}
              </h3>
            </div>
          </div>

          {/* Bottom info strip */}
          <div className="flex items-center gap-4 px-4 py-3">
            {vehicle.registrationNumber ? (
              <div>
                <p className="text-[9px] text-muted-foreground/35 uppercase tracking-wider mb-0.5">Regnr</p>
                <p className="text-[12px] font-mono font-bold text-foreground/65">{vehicle.registrationNumber}</p>
              </div>
            ) : null}
            {vehicle.mileage ? (
              <div>
                <p className="text-[9px] text-muted-foreground/35 uppercase tracking-wider mb-0.5">Km-stand</p>
                <p className="text-[12px] font-bold text-foreground/65">{vehicle.mileage.toLocaleString(locale)} km</p>
              </div>
            ) : null}
            {!vehicle.registrationNumber && !vehicle.mileage && (
              <p className="text-[11px] text-muted-foreground/35">Ingen data registrert</p>
            )}
            <div className="ml-auto">
              <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary/60 transition-colors" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   VEHICLE LIST ITEM — list view
══════════════════════════════════════════════════════════════════ */
function VehicleListItem({ vehicle, locale, index }: {
  vehicle: VehicleSummary;
  locale: string;
  index: number;
}) {
  const isMoto = vehicle.type === "motorcycle";

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Link href={`/vehicles/${vehicle.id}`}>
        <div className="flex items-center gap-4 rounded-xl border border-border/40 bg-card px-4 py-3 group hover:border-border/70 cursor-pointer transition-all duration-200 hover:bg-muted/5">
          {/* Thumbnail */}
          <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-border/30">
            {vehicle.imageUrl ? (
              <img
                src={vehicle.imageUrl}
                alt=""
                className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-300"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center bg-muted/30"
                style={vehicle.color ? {
                  background: `color-mix(in srgb, ${vehicle.color} 10%, hsl(220 15% 12%))`,
                } : undefined}
              >
                {isMoto
                  ? <Bike className="w-5 h-5 text-muted-foreground/25" />
                  : <Car className="w-5 h-5 text-muted-foreground/25" />}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-[13.5px] font-black text-foreground uppercase tracking-tight truncate">
                {vehicle.make} {vehicle.model}
              </h3>
              {vehicle.year && (
                <span className="text-[10px] text-muted-foreground/40 shrink-0">{vehicle.year}</span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {vehicle.registrationNumber && (
                <span className="text-[11px] font-mono text-muted-foreground/45">{vehicle.registrationNumber}</span>
              )}
              {vehicle.mileage && (
                <span className="text-[11px] text-muted-foreground/40">{vehicle.mileage.toLocaleString(locale)} km</span>
              )}
              <span className="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-wide">
                {isMoto ? "Motorsykkel" : "Bil"}
              </span>
            </div>
          </div>

          {/* Color dot */}
          {vehicle.color && (
            <div
              className="w-3 h-3 rounded-full border border-border/40 shrink-0"
              style={{ backgroundColor: vehicle.color }}
            />
          )}

          <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary/60 transition-colors shrink-0" />
        </div>
      </Link>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   GARAGE GRID — main view when vehicles exist
══════════════════════════════════════════════════════════════════ */
type FilterType = "all" | "car" | "motorcycle";
type SortType = "default" | "make" | "year";
type ViewMode = "grid" | "list";

function GarageGrid({ vehicles }: { vehicles: VehicleSummary[] }) {
  const locale = getCurrentLocale();
  const [viewMode, setViewMode]   = useState<ViewMode>("grid");
  const [search,   setSearch]     = useState("");
  const [filter,   setFilter]     = useState<FilterType>("all");
  const [sort,     setSort]       = useState<SortType>("default");

  const carCount  = vehicles.filter(v => v.type !== "motorcycle").length;
  const motoCount = vehicles.filter(v => v.type === "motorcycle").length;

  const filtered = vehicles
    .filter(v => {
      if (filter === "car"        && v.type === "motorcycle") return false;
      if (filter === "motorcycle" && v.type !== "motorcycle") return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.registrationNumber?.toLowerCase().includes(q) ?? false) ||
        (v.year?.toString().includes(q) ?? false)
      );
    })
    .sort((a, b) => {
      if (sort === "make") return a.make.localeCompare(b.make);
      if (sort === "year") return (b.year ?? 0) - (a.year ?? 0);
      return 0;
    });

  return (
    <div className="space-y-5 pb-12">

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Garasjen min</h1>
          <p className="text-muted-foreground/55 mt-1 text-[13px]">
            {vehicles.length === 1 ? "1 kjøretøy" : `${vehicles.length} kjøretøy`}
          </p>
        </div>
        <Link href="/vehicles/new">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-[11px] font-black uppercase tracking-wider shrink-0 shadow-lg shadow-primary/15"
          >
            <Plus className="w-3.5 h-3.5" />
            Legg til kjøretøy
          </motion.button>
        </Link>
      </motion.div>

      {/* ── Search + filter + sort + view toggle ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.35 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/35 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Søk etter merke, modell, regnr…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border/50 bg-card text-[13px] text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 shrink-0">
          {([
            { val: "all"        as FilterType, label: "Alle",         count: vehicles.length },
            { val: "car"        as FilterType, label: "Biler",        count: carCount },
            { val: "motorcycle" as FilterType, label: "Motorsykler",  count: motoCount },
          ]).map(({ val, label, count }) => count > 0 || val === "all" ? (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[11px] font-bold uppercase tracking-wide transition-all duration-200 ${
                filter === val
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border/40 text-muted-foreground/60 hover:border-border/70 hover:text-foreground"
              }`}
            >
              {label}
              <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-black ${
                filter === val ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground/40"
              }`}>
                {count}
              </span>
            </button>
          ) : null)}
        </div>

        {/* Sort + view toggle */}
        <div className="flex gap-1.5 shrink-0">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortType)}
            className="px-3 py-2 rounded-xl border border-border/40 bg-card text-[11px] font-bold uppercase tracking-wide text-muted-foreground/60 focus:outline-none focus:border-primary/40 transition-colors cursor-pointer"
          >
            <option value="default">Nyest</option>
            <option value="make">Merke A–Z</option>
            <option value="year">Årsmodell</option>
          </select>

          <div className="flex rounded-xl border border-border/40 overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center justify-center px-3 py-2 transition-colors ${
                viewMode === "grid"
                  ? "bg-primary/10 text-primary"
                  : "bg-card text-muted-foreground/40 hover:text-muted-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <div className="w-px bg-border/40" />
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center justify-center px-3 py-2 transition-colors ${
                viewMode === "list"
                  ? "bg-primary/10 text-primary"
                  : "bg-card text-muted-foreground/40 hover:text-muted-foreground"
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── No search results ── */}
      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <Search className="w-8 h-8 text-muted-foreground/20 mb-3" />
          <p className="text-[13px] font-bold text-foreground/50 uppercase tracking-wide mb-1">
            Ingen kjøretøy funnet
          </p>
          <p className="text-[12px] text-muted-foreground/40">
            Prøv et annet søk eller endre filteret
          </p>
        </motion.div>
      )}

      {/* ── Grid view ── */}
      <AnimatePresence mode="wait">
        {filtered.length > 0 && viewMode === "grid" && (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filtered.map((v, i) => (
              <VehicleCard key={v.id} vehicle={v} locale={locale} index={i} />
            ))}
            {/* Add vehicle card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: filtered.length * 0.05 + 0.05, duration: 0.3 }}
            >
              <Link href="/vehicles/new">
                <div className="h-full min-h-[220px] rounded-2xl border border-dashed border-border/30 hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-300 flex flex-col items-center justify-center gap-3 cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl bg-muted/40 group-hover:bg-primary/10 border border-border/40 group-hover:border-primary/25 flex items-center justify-center transition-all duration-300">
                    <Plus className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/30 group-hover:text-primary/50 transition-colors">
                    Legg til kjøretøy
                  </p>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        )}

        {/* ── List view ── */}
        {filtered.length > 0 && viewMode === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {filtered.map((v, i) => (
              <VehicleListItem key={v.id} vehicle={v} locale={locale} index={i} />
            ))}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: filtered.length * 0.04 + 0.05 }}
            >
              <Link href="/vehicles/new">
                <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/30 hover:border-primary/30 px-4 py-3.5 cursor-pointer group transition-all duration-200 hover:bg-primary/[0.02]">
                  <Plus className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/30 group-hover:text-primary/50 transition-colors">
                    Legg til kjøretøy
                  </span>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   GARAGE ONBOARDING — zero vehicles
══════════════════════════════════════════════════════════════════ */
function GarageOnboarding({ firstName }: { firstName: string }) {
  const features = [
    {
      icon: Wrench,
      title: "Digitalt servicehefte",
      desc: "Full vedlikeholdshistorikk med dato, kostnad og kategori — for biler og motorsykler.",
    },
    {
      icon: FileText,
      title: "Dokumenter & kvitteringer",
      desc: "Last opp fakturaer, forsikringspapirer og sertifikater samlet på ett sted.",
    },
    {
      icon: Users,
      title: "Klubber & fellesskap",
      desc: "Koble deg til norske bil- og motorsykkelklubber og møt likesinnede entusiaster.",
    },
  ];

  return (
    <div className="pb-12">
      {/* ── Centered hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col items-center justify-center text-center pt-10 pb-14 px-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-7 shadow-xl shadow-primary/5"
        >
          <Wrench className="w-10 h-10 text-primary" />
        </motion.div>

        <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-3">
          Garasjen min
        </p>

        <h1 className="text-4xl md:text-5xl font-black text-foreground uppercase tracking-tight leading-[1.05] mb-4">
          Din digitale garasje
        </h1>

        <p className="text-[15px] text-muted-foreground/60 max-w-md leading-relaxed mb-8">
          Hei {firstName}! Legg til ditt første kjøretøy og begynn å bygge
          en komplett digital historikk.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Link href="/vehicles/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-[13px] font-black uppercase tracking-wider shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              Legg til kjøretøy
            </motion.button>
          </Link>
          <Link href="/clubs">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl border border-border/60 hover:border-border bg-transparent hover:bg-muted/20 transition-colors text-[13px] font-bold uppercase tracking-wide text-foreground/60"
            >
              <Users className="w-4 h-4" />
              Utforsk klubber
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* ── Feature cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {features.map(({ icon: Icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.07, duration: 0.4 }}
            className="rounded-2xl border border-border/40 bg-card p-6 flex flex-col gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-black text-foreground/90 uppercase tracking-wide mb-1.5">{title}</p>
              <p className="text-[13px] text-muted-foreground/55 leading-relaxed">{desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Bottom CTA strip ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="mt-6 rounded-2xl border border-primary/15 bg-primary/5 px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div>
          <p className="text-[13px] font-black text-foreground/80 uppercase tracking-tight">
            Klar til å starte?
          </p>
          <p className="text-[12px] text-muted-foreground/55 mt-0.5">
            Det tar under 2 minutter å registrere ditt første kjøretøy.
          </p>
        </div>
        <Link href="/vehicles/new">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 text-[12px] font-bold uppercase tracking-wide shrink-0 hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="w-4 h-4" />
            Legg til kjøretøy
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════════ */
export default function VehicleList() {
  const { name } = useUserAuth();
  const { data: vehicles, isLoading, isError, refetch } = useListVehicles({
    query: { queryKey: getListVehiclesQueryKey(), staleTime: 60_000 },
  });

  if (isLoading) return <VehicleListSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const firstName = name?.split(" ")[0] ?? "Sjåfør";

  if (!vehicles || vehicles.length === 0) {
    return <GarageOnboarding firstName={firstName} />;
  }

  return <GarageGrid vehicles={vehicles} />;
}
