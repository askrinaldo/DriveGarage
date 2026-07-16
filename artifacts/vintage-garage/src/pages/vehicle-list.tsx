import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListVehicles,
  getListVehiclesQueryKey,
  useListServiceRecords,
  getListServiceRecordsQueryKey,
  useListReceipts,
  getListReceiptsQueryKey,
} from "@workspace/api-client-react";
import { keepPreviousData } from "@tanstack/react-query";
import { ErrorState, VehicleListSkeleton } from "@/components/ui-states";
import {
  Plus, Car, Gauge, Bike, Wrench, FileText, Users,
  CheckCircle2, ArrowRight, ChevronRight, Route,
  Calendar, Receipt, Image, Pencil, Clock, MoreHorizontal,
} from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { getCurrentLocale } from "@/i18n";

/* ── Category system ───────────────────────────────────────────── */
const CATEGORY_LABELS: Record<string, string> = {
  "oil-change": "Oljeskift",
  brakes:       "Bremser",
  tires:        "Dekk",
  engine:       "Motor",
  electrical:   "Elektrisk",
  bodywork:     "Karosseri",
  other:        "Annet",
};
const CATEGORY_COLORS: Record<string, string> = {
  "oil-change": "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  brakes:       "bg-red-500/15 text-red-400 border border-red-500/25",
  tires:        "bg-slate-500/15 text-slate-300 border border-slate-500/25",
  engine:       "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  electrical:   "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25",
  bodywork:     "bg-purple-500/15 text-purple-400 border border-purple-500/25",
  other:        "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
};
const CATEGORY_DOT: Record<string, string> = {
  "oil-change": "bg-amber-500",
  brakes:       "bg-red-500",
  tires:        "bg-slate-400",
  engine:       "bg-blue-500",
  electrical:   "bg-yellow-400",
  bodywork:     "bg-purple-500",
  other:        "bg-emerald-500",
};

/* ── Vehicle type ──────────────────────────────────────────────── */
type VehicleSummary = {
  id: number; make: string; model: string; year: number | null;
  type: string; color?: string | null; mileage?: number | null;
  imageUrl?: string | null; registrationNumber?: string | null;
  notes?: string | null; finnUrl?: string | null;
};

