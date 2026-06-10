import { useState, useEffect, useMemo } from "react";
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
import { useTranslation } from "react-i18next";

type VehicleFormValues = {
  make: string;
  model: string;
  year: number;
  type: "car" | "motorcycle";
  registrationNumber?: string | null;
  color?: string | null;
  mileage?: number | null;
  finnUrl?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
};

export default function VehicleForm() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const params = useParams();
  const isNew = !params.id || params.id === "new";
  const id = isNew ? undefined : parseInt(params.id!);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const vehicleSchema = useMemo(() => z.object({
    make: z.string().min(1, t("vehicleForm.makeRequired")),
    model: z.string().min(1, t("vehicleForm.modelRequired")),
    year: z.coerce.number().min(1886, t("vehicleForm.invalidYear")).max(new Date().getFullYear() + 1, t("vehicleForm.invalidYear")),
    type: z.enum(["car", "motorcycle"]),
    registrationNumber: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    mileage: z.coerce.number().min(0).optional().nullable(),
    finnUrl: z.string().url(t("vehicleForm.invalidUrl")).optional().nullable().or(z.literal('')),
    notes: z.string().optional().nullable(),
    imageUrl: z.string().url(t("vehicleForm.invalidUrl")).optional().nullable().or(z.literal('')),
  }), [t]);

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
        type: vehicle.type as "car" | "motorcycle",
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
          toast({ title: t("vehicleForm.addedSuccess") });
          setLocation(`/vehicles/${newVehicle.id}`);
        },
        onError: () => {
          toast({ title: t("vehicleForm.addError"), variant: "destructive" });
        }
      });
    } else {
      updateMutation.mutate({ id: id!, data: formattedData as any }, {
        onSuccess: () => {
          toast({ title: t("vehicleForm.updatedSuccess") });
          queryClient.invalidateQueries({ queryKey: getGetVehicleQueryKey(id!) });
          setLocation(`/vehicles/${id}`);
        },
        onError: () => {
          toast({ title: t("vehicleForm.updateError"), variant: "destructive" });
        }
      });
    }
  };

  if (!isNew && isLoading) return <LoadingState message={t("vehicleForm.loadingDetails")} />;
  if (!isNew && isError) return <ErrorState onRetry={() => window.location.reload()} />;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation(isNew ? "/vehicles" : `/vehicles/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isNew ? t("vehicleForm.addTitle") : t("vehicleForm.editTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("vehicleForm.subtitle")}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>{t("vehicleForm.basicInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>{t("vehicleForm.vehicleType")}</FormLabel>
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
                          <FormLabel className="font-normal cursor-pointer w-full">{t("vehicleForm.car")}</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0 p-4 border rounded-md bg-sidebar flex-1 cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 transition-colors">
                          <FormControl>
                            <RadioGroupItem value="motorcycle" className="sr-only" />
                          </FormControl>
                          <Bike className="w-5 h-5 text-muted-foreground" />
                          <FormLabel className="font-normal cursor-pointer w-full">{t("vehicleForm.motorcycle")}</FormLabel>
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
                      <FormLabel>{t("vehicleForm.year")}</FormLabel>
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
                      <FormLabel>{t("vehicleForm.make")}</FormLabel>
                      <FormControl>
                        <Input placeholder="f.eks. Porsche" {...field} />
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
                      <FormLabel>{t("vehicleForm.model")}</FormLabel>
                      <FormControl>
                        <Input placeholder="f.eks. 911" {...field} />
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
                      <FormLabel>{t("vehicleForm.regNumber")}</FormLabel>
                      <FormControl>
                        <Input placeholder="f.eks. AB12345" className="font-mono uppercase" {...field} value={field.value || ''} />
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
                      <FormLabel>{t("vehicleForm.color")}</FormLabel>
                      <FormControl>
                        <Input placeholder="f.eks. Sølv" {...field} value={field.value || ''} />
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
                      <FormLabel>{t("vehicleForm.mileage")}</FormLabel>
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
              <CardTitle>{t("vehicleForm.linksNotes")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="finnUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("vehicleForm.finnUrl")}</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.finn.no/..." type="url" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>{t("vehicleForm.finnUrlDesc")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("vehicleForm.imageUrl")}</FormLabel>
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
                    <FormLabel>{t("vehicleForm.notes")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("vehicleForm.notesPlaceholder")} className="min-h-[100px]" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => setLocation(isNew ? "/vehicles" : `/vehicles/${id}`)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("common.saving") : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t("vehicleForm.saveBtn")}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
