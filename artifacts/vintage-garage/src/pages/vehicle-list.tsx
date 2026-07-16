import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  useListVehicles,
  getListVehiclesQueryKey,
  getVehicle,
  getGetVehicleQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorState, VehicleListSkeleton } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Car, Gauge, Bike, Wrench, FileText, Users, CheckCircle2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useUserAuth } from "@/hooks/use-user-auth";

/* ── Feature card for empty state ─────────────────────────────── */
function FeatureCard({ icon: Icon, title, desc, color }: {
  icon: React.ElementType; title: string; desc: string; color: string;
}) {
  return (
    <div className={`rounded-xl border bg-card p-5 flex flex-col gap-3 ${color}`}>
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
      </div>
      <div>
        <p className="text-[12px] font-black text-foreground/80 uppercase tracking-wide">{title}</p>
        <p className="text-[11px] text-muted-foreground/50 mt-1 leading-snug">{desc}</p>
      </div>
    </div>
  );
}

/* ── Premium garage onboarding page ───────────────────────────── */
function GarageOnboarding({ firstName }: { firstName: string }) {
  const steps = [
    "Registrer regnr., årsmodell og kilometerstand",
    "Last opp bilde av kjøretøyet ditt",
    "Start ditt digitale servicehefte",
    "Bli med i en klubb for entusiaster",
  ];

  const features = [
    { icon: Wrench, title: "Servicehefte",   desc: "Full vedlikeholdshistorikk med dato og kostnader" },
    { icon: FileText, title: "Dokumentasjon", desc: "Kvitteringer, fakturaer og forsikringsdokumenter" },
    { icon: Users,   title: "Klubber",        desc: "Koble deg til norske bil- og motorsykkelklubber" },
  ];

  return (
    <div className="space-y-10 pb-12">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card">
          {/* Background graphic */}
          <div className="relative h-64 md:h-72 flex flex-col items-center justify-center bg-gradient-to-br from-muted/20 via-background to-sidebar px-8 text-center">
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.025] pointer-events-none select-none">
              <Car style={{ width: 500, height: 500 }} className="text-foreground" />
            </div>
            {/* Decorative ring */}
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
                <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-2">
                  Garasjen min
                </p>
                <h1 className="text-3xl md:text-4xl font-black text-foreground uppercase tracking-tight leading-tight">
                  Din digitale garasje
                  <br />
                  <span className="text-primary">venter på deg</span>
                </h1>
                <p className="text-sm text-muted-foreground/60 mt-3 max-w-sm mx-auto">
                  Hei {firstName}! Legg til ditt første kjøretøy og begynn å bygge en komplett digital historikk.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                <Link href="/vehicles/new">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-[12px] font-black uppercase tracking-wider shadow-lg shadow-primary/20"
                  >
                    <Plus className="w-4 h-4" />
                    Legg til kjøretøy
                  </motion.button>
                </Link>
                <Link href="/clubs">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border/60 hover:border-border bg-transparent hover:bg-muted/20 transition-colors text-[12px] font-bold uppercase tracking-wide text-foreground/60"
                  >
                    <Users className="w-4 h-4" />
                    Utforsk klubber
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Feature strip */}
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

      {/* Steps + feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Getting started steps */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        >
          <h2 className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest mb-4">
            Kom i gang på 4 steg
          </h2>
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
                  <Plus className="w-3.5 h-3.5" />
                  Start nå — legg til kjøretøy
                </button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* What you'll unlock */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        >
          <h2 className="text-[11px] font-black text-muted-foreground/70 uppercase tracking-widest mb-4">
            Det du låser opp
          </h2>
          <div className="space-y-2.5">
            {[
              { label: "Fullstendig servicehistorikk med tidslinje" },
              { label: "Kvitteringer og dokumentlagring" },
              { label: "Kilometerstand og vedlikeholdsintervaller" },
              { label: "Eksportér til PDF og del med mekanikere" },
              { label: "Finn verdi og historikk på Finn.no" },
              { label: "Bli med i norske entusiastklubber" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.06, duration: 0.35 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-card"
              >
                <CheckCircle2 className="w-4 h-4 text-primary/60 shrink-0" />
                <span className="text-[12.5px] font-semibold text-foreground/70">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="rounded-2xl border border-primary/20 bg-primary/5 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div>
          <p className="text-[13px] font-black text-foreground/80 uppercase tracking-tight">Klar til å starte?</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">Det tar under 2 minutter å registrere ditt første kjøretøy.</p>
        </div>
        <Link href="/vehicles/new">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 text-[12px] font-bold uppercase tracking-wide shrink-0 hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="w-4 h-4" />
            Legg til kjøretøy
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      </motion.div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */
export default function VehicleList() {
  const { t } = useTranslation();
  const { name } = useUserAuth();
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading, isError, refetch } = useListVehicles({
    query: { queryKey: getListVehiclesQueryKey() },
  });

  function prefetchVehicle(id: number) {
    void import("@/pages/vehicle-detail");
    void queryClient.prefetchQuery({
      queryKey: getGetVehicleQueryKey(id),
      queryFn: () => getVehicle(id),
      staleTime: 60_000,
    });
  }

  if (isLoading) return <VehicleListSkeleton />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const firstName = name?.split(" ")[0] ?? "Sjåfør";

  if (!vehicles || vehicles.length === 0) {
    return <GarageOnboarding firstName={firstName} />;
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">{t("vehicleList.title")}</h1>
          <p className="text-muted-foreground/60 mt-1 text-sm">{t("vehicleList.subtitle")}</p>
        </div>
        <Link href="/vehicles/new">
          <Button className="gap-2 font-bold uppercase tracking-wide text-[12px]">
            <Plus className="w-4 h-4" /> {t("vehicleList.addVehicle")}
          </Button>
        </Link>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle, i) => (
          <motion.div
            key={vehicle.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <Link
              href={`/vehicles/${vehicle.id}`}
              onMouseEnter={() => prefetchVehicle(vehicle.id)}
              onFocus={() => prefetchVehicle(vehicle.id)}
            >
              <Card className="hover-elevate cursor-pointer bg-card border-border overflow-hidden group transition-all duration-200">
                {vehicle.imageUrl ? (
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={vehicle.imageUrl}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    {vehicle.registrationNumber && (
                      <div className="absolute top-3 right-3">
                        <Badge className="font-mono bg-black/60 text-white border-white/20 backdrop-blur-sm text-xs">
                          {vehicle.registrationNumber}
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="font-black text-xl text-white leading-tight drop-shadow uppercase tracking-tight">
                        {vehicle.year} {vehicle.make}
                      </h3>
                      <p className="text-white/70 text-sm font-medium">{vehicle.model}</p>
                    </div>
                  </div>
                ) : (
                  <div
                    className="relative h-28 overflow-hidden flex items-center justify-center"
                    style={{
                      background: vehicle.color
                        ? `linear-gradient(135deg, color-mix(in srgb, ${vehicle.color} 15%, transparent) 0%, transparent 60%)`
                        : undefined,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.04]">
                      {vehicle.type === "motorcycle"
                        ? <Bike className="w-40 h-40" />
                        : <Car className="w-40 h-40" />}
                    </div>
                    <div className="relative z-10 flex items-center justify-between w-full px-5">
                      <div className="p-3 bg-muted/70 backdrop-blur-sm rounded-xl border border-border/50">
                        {vehicle.type === "motorcycle"
                          ? <Bike className="w-6 h-6 text-foreground" />
                          : <Car className="w-6 h-6 text-foreground" />}
                      </div>
                      {vehicle.registrationNumber && (
                        <Badge variant="secondary" className="font-mono bg-sidebar border-border">
                          {vehicle.registrationNumber}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <CardContent className="p-4">
                  {!vehicle.imageUrl && (
                    <div className="mb-3">
                      <h3 className="font-black text-lg leading-tight uppercase tracking-tight">
                        {vehicle.year} {vehicle.make}
                      </h3>
                      <p className="text-muted-foreground text-sm font-medium">{vehicle.model}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {vehicle.mileage && (
                      <div className="flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5" />
                        <span className="font-mono">{vehicle.mileage.toLocaleString("nb-NO")} km</span>
                      </div>
                    )}
                    {vehicle.color && (
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-full border border-border/50 shrink-0"
                          style={{ backgroundColor: vehicle.color }}
                        />
                        <span className="capitalize truncate max-w-[80px]">{vehicle.color}</span>
                      </div>
                    )}
                    <div className="ml-auto flex items-center gap-1.5 text-primary/70">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{vehicle.type === "motorcycle" ? "Motorsykkel" : "Bil"}</span>
                    </div>
                  </div>
                </CardContent>

                <div
                  className="h-0.5 w-full transition-all duration-300 group-hover:opacity-100 opacity-40"
                  style={{ backgroundColor: vehicle.color || undefined }}
                >
                  {!vehicle.color && <div className="h-full w-full bg-primary" />}
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
