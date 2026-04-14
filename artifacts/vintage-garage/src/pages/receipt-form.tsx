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
import { ArrowLeft, Save } from "lucide-react";
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
  title: z.string().min(1, "Title is required"),
  amount: z.coerce.number().min(0).optional().nullable(),
  receiptDate: z.string().min(1, "Date is required"),
  vendor: z.string().optional().nullable(),
  fileUrl: z.string().url("Must be a valid URL").optional().nullable().or(z.literal('')),
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
      notes: "",
    },
  });

  const onSubmit = (data: ReceiptFormValues) => {
    const formattedData = {
      ...data,
      vendor: data.vendor || null,
      fileUrl: data.fileUrl || null,
      notes: data.notes || null,
      receiptDate: new Date(data.receiptDate).toISOString(),
    };

    createMutation.mutate({ vehicleId, data: formattedData as any }, {
      onSuccess: () => {
        toast({ title: "Receipt added successfully" });
        queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey(vehicleId) });
        setLocation(`/vehicles/${vehicleId}`);
      },
      onError: () => {
        toast({ title: "Failed to add receipt", variant: "destructive" });
      }
    });
  };

  if (vehicleLoading) return <LoadingState message="Loading details..." />;

  const isPending = createMutation.isPending;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation(`/vehicles/${vehicleId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Receipt</h1>
          <p className="text-muted-foreground mt-1">For {vehicle?.year} {vehicle?.make} {vehicle?.model}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Receipt Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item / Service</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Brake pads" {...field} />
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
                      <FormLabel>Vendor / Store</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Pelican Parts" {...field} value={field.value || ''} />
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
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fileUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." type="url" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormDescription>Link to an image or PDF of the receipt</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Part numbers, warranties..." {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                  Save Receipt
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
