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
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  serviceDate: z.string().min(1, "Date is required"),
  mileageAtService: z.coerce.number().min(0).optional().nullable(),
  cost: z.coerce.number().min(0).optional().nullable(),
  performedBy: z.string().optional().nullable(),
  category: z.enum(["oil-change", "brakes", "tires", "engine", "electrical", "bodywork", "other"]),
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
      // API expects ISO string date, our input type="date" gives YYYY-MM-DD
      // Append time to make it valid ISO 8601
      serviceDate: new Date(data.serviceDate).toISOString(),
    };

    if (isNew) {
      createMutation.mutate({ vehicleId, data: formattedData as any }, {
        onSuccess: () => {
          toast({ title: "Service record added" });
          queryClient.invalidateQueries({ queryKey: getListServiceRecordsQueryKey(vehicleId) });
          setLocation(`/vehicles/${vehicleId}`);
        },
        onError: () => {
          toast({ title: "Failed to add service record", variant: "destructive" });
        }
      });
    } else {
      updateMutation.mutate({ id: serviceId!, data: formattedData as any }, {
        onSuccess: () => {
          toast({ title: "Service record updated" });
          queryClient.invalidateQueries({ queryKey: getListServiceRecordsQueryKey(vehicleId) });
          queryClient.invalidateQueries({ queryKey: getGetServiceRecordQueryKey(vehicleId, serviceId!) });
          setLocation(`/vehicles/${vehicleId}`);
        },
        onError: () => {
          toast({ title: "Failed to update record", variant: "destructive" });
        }
      });
    }
  };

  if (vehicleLoading || (!isNew && serviceLoading)) return <LoadingState message="Loading details..." />;
  if (!isNew && isError) return <ErrorState onRetry={() => window.location.reload()} />;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation(`/vehicles/${vehicleId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isNew ? "Add Service Record" : "Edit Service Record"}</h1>
          <p className="text-muted-foreground mt-1">For {vehicle?.year} {vehicle?.make} {vehicle?.model}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Oil Change & Filter" {...field} />
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
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="oil-change">Oil Change / Fluids</SelectItem>
                          <SelectItem value="brakes">Brakes</SelectItem>
                          <SelectItem value="tires">Tires & Suspension</SelectItem>
                          <SelectItem value="engine">Engine & Transmission</SelectItem>
                          <SelectItem value="electrical">Electrical</SelectItem>
                          <SelectItem value="bodywork">Bodywork & Interior</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
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
                      <FormLabel>Date</FormLabel>
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
                      <FormLabel>Mileage at Service (km)</FormLabel>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Parts used, specific procedures followed, notes..." className="min-h-[100px]" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Logistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="performedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Performed By</FormLabel>
                      <FormControl>
                        <Input placeholder="Workshop name or 'Self'" {...field} value={field.value || ''} />
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
                      <FormLabel>Total Cost ($)</FormLabel>
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
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Record
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
