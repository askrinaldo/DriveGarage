import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useGetServiceRecord, 
  getGetServiceRecordQueryKey,
  useCreateServiceRecord,
  useUpdateServiceRecord,
  getListServiceRecordsQueryKey,
  useGetVehicle
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { LoadingState, ErrorState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const serviceSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd"),
  description: z.string().optional().nullable(),
  serviceDate: z.string().min(1, "Dato er påkrevd"),
  mileageAtService: z.coerce.number().min(0).optional().nullable(),
  cost: z.coerce.number().min(0).optional().nullable(),
  performedBy: z.string().optional().nullable(),
  category: z.enum(["oil-change", "brakes", "tires", "engine", "electrical", "bodywork", "other"]),
  bodyArea: z.enum([
    "front-wheel", "rear-wheel", "engine", "exhaust", "brakes-front", "brakes-rear", 
    "suspension-front", "suspension-rear", "electrical", "frame", "other"
  ]).optional().nullable(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

export default function ServiceForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const vehicleId = parseInt(params.id!);
  const serviceId = params.serviceId ? parseInt(params.serviceId) : undefined;
  const isNew = !serviceId;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vehicle, isLoading: vehicleLoading } = useGetVehicle(vehicleId, {
    query: { enabled: !!vehicleId }
  });

  const { data: service, isLoading: serviceLoading, isError } = useGetServiceRecord(vehicleId, serviceId!, {
    query: { enabled: !!serviceId, queryKey: getGetServiceRecordQueryKey(vehicleId, serviceId!) }
  });

  const createMutation = useCreateServiceRecord();
  const updateMutation = useUpdateServiceRecord();

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: "",
      description: "",
      serviceDate: format(new Date(), "yyyy-MM-dd"),
      mileageAtService: null,
      cost: null,
      performedBy: "",
      category: "other",
      bodyArea: "other",
    },
  });

  useEffect(() => {
    if (service && !isNew) {
      form.reset({
        title: service.title,
        description: service.description || "",
        serviceDate: format(new Date(service.serviceDate), "yyyy-MM-dd"),
        mileageAtService: service.mileageAtService,
        cost: service.cost,
        performedBy: service.performedBy || "",
        category: service.category as any,
        bodyArea: (service.bodyArea as any) || "other",
      });
    } else if (vehicle && isNew && vehicle.mileage) {
      // Pre-fill mileage if we have it
      form.setValue("mileageAtService", vehicle.mileage);
    }
  }, [service, vehicle, isNew, form]);

  const onSubmit = (data: ServiceFormValues) => {
    const formattedData = {
      ...data,
      description: data.description || null,
      performedBy: data.performedBy || null,
      bodyArea: data.bodyArea || null,
      // API expects ISO string date, our input type="date" gives YYYY-MM-DD
      // Append time to make it valid ISO 8601
      serviceDate: new Date(data.serviceDate).toISOString(),
    };

    if (isNew) {
      createMutation.mutate({ vehicleId, data: formattedData as any }, {
        onSuccess: () => {
          toast({ title: "Servicepost lagt til" });
          queryClient.invalidateQueries({ queryKey: getListServiceRecordsQueryKey(vehicleId) });
          setLocation(`/vehicles/${vehicleId}`);
        },
        onError: () => {
          toast({ title: "Kunne ikke legge til servicepost", variant: "destructive" });
        }
      });
    } else {
      updateMutation.mutate({ id: serviceId!, data: formattedData as any }, {
        onSuccess: () => {
          toast({ title: "Servicepost oppdatert" });
          queryClient.invalidateQueries({ queryKey: getListServiceRecordsQueryKey(vehicleId) });
          queryClient.invalidateQueries({ queryKey: getGetServiceRecordQueryKey(vehicleId, serviceId!) });
          setLocation(`/vehicles/${vehicleId}`);
        },
        onError: () => {
          toast({ title: "Kunne ikke oppdatere", variant: "destructive" });
        }
      });
    }
  };

  if (vehicleLoading || (!isNew && serviceLoading)) return <LoadingState message="Laster detaljer..." />;
  if (!isNew && isError) return <ErrorState onRetry={() => window.location.reload()} />;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation(`/vehicles/${vehicleId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isNew ? "Ny servicepost" : "Rediger servicepost"}</h1>
          <p className="text-muted-foreground mt-1">For {vehicle?.year} {vehicle?.make} {vehicle?.model}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Detaljer om jobben</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tittel</FormLabel>
                      <FormControl>
                        <Input placeholder="f.eks. Oljeskift & Filter" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Velg en kategori" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="oil-change">Oljeskift / Væsker</SelectItem>
                          <SelectItem value="brakes">Bremser</SelectItem>
                          <SelectItem value="tires">Dekk & Demping</SelectItem>
                          <SelectItem value="engine">Motor & Girkasse</SelectItem>
                          <SelectItem value="electrical">Elektro</SelectItem>
                          <SelectItem value="bodywork">Karosseri & Interiør</SelectItem>
                          <SelectItem value="other">Annet</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="serviceDate"
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
                  name="mileageAtService"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kilometerstand (km)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bodyArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kjøretøysområde (for vedlikeholdskart)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "other"} value={field.value || "other"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Velg område" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="front-wheel">Forhjul</SelectItem>
                        <SelectItem value="rear-wheel">Bakhjul</SelectItem>
                        <SelectItem value="engine">Motor</SelectItem>
                        <SelectItem value="exhaust">Eksos</SelectItem>
                        <SelectItem value="brakes-front">Bremser foran</SelectItem>
                        <SelectItem value="brakes-rear">Bremser bak</SelectItem>
                        <SelectItem value="suspension-front">Demping foran</SelectItem>
                        <SelectItem value="suspension-rear">Demping bak</SelectItem>
                        <SelectItem value="electrical">Elektro</SelectItem>
                        <SelectItem value="frame">Ramme</SelectItem>
                        <SelectItem value="other">Annet</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beskrivelse</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Deler brukt, spesifikke prosedyrer, notater..." className="min-h-[100px]" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Logistikk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="performedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Utført av</FormLabel>
                      <FormControl>
                        <Input placeholder="Verkstednavn eller 'Selv'" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Totalkostnad (kr)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
