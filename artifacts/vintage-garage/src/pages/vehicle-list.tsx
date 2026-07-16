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
import { Plus, Car, Gauge, Bike } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

export default function VehicleList() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: vehicles, isLoading, isError, refetch } = useListVehicles({
    query: { queryKey: getListVehiclesQueryKey() },
  });

  // Prefetch vehicle detail data AND the JS chunk on hover/focus,
  // so clicking a card feels instant.
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => (
          <Link
            key={vehicle.id}
            href={`/vehicles/${vehicle.id}`}
            onMouseEnter={() => prefetchVehicle(vehicle.id)}
            onFocus={() => prefetchVehicle(vehicle.id)}
          >
            <Card className="hover-elevate cursor-pointer transition-colors bg-card border-border overflow-hidden group">
              <div className="h-2 w-full bg-primary/20 group-hover:bg-primary transition-colors" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-muted rounded-md inline-flex">
                    {vehicle.type === "motorcycle" ? (
                      <Bike className="w-6 h-6 text-foreground" />
                    ) : (
                      <Car className="w-6 h-6 text-foreground" />
                    )}
                  </div>
                  {vehicle.registrationNumber && (
                    <Badge variant="secondary" className="font-mono bg-sidebar border-border">
                      {vehicle.registrationNumber}
                    </Badge>
                  )}
                </div>
                <h3 className="font-bold text-xl mb-1">
                  {vehicle.year} {vehicle.make}
                </h3>
                <p className="text-muted-foreground text-sm font-medium mb-4">{vehicle.model}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {vehicle.mileage && (
                    <div className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5" />
                      <span className="font-mono">{vehicle.mileage.toLocaleString()} km</span>
                    </div>
                  )}
                  {vehicle.color && (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: vehicle.color }}
                      />
                      <span className="capitalize">{vehicle.color}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
