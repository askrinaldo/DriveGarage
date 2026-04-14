import { Link, useLocation, useParams } from "wouter";
import { 
  useGetVehicle, 
  getGetVehicleQueryKey,
  useListServiceRecords,
  getListServiceRecordsQueryKey,
  useListReceipts,
  getListReceiptsQueryKey,
  useDeleteVehicle,
  useDeleteServiceRecord,
  useDeleteReceipt
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Car, 
  Bike, 
  Gauge, 
  ExternalLink, 
  Wrench, 
  Receipt,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  FileText
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const categoryColors: Record<string, string> = {
  "oil-change": "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30",
  "brakes": "bg-red-500/20 text-red-500 hover:bg-red-500/30",
  "tires": "bg-gray-500/20 text-gray-500 hover:bg-gray-500/30",
  "engine": "bg-orange-500/20 text-orange-500 hover:bg-orange-500/30",
  "electrical": "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30",
  "bodywork": "bg-purple-500/20 text-purple-500 hover:bg-purple-500/30",
  "other": "bg-slate-500/20 text-slate-500 hover:bg-slate-500/30",
};

export default function VehicleDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const id = parseInt(params.id!);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: vehicle, isLoading: vehicleLoading, isError: vehicleError } = useGetVehicle(id, {
    query: { enabled: !!id, queryKey: getGetVehicleQueryKey(id) }
  });

  const { data: services, isLoading: servicesLoading } = useListServiceRecords(id, {
    query: { enabled: !!id, queryKey: getListServiceRecordsQueryKey(id) }
  });

  const { data: receipts, isLoading: receiptsLoading } = useListReceipts(id, {
    query: { enabled: !!id, queryKey: getListReceiptsQueryKey(id) }
  });

  const deleteVehicle = useDeleteVehicle();
  const deleteService = useDeleteServiceRecord();
  const deleteReceipt = useDeleteReceipt();

  if (vehicleLoading) return <LoadingState message="Loading vehicle..." />;
  if (vehicleError || !vehicle) return <ErrorState onRetry={() => window.location.reload()} />;

  const handleDeleteVehicle = () => {
    deleteVehicle.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Vehicle deleted" });
        setLocation("/vehicles");
      },
      onError: () => {
        toast({ title: "Failed to delete vehicle", variant: "destructive" });
      }
    });
  };

  const handleDeleteService = (serviceId: number) => {
    deleteService.mutate({ id: serviceId }, {
      onSuccess: () => {
        toast({ title: "Service record deleted" });
        queryClient.invalidateQueries({ queryKey: getListServiceRecordsQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Failed to delete record", variant: "destructive" });
      }
    });
  };

  const handleDeleteReceipt = (receiptId: number) => {
    deleteReceipt.mutate({ id: receiptId }, {
      onSuccess: () => {
        toast({ title: "Receipt deleted" });
        queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Failed to delete receipt", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/vehicles")} className="shrink-0 mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              {vehicle.registrationNumber && (
                <Badge variant="secondary" className="font-mono bg-sidebar text-sidebar-foreground text-sm px-2 py-0.5">
                  {vehicle.registrationNumber}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
              <div className="flex items-center gap-1.5">
                {vehicle.type === "motorcycle" ? <Bike className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                <span className="capitalize">{vehicle.type}</span>
              </div>
              {vehicle.mileage && (
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-4 h-4" />
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          {vehicle.finnUrl && (
            <Button variant="outline" asChild>
              <a href={vehicle.finnUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Finn.no
              </a>
            </Button>
          )}
          <Link href={`/vehicles/${id}/edit`}>
            <Button variant="outline">
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this vehicle? This will permanently remove the vehicle, all its service records, and receipts.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteVehicle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {vehicle.notes && (
        <Card className="bg-card">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Notes</h3>
            <p className="text-sm whitespace-pre-wrap">{vehicle.notes}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="service" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="service">Service History</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="service" className="mt-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Service Timeline</h2>
            <Link href={`/vehicles/${id}/service/new`}>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Service</Button>
            </Link>
          </div>

          {servicesLoading ? (
            <LoadingState message="Loading records..." />
          ) : !services || services.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No service records"
              description="Start building the maintenance history for this vehicle."
              action={
                <Link href={`/vehicles/${id}/service/new`}>
                  <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Add Record</Button>
                </Link>
              }
            />
          ) : (
            <div className="relative border-l border-border ml-3 md:ml-4 space-y-8 pb-8">
              {services.map((service) => (
                <div key={service.id} className="relative pl-6 md:pl-8">
                  <div className="absolute w-3 h-3 bg-primary rounded-full -left-[6.5px] top-2 border-2 border-background" />
                  <Card className="bg-card hover-elevate transition-all">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={categoryColors[service.category] || "bg-secondary"}>
                              {service.category.replace("-", " ")}
                            </Badge>
                            <span className="text-sm font-medium flex items-center text-muted-foreground">
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              {format(new Date(service.serviceDate), "MMM d, yyyy")}
                            </span>
                            {service.mileageAtService && (
                              <span className="text-sm font-medium flex items-center text-muted-foreground font-mono">
                                <Gauge className="w-3.5 h-3.5 mr-1" />
                                {service.mileageAtService.toLocaleString()} km
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold">{service.title}</h3>
                          {service.description && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{service.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm mt-4 pt-4 border-t border-border/50">
                            {service.performedBy && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Wrench className="w-3.5 h-3.5" />
                                <span>{service.performedBy}</span>
                              </div>
                            )}
                            {service.cost !== null && (
                              <div className="flex items-center gap-1.5 font-mono font-medium">
                                <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                                ${service.cost.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 md:flex-col">
                          <Link href={`/vehicles/${id}/service/${service.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Pencil className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive">
                                <Trash2 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Record</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this service record?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteService(service.id)} className="bg-destructive text-destructive-foreground">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="receipts" className="mt-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Receipts & Invoices</h2>
            <Link href={`/vehicles/${id}/receipts/new`}>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Add Receipt</Button>
            </Link>
          </div>

          {receiptsLoading ? (
            <LoadingState message="Loading receipts..." />
          ) : !receipts || receipts.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No receipts found"
              description="Keep track of parts and service invoices here."
              action={
                <Link href={`/vehicles/${id}/receipts/new`}>
                  <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Add Receipt</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {receipts.map((receipt) => (
                <Card key={receipt.id} className="bg-card">
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold">{receipt.title}</div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 -mt-2 hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this receipt?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteReceipt(receipt.id)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(receipt.receiptDate), "MMM d, yyyy")}
                      {receipt.vendor && (
                        <>
                          <span>•</span>
                          <span>{receipt.vendor}</span>
                        </>
                      )}
                    </div>
                    {receipt.notes && (
                      <p className="text-sm text-muted-foreground mb-4 flex-1">{receipt.notes}</p>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                      {receipt.fileUrl ? (
                        <Button variant="link" className="h-auto p-0" asChild>
                          <a href={receipt.fileUrl} target="_blank" rel="noopener noreferrer">
                            <FileText className="w-4 h-4 mr-1.5" />
                            View File
                          </a>
                        </Button>
                      ) : (
                        <div /> // Spacer
                      )}
                      {receipt.amount !== null && (
                        <div className="font-mono font-bold text-lg">
                          ${receipt.amount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