/* ══════════════════════════════════════════════════════════════════
   VEHICLE SELECTOR — horizontal scrollable pill cards
══════════════════════════════════════════════════════════════════ */
function VehicleSelector({
  vehicles, selectedIdx, onSelect,
}: {
  vehicles: VehicleSummary[];
  selectedIdx: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-0.5">
      {vehicles.map((v, i) => {
        const active = i === selectedIdx;
        return (
          <button
            key={v.id}
            onClick={() => onSelect(i)}
            className={`shrink-0 flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-xl border transition-all duration-300 group ${
              active
                ? "bg-primary/10 border-primary/40 shadow-[0_0_0_1px] shadow-primary/20"
                : "border-border/40 bg-card hover:border-border/70 hover:bg-muted/10"
            }`}
          >
            {/* Thumbnail */}
            <div className={`w-9 h-9 rounded-lg overflow-hidden shrink-0 border transition-all duration-300 ${
              active ? "border-primary/30" : "border-border/40"
            }`}>
              {v.imageUrl ? (
                <img src={v.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${active ? "bg-primary/10" : "bg-muted/40"}`}>
                  {v.type === "motorcycle"
                    ? <Bike className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground/40"}`} />
                    : <Car className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground/40"}`} />}
                </div>
              )}
            </div>
            <div className="text-left min-w-0">
              <p className={`text-[11px] font-black uppercase tracking-wide leading-none truncate max-w-[100px] transition-colors ${
                active ? "text-primary" : "text-foreground/70"
              }`}>
                {v.make} {v.model}
              </p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">{v.year ?? "—"}</p>
            </div>
            {active && (
              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 ml-1" />
            )}
          </button>
        );
      })}

      {/* Add vehicle chip */}
      <Link href="/vehicles/new">
        <button className="shrink-0 flex items-center gap-2 pl-3 pr-4 py-2 rounded-xl border border-dashed border-border/30 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/40 hover:border-primary/30 hover:text-primary/60 transition-all duration-200 h-full">
          <Plus className="w-3.5 h-3.5" />
          Legg til
        </button>
      </Link>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   GARAGE HERO — selected vehicle
══════════════════════════════════════════════════════════════════ */
function GarageHero({
  vehicle, serviceCount, receiptCount, locale,
}: {
  vehicle: VehicleSummary;
  serviceCount: number;
  receiptCount: number;
  locale: string;
}) {
  const isMoto = vehicle.type === "motorcycle";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card group">
      {/* ── Image surface ── */}
      <div className="relative h-72 md:h-80 lg:h-[380px] overflow-hidden">
        {vehicle.imageUrl ? (
          <img
            src={vehicle.imageUrl}
            alt={`${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.015]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/20 via-background to-sidebar"
            style={vehicle.color ? {
              background: `linear-gradient(135deg, color-mix(in srgb, ${vehicle.color} 8%, transparent) 0%, hsl(220 15% 10%) 100%)`,
            } : undefined}
          >
            <div className="opacity-[0.035] select-none pointer-events-none">
              {isMoto
                ? <Bike style={{ width: 340, height: 340 }} className="text-foreground" />
                : <Car style={{ width: 340, height: 340 }} className="text-foreground" />}
            </div>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/25 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/35 to-transparent" />

        {/* ── Top badges + actions ── */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-primary/90 rounded-full px-3 py-1">
              <span className="text-[10px] font-black text-primary-foreground uppercase tracking-widest">Aktivt kjøretøy</span>
            </span>
            {vehicle.color && (
              <span
                className="w-4 h-4 rounded-full border-2 border-white/30 shadow-md shrink-0"
                style={{ backgroundColor: vehicle.color }}
                title={vehicle.color}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {vehicle.imageUrl && (
              <Link href={`/vehicles/${vehicle.id}/edit`}>
                <button className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all duration-200">
                  <Image className="w-3.5 h-3.5" />
                </button>
              </Link>
            )}
            <Link href={`/vehicles/${vehicle.id}/edit`}>
              <button className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all duration-200">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </Link>
            <Link href={`/vehicles/${vehicle.id}`}>
              <button className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all duration-200">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* ── Vehicle identity + stats bar ── */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
          {/* Meta line */}
          <p className="text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-1 flex items-center gap-2">
            {vehicle.year && <span>{vehicle.year}</span>}
            {vehicle.year && <span>·</span>}
            <span>{isMoto ? "Motorsykkel" : "Bil"}</span>
            {vehicle.registrationNumber && <span>·</span>}
            {vehicle.registrationNumber && (
              <span className="font-mono">{vehicle.registrationNumber}</span>
            )}
          </p>

          {/* Vehicle name */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-none mb-4">
            {vehicle.make} {vehicle.model}
          </h2>

          {/* Stats bar */}
          <div className="flex items-center gap-5 flex-wrap">
            {vehicle.mileage && (
              <div className="flex items-center gap-2">
                <Gauge className="w-3.5 h-3.5 text-white/40" />
                <span className="text-[13px] font-black text-white tabular-nums">
                  {vehicle.mileage.toLocaleString(locale)}<span className="text-white/45 font-semibold ml-1 text-[11px]">km</span>
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-white/40" />
              <span className="text-[13px] font-bold text-white">
                {receiptCount} <span className="text-white/45 font-semibold text-[11px]">{receiptCount === 1 ? "dokument" : "dokumenter"}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-white/40" />
              <span className="text-[13px] font-bold text-white">
                {serviceCount} <span className="text-white/45 font-semibold text-[11px]">{serviceCount === 1 ? "servicepost" : "serviceposter"}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick action bar ── */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-t border-border/30 overflow-x-auto no-scrollbar">
        <Link href={`/vehicles/${vehicle.id}/service/new`} className="shrink-0">
          <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 text-[11px] font-black uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98]">
            <Wrench className="w-3.5 h-3.5" />
            Loggfør service
          </button>
        </Link>
        <Link href={`/vehicles/${vehicle.id}/receipts/new`} className="shrink-0">
          <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border/60 hover:border-border hover:bg-muted/20 transition-colors text-[11px] font-bold uppercase tracking-wide text-foreground/70">
            <Receipt className="w-3.5 h-3.5" />
            Legg til dokument
          </button>
        </Link>
        <Link href={`/vehicles/${vehicle.id}`} className="shrink-0">
          <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border/60 hover:border-border hover:bg-muted/20 transition-colors text-[11px] font-bold uppercase tracking-wide text-foreground/70">
            <Route className="w-3.5 h-3.5" />
            Kjørebok
          </button>
        </Link>
        <Link href={`/vehicles/${vehicle.id}/edit`} className="ml-auto shrink-0">
          <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-border/40 hover:border-border hover:bg-muted/10 transition-colors text-foreground/35 hover:text-foreground/60">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </Link>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SERVICE TIMELINE — inline mini history
══════════════════════════════════════════════════════════════════ */
function ServiceTimeline({
  services, vehicleId, locale,
}: {
  services: Array<{
    id: number; title: string; category: string;
    serviceDate: string; cost?: number | null;
    performedBy?: string | null;
  }>;
  vehicleId: number;
  locale: string;
}) {
  const visible = services.slice(0, 6);

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center px-6">
        <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center mb-3">
          <Wrench className="w-5 h-5 text-muted-foreground/25" />
        </div>
        <p className="text-[12px] font-bold text-foreground/40 uppercase tracking-wide mb-1">Ingen serviceposter ennå</p>
        <p className="text-[11px] text-muted-foreground/40 mb-4 max-w-[180px]">
          Start ditt digitale servicehefte
        </p>
        <Link href={`/vehicles/${vehicleId}/service/new`}>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-primary/25 text-primary hover:bg-primary/10 hover:border-primary/40 transition-all text-[11px] font-bold uppercase tracking-wide">
            <Plus className="w-3 h-3" />
            Loggfør service
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-border/25">
        {visible.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="flex items-start gap-3.5 py-3.5 px-5 group hover:bg-muted/5 transition-colors"
          >
            {/* Timeline dot */}
            <div className="flex flex-col items-center shrink-0 pt-0.5">
              <div className={`w-2 h-2 rounded-full ${CATEGORY_DOT[s.category] ?? "bg-primary"}`} />
              {i < visible.length - 1 && (
                <div className="w-px flex-1 bg-border/25 mt-1 min-h-[24px]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12.5px] font-bold text-foreground leading-tight truncate">{s.title}</p>
                {s.cost != null && s.cost > 0 && (
                  <span className="text-[11px] font-mono text-foreground/60 font-semibold shrink-0">
                    kr {s.cost.toLocaleString(locale)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${CATEGORY_COLORS[s.category] ?? "bg-muted/50 text-muted-foreground"}`}>
                  {CATEGORY_LABELS[s.category] ?? s.category}
                </span>
                <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {new Date(s.serviceDate).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                </span>
                {s.performedBy && (
                  <span className="text-[10px] text-muted-foreground/35 truncate max-w-[100px]">{s.performedBy}</span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {services.length > 0 && (
        <div className="px-5 py-3 border-t border-border/25">
          <Link href={`/vehicles/${vehicleId}`}>
            <button className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/50 hover:text-primary transition-colors py-1 group">
              Se full historikk ({services.length} poster)
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MILEAGE PANEL
══════════════════════════════════════════════════════════════════ */
function MileagePanel({ vehicle, locale }: { vehicle: VehicleSummary; locale: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="px-4 pt-3.5 pb-1">
        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-3">Kilometerstand</p>
        {vehicle.mileage ? (
          <>
            <p className="text-3xl font-black text-foreground tabular-nums leading-none">
              {vehicle.mileage.toLocaleString(locale)}
            </p>
            <p className="text-[11px] text-muted-foreground/45 mt-1">km registrert</p>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground/40">Ingen kilometerstand registrert</p>
        )}
      </div>
      <div className="px-4 py-3 border-t border-border/25 mt-3">
        <Link href={`/vehicles/${vehicle.id}/edit`}>
          <button className="w-full flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary/70 hover:text-primary transition-colors py-0.5">
            <Gauge className="w-3 h-3" />
            Oppdater km-stand
          </button>
        </Link>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DOCUMENTS PANEL
══════════════════════════════════════════════════════════════════ */
function DocumentsPanel({
  receipts, vehicleId, locale,
}: {
  receipts: Array<{
    id: number; title: string; amount?: number | null;
    receiptDate?: string | null; vendor?: string | null;
    fileUrl?: string | null;
  }>;
  vehicleId: number;
  locale: string;
}) {
  const visible = receipts.slice(0, 4);

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Dokumenter</p>
        <Link href={`/vehicles/${vehicleId}/receipts/new`}>
          <button className="text-[10px] font-bold text-primary/60 hover:text-primary uppercase tracking-wide flex items-center gap-1 transition-colors">
            Last opp <Plus className="w-2.5 h-2.5" />
          </button>
        </Link>
      </div>

      {visible.length === 0 ? (
        <div className="px-4 pb-4 pt-1">
          <p className="text-[11px] text-muted-foreground/40">Ingen dokumenter ennå. Last opp kvitteringer, fakturaer og sertifikater.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/20">
          {visible.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/5 transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-primary/50" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11.5px] font-semibold text-foreground/80 truncate">{r.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {r.amount != null && r.amount > 0 && (
                    <span className="text-[10px] font-mono text-muted-foreground/50">kr {r.amount.toLocaleString(locale)}</span>
                  )}
                  {r.receiptDate && (
                    <span className="text-[10px] text-muted-foreground/35">
                      {r.amount != null && r.amount > 0 && "· "}
                      {new Date(r.receiptDate).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              </div>
              {r.fileUrl && (
                <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground/25 hover:text-primary/60 transition-colors shrink-0">
                  <ArrowRight className="w-3.5 h-3.5 rotate-[-45deg]" />
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {receipts.length > 4 && (
        <div className="px-4 py-2.5 border-t border-border/25">
          <Link href={`/vehicles/${vehicleId}`}>
            <button className="w-full text-[11px] font-bold uppercase tracking-wide text-muted-foreground/40 hover:text-primary transition-colors flex items-center justify-center gap-1">
              Alle {receipts.length} dokumenter <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   GARAGE VIEW — main view when vehicles exist
══════════════════════════════════════════════════════════════════ */
function GarageView({ vehicles }: { vehicles: VehicleSummary[] }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const locale = getCurrentLocale();
  const safeIdx = Math.min(selectedIdx, vehicles.length - 1);
  const vehicle = vehicles[safeIdx];

  const { data: services, isLoading: servicesLoading } = useListServiceRecords(vehicle.id, {
    query: {
      enabled: !!vehicle.id,
      queryKey: getListServiceRecordsQueryKey(vehicle.id),
      placeholderData: keepPreviousData,
    },
  });
  const { data: receipts, isLoading: receiptsLoading } = useListReceipts(vehicle.id, {
    query: {
      enabled: !!vehicle.id,
      queryKey: getListReceiptsQueryKey(vehicle.id),
      placeholderData: keepPreviousData,
    },
  });

  const serviceList = services ?? [];
  const receiptList = receipts ?? [];

  function handleSelect(i: number) {
    setSelectedIdx(i);
  }

  return (
    <div className="space-y-5 pb-12">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Garasjen min</h1>
          <p className="text-muted-foreground/55 mt-1 text-[13px]">
            {vehicles.length === 1
              ? "1 kjøretøy registrert"
              : `${vehicles.length} kjøretøy registrert`}
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

      {/* ── Vehicle selector (only if multiple vehicles) ── */}
      {vehicles.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.35 }}
        >
          <VehicleSelector vehicles={vehicles} selectedIdx={safeIdx} onSelect={handleSelect} />
        </motion.div>
      )}

      {/* ── Hero — animates on vehicle change ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={vehicle.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        >
          <GarageHero
            vehicle={vehicle}
            serviceCount={serviceList.length}
            receiptCount={receiptList.length}
            locale={locale}
          />
        </motion.div>
      </AnimatePresence>

      {/* ── Bottom content: service history + sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Service history — left 2/3 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`services-${vehicle.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
                Servicehistorikk
              </h2>
              <Link href={`/vehicles/${vehicle.id}/service/new`}>
                <button className="text-[11px] font-bold uppercase tracking-wide text-primary/70 hover:text-primary transition-colors flex items-center gap-1">
                  Legg til post <Plus className="w-3 h-3" />
                </button>
              </Link>
            </div>

            <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
              {servicesLoading ? (
                <div className="px-5 py-6 space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-start gap-3.5 animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-muted/40 mt-1.5 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-muted/40 rounded-md w-3/4" />
                        <div className="h-2.5 bg-muted/25 rounded-md w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ServiceTimeline services={serviceList} vehicleId={vehicle.id} locale={locale} />
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Sidebar — right 1/3 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`sidebar-${vehicle.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="space-y-4"
          >
            {/* Mileage */}
            <div>
              <h2 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-3">
                Kilometerstand
              </h2>
              <MileagePanel vehicle={vehicle} locale={locale} />
            </div>

            {/* Documents */}
            <div>
              <h2 className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-3">
                Dokumenter
              </h2>
              {receiptsLoading ? (
                <div className="rounded-xl border border-border/50 bg-card px-4 py-4 space-y-3 animate-pulse">
                  {[1, 2].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-muted/40 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-2.5 bg-muted/40 rounded w-3/4" />
                        <div className="h-2 bg-muted/25 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <DocumentsPanel receipts={receiptList} vehicleId={vehicle.id} locale={locale} />
              )}
            </div>

            {/* Full detail link */}
            <Link href={`/vehicles/${vehicle.id}`}>
              <button className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/50 hover:text-primary group">
                Full kjøretøyoversikt
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   GARAGE ONBOARDING — zero vehicles
══════════════════════════════════════════════════════════════════ */
function GarageOnboarding({ firstName }: { firstName: string }) {
  const steps = [
    "Registrer regnr., årsmodell og kilometerstand",
    "Last opp bilde av kjøretøyet ditt",
    "Start ditt digitale servicehefte",
    "Bli med i en klubb for entusiaster",
  ];
  const features = [
    { icon: Wrench,   title: "Servicehefte",    desc: "Full vedlikeholdshistorikk med dato og kostnader" },
    { icon: FileText, title: "Dokumentasjon",   desc: "Kvitteringer, fakturaer og forsikringsdokumenter" },
    { icon: Users,    title: "Klubber",          desc: "Koble deg til norske bil- og motorsykkelklubber" },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card">
          <div className="relative h-64 md:h-72 flex flex-col items-center justify-center bg-gradient-to-br from-muted/20 via-background to-sidebar px-8 text-center">
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.025] pointer-events-none select-none">
              <Car style={{ width: 500, height: 500 }} className="text-foreground" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-primary/5 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-primary/[0.03] pointer-events-none" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              className="relative z-10 space-y-5"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <Wrench className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-2">Garasjen min</p>
                <h1 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tight leading-tight">
                  Din digitale garasje<br />
                  <span className="text-primary">venter på deg</span>
                </h1>
                <p className="text-sm text-muted-foreground/60 mt-3 max-w-sm mx-auto">
                  Hei {firstName}! Legg til ditt første kjøretøy og begynn å bygge en komplett digital historikk.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                <Link href="/vehicles/new">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-[12px] font-black uppercase tracking-wider shadow-lg shadow-primary/20"
                  >
                    <Plus className="w-4 h-4" /> Legg til kjøretøy
                  </motion.button>
                </Link>
                <Link href="/clubs">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border/60 hover:border-border bg-transparent hover:bg-muted/20 transition-colors text-[12px] font-bold uppercase tracking-wide text-foreground/60"
                  >
                    <Users className="w-4 h-4" /> Utforsk klubber
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-border/30 border-t border-border/30">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                className="px-4 py-4 flex items-start gap-2.5"
              >
                <Icon className="w-3.5 h-3.5 text-primary/50 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-foreground/60 uppercase tracking-wide">{title}</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5 leading-snug hidden md:block">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.5 }}>
          <h2 className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest mb-4">Kom i gang på 4 steg</h2>
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center gap-4 px-5 py-4 border-b border-border/30 last:border-0">
                <div className="w-6 h-6 rounded-full border-2 border-border/40 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-muted-foreground/40">{i + 1}</span>
                </div>
                <p className="text-[12.5px] font-semibold text-foreground/60">{step}</p>
              </div>
            ))}
            <div className="px-5 py-4 bg-primary/[0.03]">
              <Link href="/vehicles/new">
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-[12px] font-bold uppercase tracking-wide">
                  <Plus className="w-3.5 h-3.5" /> Start nå — legg til kjøretøy
                </button>
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <h2 className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest mb-4">Det du låser opp</h2>
          <div className="space-y-2.5">
            {[
              "Fullstendig servicehistorikk med tidslinje",
              "Kvitteringer og dokumentlagring",
              "Kilometerstand og vedlikeholdsintervaller",
              "Eksportér til PDF og del med mekanikere",
              "Finn verdi og historikk på Finn.no",
              "Bli med i norske entusiastklubber",
            ].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.06, duration: 0.35 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-card"
              >
                <CheckCircle2 className="w-4 h-4 text-primary/60 shrink-0" />
                <span className="text-[12.5px] font-semibold text-foreground/70">{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}
        className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div>
          <p className="text-[13px] font-black text-foreground/80 uppercase tracking-tight">Klar til å starte?</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">Det tar under 2 minutter å registrere ditt første kjøretøy.</p>
        </div>
        <Link href="/vehicles/new">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 text-[12px] font-bold uppercase tracking-wide shrink-0 hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="w-4 h-4" /> Legg til kjøretøy <ArrowRight className="w-3.5 h-3.5" />
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

  return <GarageView vehicles={vehicles} />;
}
