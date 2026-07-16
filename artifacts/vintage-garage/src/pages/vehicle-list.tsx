import { Link } from "wouter";
import {
  useListVehicles,
  getListVehiclesQueryKey,
  getVehicle,
  getGetVehicleQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorState, EmptyState, VehicleListSkeleton } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Car, Gauge, Bike, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export default function VehicleList() {
  const { t } = useTranslation();
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

  if (!vehicles || vehicles.length === 0) {
    return (
      <EmptyState
        icon={Car}
        title={t("vehicleList.emptyTitle")}
        description={t("vehicleList.emptyDesc")}
        action={
          <Link href="/vehicles/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" /> {t("vehicleList.addVehicle")}
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("vehicleList.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("vehicleList.subtitle")}</p>
        </div>
        <Link href="/vehicles/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> {t("vehicleList.addVehicle")}
          </Button>
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => (
          <Link
            key={vehicle.id}
            href={`/vehicles/${vehicle.id}`}
            onMouseEnter={() => prefetchVehicle(vehicle.id)}
            onFocus={() => prefetchVehicle(vehicle.id)}
          >
            <Card className="hover-elevate cursor-pointer bg-card border-border overflow-hidden group transition-all duration-200">
              {/* Image banner or styled header */}
              {vehicle.imageUrl ? (
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={vehicle.imageUrl}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  {/* Registration badge over image */}
                  {vehicle.registrationNumber && (
                    <div className="absolute top-3 right-3">
                      <Badge className="font-mono bg-black/60 text-white border-white/20 backdrop-blur-sm text-xs">
                        {vehicle.registrationNumber}
                      </Badge>
                    </div>
                  )}
                  {/* Vehicle name overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-bold text-xl text-white leading-tight drop-shadow">
                      {vehicle.year} {vehicle.make}
                    </h3>
                    <p className="text-white/80 text-sm font-medium">{vehicle.model}</p>
                  </div>
                </div>
              ) : (
                <div className="relative h-28 overflow-hidden flex items-center justify-center"
                  style={{
                    background: vehicle.color
                      ? `linear-gradient(135deg, color-mix(in srgb, ${vehicle.color} 15%, transparent) 0%, transparent 60%)`
                      : undefined,
                  }}>
                  {/* Subtle background pattern */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.04]">
                    {vehicle.type === "motorcycle"
                      ? <Bike className="w-40 h-40" />
                      : <Car className="w-40 h-40" />}
                  </div>
                  {/* Type icon + registration */}
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

              {/* Card footer info */}
              <CardContent className="p-4">
                {/* If image shown above, skip redundant name */}
                {!vehicle.imageUrl && (
                  <div className="mb-3">
                    <h3 className="font-bold text-lg leading-tight">
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
                    <span className="text-xs">{vehicle.type === "motorcycle" ? "Motorsykkel" : "Bil"}</span>
                  </div>
                </div>
              </CardContent>

              {/* Bottom accent line — colored from vehicle.color or primary */}
              <div
                className="h-0.5 w-full transition-all duration-300 group-hover:opacity-100 opacity-40"
                style={{ backgroundColor: vehicle.color || undefined }}
              >
                {!vehicle.color && (
                  <div className="h-full w-full bg-primary" />
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
