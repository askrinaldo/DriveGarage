import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useGetTripLog, 
  getGetTripLogQueryKey,
  useCreateTripLog,
  useUpdateTripLog,
  getListTripLogsQueryKey,
  useGetVehicle,
  getGetVehicleQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { LoadingState, ErrorState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format } from "date-fns";

const tripSchema = z.object({
  tripDate: z.string().min(1, "Dato er påkrevd"),
  fromLocation: z.string().min(1, "Fra-sted er påkrevd"),
  toLocation: z.string().min(1, "Til-sted er påkrevd"),
  distanceKm: z.coerce.number().min(0).optional().nullable(),
  mileageStart: z.coerce.number().min(0).optional().nullable(),
  mileageEnd: z.coerce.number().min(0).optional().nullable(),
  fuelUsedLiters: z.coerce.number().min(0).optional().nullable(),
  weather: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type TripFormValues = z.infer<typeof tripSchema>;

export default function TripForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const vehicleId = parseInt(params.id!);
  const tripId = params.tripId ? parseInt(params.tripId) : undefined;
  const isNew = !tripId;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vehicle, isLoading: vehicleLoading } = useGetVehicle(vehicleId, {
    query: { enabled: !!vehicleId, queryKey: getGetVehicleQueryKey(vehicleId) }
  });

  const { data: trip, isLoading: tripLoading, isError } = useGetTripLog(vehicleId, tripId!, {
    query: { enabled: !!tripId, queryKey: getGetTripLogQueryKey(vehicleId, tripId!) }
  });

  const createMutation = useCreateTripLog();
  const updateMutation = useUpdateTripLog();

  const form = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      tripDate: format(new Date(), "yyyy-MM-dd"),
      fromLocation: "",
      toLocation: "",
      distanceKm: null,
      mileageStart: null,
      mileageEnd: null,
      fuelUsedLiters: null,
      weather: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (trip && !isNew) {
      form.reset({
        tripDate: format(new Date(trip.tripDate), "yyyy-MM-dd"),
        fromLocation: trip.fromLocation,
        toLocation: trip.toLocation,
        distanceKm: trip.distanceKm,
        mileageStart: trip.mileageStart,
        mileageEnd: trip.mileageEnd,
        fuelUsedLiters: trip.fuelUsedLiters,
        weather: trip.weather || "",
        notes: trip.notes || "",
      });
    } else if (vehicle && isNew && vehicle.mileage) {
      form.setValue("mileageStart", vehicle.mileage);
    }
  }, [trip, vehicle, isNew, form]);

  const onSubmit = (data: TripFormValues) => {
    const formattedData = {
      ...data,
      weather: data.weather || null,
      notes: data.notes || null,
      tripDate: new Date(data.tripDate).toISOString(),
    };

    if (isNew) {
      createMutation.mutate({ vehicleId, data: formattedData as any }, {
        onSuccess: () => {
          toast({ title: "Tur lagt til" });
          queryClient.invalidateQueries({ queryKey: getListTripLogsQueryKey(vehicleId) });
          setLocation(`/vehicles/${vehicleId}`);
        },
        onError: () => {
          toast({ title: "Kunne ikke legge til tur", variant: "destructive" });
        }
      });
    } else {
      updateMutation.mutate({ vehicleId, id: tripId!, data: formattedData as any }, {
        onSuccess: () => {
          toast({ title: "Tur oppdatert" });
          queryClient.invalidateQueries({ queryKey: getListTripLogsQueryKey(vehicleId) });
          queryClient.invalidateQueries({ queryKey: getGetTripLogQueryKey(vehicleId, tripId!) });
          setLocation(`/vehicles/${vehicleId}`);
        },
        onError: () => {
          toast({ title: "Kunne ikke oppdatere", variant: "destructive" });
        }
      });
    }
  };

  if (vehicleLoading || (!isNew && tripLoading)) return <LoadingState message="Laster detaljer..." />;
  if (!isNew && isError) return <ErrorState onRetry={() => window.location.reload()} />;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation(`/vehicles/${vehicleId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isNew ? "Logg ny tur" : "Rediger tur"}</h1>
          <p className="text-muted-foreground mt-1">For {vehicle?.year} {vehicle?.make} {vehicle?.model}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Reise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fromLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fra</FormLabel>
                      <FormControl>
                        <Input placeholder="f.eks. Oslo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Til</FormLabel>
                      <FormControl>
                        <Input placeholder="f.eks. Bergen" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="tripDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dato</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="distanceKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avstand (km)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Kjøretøy og miljø</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="mileageStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kilometerstand Start</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mileageEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kilometerstand Slutt</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fuelUsedLiters"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Drivstoff brukt (L)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weather"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Værforhold</FormLabel>
                      <FormControl>
                        <Input placeholder="f.eks. Sol, 20°C" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notater</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Noe spesielt å bemerke fra turen..." className="min-h-[100px]" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => setLocation(`/vehicles/${vehicleId}`)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Lagrer..." : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Lagre
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
