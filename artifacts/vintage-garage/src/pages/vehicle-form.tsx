import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useGetVehicle, 
  getGetVehicleQueryKey,
  useCreateVehicle,
  useUpdateVehicle
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { LoadingState, ErrorState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Car, Bike, Save } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const vehicleSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce.number().min(1886, "Invalid year").max(new Date().getFullYear() + 1, "Invalid year"),
  type: z.enum(["car", "motorcycle"]),
  registrationNumber: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  mileage: z.coerce.number().min(0).optional().nullable(),
  finnUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
  imageUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal('')),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

export default function VehicleForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const isNew = !params.id || params.id === "new";
  const id = isNew ? undefined : parseInt(params.id!);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vehicle, isLoading, isError } = useGetVehicle(id!, {
    query: { enabled: !!id, queryKey: getGetVehicleQueryKey(id!) }
  });

  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      type: "car",
      registrationNumber: "",
      color: "",
      mileage: null,
      finnUrl: "",
      notes: "",
      imageUrl: "",
    },
  });

  useEffect(() => {
    if (vehicle && !isNew) {
      form.reset({
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        type: vehicle.type as any,
        registrationNumber: vehicle.registrationNumber || "",
        color: vehicle.color || "",
        mileage: vehicle.mileage,
        finnUrl: vehicle.finnUrl || "",
        notes: vehicle.notes || "",
        imageUrl: vehicle.imageUrl || "",
      });
    }
  }, [vehicle, isNew, form]);

  const onSubmit = (data: VehicleFormValues) => {
    // Transform empty strings to null for optional URL fields
    const formattedData = {
      ...data,
      finnUrl: data.finnUrl || null,
      imageUrl: data.imageUrl || null,
      registrationNumber: data.registrationNumber || null,
      color: data.color || null,
      notes: data.notes || null,
    };

    if (isNew) {
      createMutation.mutate({ data: formattedData as any }, {
        onSuccess: (newVehicle) => {
          toast({ title: "Vehicle added successfully" });
          setLocation(`/vehicles/${newVehicle.id}`);
        },
        onError: () => {
          toast({ title: "Failed to add vehicle", variant: "destructive" });
        }
      });
    } else {
      updateMutation.mutate({ id: id!, data: formattedData as any }, {
        onSuccess: () => {
          toast({ title: "Vehicle updated successfully" });
          queryClient.invalidateQueries({ queryKey: getGetVehicleQueryKey(id!) });
          setLocation(`/vehicles/${id}`);
        },
        onError: () => {
          toast({ title: "Failed to update vehicle", variant: "destructive" });
        }
      });
    }
  };

  if (!isNew && isLoading) return <LoadingState message="Loading vehicle details..." />;
  if (!isNew && isError) return <ErrorState onRetry={() => window.location.reload()} />;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation(isNew ? "/vehicles" : `/vehicles/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{isNew ? "Add Vehicle" : "Edit Vehicle"}</h1>
          <p className="text-muted-foreground mt-1">Enter your vehicle's details below.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Vehicle Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0 p-4 border rounded-md bg-sidebar flex-1 cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 transition-colors">
                          <FormControl>
                            <RadioGroupItem value="car" className="sr-only" />
                          </FormControl>
                          <Car className="w-5 h-5 text-muted-foreground" />
                          <FormLabel className="font-normal cursor-pointer w-full">Car</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0 p-4 border rounded-md bg-sidebar flex-1 cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 transition-colors">
                          <FormControl>
                            <RadioGroupItem value="motorcycle" className="sr-only" />
                          </FormControl>
                          <Bike className="w-5 h-5 text-muted-foreground" />
                          <FormLabel className="font-normal cursor-pointer w-full">Motorcycle</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="make"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Make</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Porsche" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 911" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="registrationNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. AB12345" className="font-mono uppercase" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Silver" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mileage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mileage (km)</FormLabel>
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
              <CardTitle>Links & Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="finnUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Finn.no Listing URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.finn.no/..." type="url" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>Link to the original listing</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." type="url" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Chassis numbers, key codes, special traits..." className="min-h-[100px]" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => setLocation(isNew ? "/vehicles" : `/vehicles/${id}`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Vehicle
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
