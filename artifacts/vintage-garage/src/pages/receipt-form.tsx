import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useCreateReceipt,
  getListReceiptsQueryKey,
  useGetVehicle
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Camera, Save } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { format } from "date-fns";

const receiptSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd"),
  amount: z.coerce.number().min(0).optional().nullable(),
  receiptDate: z.string().min(1, "Dato er påkrevd"),
  vendor: z.string().optional().nullable(),
  fileUrl: z.string().url("Må være en gyldig URL").optional().nullable().or(z.literal('')),
  imageUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type ReceiptFormValues = z.infer<typeof receiptSchema>;

export default function ReceiptForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const vehicleId = parseInt(params.id!);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vehicle, isLoading: vehicleLoading } = useGetVehicle(vehicleId, {
    query: { enabled: !!vehicleId }
  });

  const createMutation = useCreateReceipt();

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      title: "",
      amount: null,
      receiptDate: format(new Date(), "yyyy-MM-dd"),
      vendor: "",
      fileUrl: "",
      imageUrl: "",
      notes: "",
    },
  });

  const onSubmit = (data: ReceiptFormValues) => {
    const formattedData = {
      ...data,
      vendor: data.vendor || null,
      fileUrl: data.fileUrl || null,
      imageUrl: data.imageUrl || null,
      notes: data.notes || null,
      receiptDate: new Date(data.receiptDate).toISOString(),
    };

    createMutation.mutate({ vehicleId, data: formattedData as any }, {
      onSuccess: () => {
        toast({ title: "Kvittering lagt til" });
        queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey(vehicleId) });
        setLocation(`/vehicles/${vehicleId}`);
      },
      onError: () => {
        toast({ title: "Kunne ikke legge til kvittering", variant: "destructive" });
      }
    });
  };

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app we would upload the file to a server/storage here.
      // For this demo, we create a local object URL to display the thumbnail,
      // but note that this URL will not persist across reloads.
      const url = URL.createObjectURL(file);
      form.setValue("imageUrl", url);
      toast({ title: "Bilde lagt til" });
    }
  };

  if (vehicleLoading) return <LoadingState message="Laster detaljer..." />;

  const isPending = createMutation.isPending;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation(`/vehicles/${vehicleId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ny kvittering</h1>
          <p className="text-muted-foreground mt-1">For {vehicle?.year} {vehicle?.make} {vehicle?.model}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Kvitteringsdetaljer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gjenstand / Tjeneste</FormLabel>
                      <FormControl>
                        <Input placeholder="f.eks. Bremseklosser" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leverandør / Butikk</FormLabel>
                      <FormControl>
                        <Input placeholder="f.eks. Biltema" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="receiptDate"
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
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beløp (kr)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <FormLabel>Skann kvittering (Valgfritt)</FormLabel>
                <div className="flex items-center gap-4">
                  <Button type="button" variant="outline" className="relative overflow-hidden">
                    <Camera className="w-4 h-4 mr-2" />
                    Ta bilde / Last opp
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={handleImageCapture}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </Button>
                </div>
                {form.watch("imageUrl") && (
                  <div className="mt-4">
                    <img 
                      src={form.watch("imageUrl")!} 
                      alt="Scanned receipt" 
                      className="w-32 h-32 object-cover rounded-md border"
                    />
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="fileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fil-URL (Alternativt)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." type="url" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>Lenke til en PDF eller et bilde av kvitteringen</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notater</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Delenummer, garanti..." {...field} value={field.value || ''} />
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
