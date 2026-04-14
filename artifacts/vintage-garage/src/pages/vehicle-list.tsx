import { Link } from "wouter";
import { useListVehicles, getListVehiclesQueryKey } from "@workspace/api-client-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Car, Gauge, Calendar, Bike } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function VehicleList() {
  const { data: vehicles, isLoading, isError, refetch } = useListVehicles({
    query: { queryKey: getListVehiclesQueryKey() }
  });

  if (isLoading) return <LoadingState message="Loading garage..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  if (!vehicles || vehicles.length === 0) {
    return (
      <EmptyState
        icon={Car}
        title="Your garage is empty"
        description="Add your first vehicle to start tracking its service history and receipts."
        action={
          <Link href="/vehicles/new">
            <Button><Plus className="w-4 h-4 mr-2" /> Add Vehicle</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Garage</h1>
          <p className="text-muted-foreground mt-1">Manage your vehicles and their records.</p>
        </div>
        <Link href="/vehicles/new">
          <Button><Plus className="w-4 h-4 mr-2" /> Add Vehicle</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => (
          <Link key={vehicle.id} href={`/vehicles/${vehicle.id}`}>
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
                
                <h3 className="font-bold text-xl mb-1">{vehicle.year} {vehicle.make}</h3>
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
                      <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: vehicle.color }} />
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
