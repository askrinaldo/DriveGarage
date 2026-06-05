import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { 
  useGetVehicle, 
  getGetVehicleQueryKey,
  useListServiceRecords,
  getListServiceRecordsQueryKey,
  useListReceipts,
  getListReceiptsQueryKey,
  useListTripLogs,
  getListTripLogsQueryKey,
  useDeleteVehicle,
  useDeleteServiceRecord,
  useDeleteReceipt,
  useDeleteTripLog,
  useExportVehicleData,
  getExportVehicleDataQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  FileText,
  Route,
  MapPin,
  Download,
  Copy,
  BookOpen,
  Bell,
  Sparkles,
  Printer,
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
import { nb } from "date-fns/locale";

const categoryTranslations: Record<string, string> = {
  "oil-change": "Oljeskift",
  "brakes": "Bremser",
  "tires": "Dekk",
  "engine": "Motor",
  "electrical": "Elektro",
  "bodywork": "Karosseri",
  "other": "Annet"
};

const categoryColors: Record<string, string> = {
  "oil-change": "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30",
  "brakes": "bg-red-500/20 text-red-500 hover:bg-red-500/30",
  "tires": "bg-gray-500/20 text-gray-500 hover:bg-gray-500/30",
  "engine": "bg-orange-500/20 text-orange-500 hover:bg-orange-500/30",
  "electrical": "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30",
  "bodywork": "bg-purple-500/20 text-purple-500 hover:bg-purple-500/30",
  "other": "bg-slate-500/20 text-slate-500 hover:bg-slate-500/30",
};

// Components for the maintenance map
const MaintenanceMap = ({ type, records }: { type: string, records: any[] }) => {
  const getAreaColor = (area: string) => {
    const areaRecords = records.filter(r => r.bodyArea === area);
    if (!areaRecords.length) return "fill-muted/20 stroke-muted/50";
    
    // Sort to get latest
    const latest = areaRecords.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0];
    
    const diffMonths = (new Date().getTime() - new Date(latest.serviceDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (diffMonths <= 12) return "fill-green-500/50 stroke-green-500 hover:fill-green-500/70";
    if (diffMonths <= 24) return "fill-yellow-500/50 stroke-yellow-500 hover:fill-yellow-500/70";
    return "fill-red-500/50 stroke-red-500 hover:fill-red-500/70";
  };

  const getAreaTitle = (area: string) => {
    const areaRecords = records.filter(r => r.bodyArea === area);
    if (!areaRecords.length) return "Aldri utført";
    const latest = areaRecords.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0];
    return `Sist: ${latest.title} (${format(new Date(latest.serviceDate), "dd.MM.yyyy")})`;
  };

  if (type === "motorcycle") {
    return (
      <svg viewBox="0 0 800 500" className="w-full h-full max-h-[400px]">
        {/* Motorcycle silhouette lines */}
        <path d="M 200,350 A 80 80 0 1 1 360,350 A 80 80 0 1 1 200,350" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 500,350 A 80 80 0 1 1 660,350 A 80 80 0 1 1 500,350" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 280,350 L 400,350 L 450,200 L 350,180 Z" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 580,350 L 500,200 L 450,200" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 350,180 L 320,120 L 250,150" fill="none" stroke="currentColor" strokeWidth="4" />
        
        {/* Hotspots */}
        <g className="cursor-pointer transition-colors group">
          <circle cx="280" cy="350" r="40" className={getAreaColor("rear-wheel")} />
          <title>Bakhjul - {getAreaTitle("rear-wheel")}</title>
        </g>
        <g className="cursor-pointer transition-colors">
          <circle cx="580" cy="350" r="40" className={getAreaColor("front-wheel")} />
          <title>Forhjul - {getAreaTitle("front-wheel")}</title>
        </g>
        <g className="cursor-pointer transition-colors">
          <rect x="370" y="240" width="80" height="90" rx="10" className={getAreaColor("engine")} />
          <title>Motor - {getAreaTitle("engine")}</title>
        </g>
        <g className="cursor-pointer transition-colors">
          <path d="M 370,320 L 250,330 L 250,350 L 370,340 Z" className={getAreaColor("exhaust")} />
          <title>Eksos - {getAreaTitle("exhaust")}</title>
        </g>
        <g className="cursor-pointer transition-colors">
          <circle cx="610" cy="350" r="20" className={getAreaColor("brakes-front")} />
          <title>Bremser foran - {getAreaTitle("brakes-front")}</title>
        </g>
        <g className="cursor-pointer transition-colors">
          <circle cx="250" cy="350" r="20" className={getAreaColor("brakes-rear")} />
          <title>Bremser bak - {getAreaTitle("brakes-rear")}</title>
        </g>
        <g className="cursor-pointer transition-colors">
          <path d="M 580,350 L 500,200 L 520,190 L 600,340 Z" className={getAreaColor("suspension-front")} />
          <title>Demping foran - {getAreaTitle("suspension-front")}</title>
        </g>
        <g className="cursor-pointer transition-colors">
          <path d="M 280,350 L 380,240 L 400,250 L 300,360 Z" className={getAreaColor("suspension-rear")} />
          <title>Demping bak - {getAreaTitle("suspension-rear")}</title>
        </g>
        <g className="cursor-pointer transition-colors">
          <rect x="360" y="190" width="80" height="40" rx="5" className={getAreaColor("electrical")} />
          <title>Elektro - {getAreaTitle("electrical")}</title>
        </g>
        <g className="cursor-pointer transition-colors">
          <path d="M 280,350 L 400,350 L 450,200 L 350,180 Z" fill="transparent" strokeWidth="10" className={getAreaColor("frame")} />
          <title>Ramme - {getAreaTitle("frame")}</title>
        </g>
      </svg>
    );
  }

  // Simplified car
  return (
    <svg viewBox="0 0 800 400" className="w-full h-full max-h-[300px]">
      <path d="M 150,250 A 60 60 0 1 1 270,250 A 60 60 0 1 1 150,250" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M 530,250 A 60 60 0 1 1 650,250 A 60 60 0 1 1 530,250" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M 100,250 L 50,250 L 50,180 L 200,120 L 500,120 L 700,180 L 750,250 L 700,250" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M 270,250 L 530,250" fill="none" stroke="currentColor" strokeWidth="4" />
      
      <g className="cursor-pointer transition-colors">
        <circle cx="210" cy="250" r="40" className={getAreaColor("rear-wheel")} />
        <title>Bakhjul - {getAreaTitle("rear-wheel")}</title>
      </g>
      <g className="cursor-pointer transition-colors">
        <circle cx="590" cy="250" r="40" className={getAreaColor("front-wheel")} />
        <title>Forhjul - {getAreaTitle("front-wheel")}</title>
      </g>
      <g className="cursor-pointer transition-colors">
        <rect x="580" y="160" width="100" height="60" rx="10" className={getAreaColor("engine")} />
        <title>Motor - {getAreaTitle("engine")}</title>
      </g>
      <g className="cursor-pointer transition-colors">
        <path d="M 50,240 L 200,240" strokeWidth="8" className={getAreaColor("exhaust")} />
        <title>Eksos - {getAreaTitle("exhaust")}</title>
      </g>
      <g className="cursor-pointer transition-colors">
        <circle cx="620" cy="250" r="20" className={getAreaColor("brakes-front")} />
        <title>Bremser foran - {getAreaTitle("brakes-front")}</title>
      </g>
      <g className="cursor-pointer transition-colors">
        <circle cx="180" cy="250" r="20" className={getAreaColor("brakes-rear")} />
        <title>Bremser bak - {getAreaTitle("brakes-rear")}</title>
      </g>
    </svg>
  );
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

  const { data: trips, isLoading: tripsLoading } = useListTripLogs(id, {
    query: { enabled: !!id, queryKey: getListTripLogsQueryKey(id) }
  });

  const { data: exportData, refetch: refetchExport } = useExportVehicleData(id, {
    query: { enabled: !!id, queryKey: getExportVehicleDataQueryKey(id) }
  });

  const deleteVehicle = useDeleteVehicle();
  const deleteService = useDeleteServiceRecord();
  const deleteReceipt = useDeleteReceipt();
  const deleteTrip = useDeleteTripLog();

  if (vehicleLoading) return <LoadingState message="Laster kjøretøy..." />;
  if (vehicleError || !vehicle) return <ErrorState onRetry={() => window.location.reload()} />;

  const totalTripKm = trips?.reduce((sum, t) => sum + (t.distanceKm || 0), 0) || 0;

  const handleDeleteVehicle = () => {
    deleteVehicle.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Kjøretøy slettet" });
        setLocation("/vehicles");
      },
      onError: () => {
        toast({ title: "Kunne ikke slette kjøretøy", variant: "destructive" });
      }
    });
  };

  const handleDeleteService = (serviceId: number) => {
    deleteService.mutate({ id: serviceId }, {
      onSuccess: () => {
        toast({ title: "Servicepost slettet" });
        queryClient.invalidateQueries({ queryKey: getListServiceRecordsQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Kunne ikke slette post", variant: "destructive" });
      }
    });
  };

  const handleDeleteReceipt = (receiptId: number) => {
    deleteReceipt.mutate({ id: receiptId }, {
      onSuccess: () => {
        toast({ title: "Kvittering slettet" });
        queryClient.invalidateQueries({ queryKey: getListReceiptsQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Kunne ikke slette kvittering", variant: "destructive" });
      }
    });
  };

  const handleDeleteTrip = (tripId: number) => {
    deleteTrip.mutate({ id: tripId }, {
      onSuccess: () => {
        toast({ title: "Tur slettet" });
        queryClient.invalidateQueries({ queryKey: getListTripLogsQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Kunne ikke slette tur", variant: "destructive" });
      }
    });
  };

  const handleDownloadExport = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vintage-garage-${vehicle.make}-${vehicle.model}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyExport = () => {
    if (!exportData) return;
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    toast({ title: "Kopiert til utklippstavle" });
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
                <span className="capitalize">{vehicle.type === 'car' ? 'Bil' : 'Motorsykkel'}</span>
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
              {totalTripKm > 0 && (
                <div className="flex items-center gap-1.5 text-primary">
                  <Route className="w-4 h-4" />
                  <span className="font-mono">{totalTripKm.toLocaleString()} km kjørt totalt</span>
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
          <Link href={`/vehicles/${id}/reminders`}>
            <Button variant="outline" size="icon" title="Servicepåminnelser">
              <Bell className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/vehicles/${id}/ai-advice`}>
            <Button variant="outline" size="icon" title="AI vedlikeholdsanbefaling">
              <Sparkles className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/vehicles/${id}/print`}>
            <Button variant="outline" size="icon" title="Skriv ut servicebok (PDF)">
              <Printer className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/vehicles/${id}/edit`}>
            <Button variant="outline">
              <Pencil className="w-4 h-4 mr-2" />
              Rediger
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
                <AlertDialogTitle>Slett kjøretøy</AlertDialogTitle>
                <AlertDialogDescription>
                  Er du sikker på at du vil slette dette kjøretøyet? Dette vil permanent fjerne kjøretøyet, all servicehistorikk og kvitteringer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteVehicle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Slett
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {vehicle.notes && (
        <Card className="bg-card">
          <CardContent className="pt-6">
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Notater</h3>
            <p className="text-sm whitespace-pre-wrap">{vehicle.notes}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="service" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto p-1 bg-muted/50 rounded-lg">
          <TabsTrigger value="service" className="py-2.5 text-xs md:text-sm">Servicehistorikk</TabsTrigger>
          <TabsTrigger value="trips" className="py-2.5 text-xs md:text-sm">Kjørebok</TabsTrigger>
          <TabsTrigger value="receipts" className="py-2.5 text-xs md:text-sm">Kvitteringer</TabsTrigger>
          <TabsTrigger value="manuals" className="py-2.5 text-xs md:text-sm">Manualer</TabsTrigger>
          <TabsTrigger value="map" className="py-2.5 text-xs md:text-sm">Vedlikeholdskart</TabsTrigger>
          <TabsTrigger value="export" className="py-2.5 text-xs md:text-sm">Selg data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="service" className="mt-6 space-y-4 animate-in fade-in-50 duration-500">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Tidslinje for service</h2>
            <Link href={`/vehicles/${id}/service/new`}>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Ny servicepost</Button>
            </Link>
          </div>

          {servicesLoading ? (
            <LoadingState message="Laster poster..." />
          ) : !services || services.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Ingen serviceposter"
              description="Begynn å bygge vedlikeholdshistorikk for dette kjøretøyet."
              action={
                <Link href={`/vehicles/${id}/service/new`}>
                  <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Legg til post</Button>
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
                              {categoryTranslations[service.category] || service.category}
                            </Badge>
                            <span className="text-sm font-medium flex items-center text-muted-foreground">
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              {format(new Date(service.serviceDate), "dd.MM.yyyy")}
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
                                kr {service.cost.toLocaleString()}
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
                                <AlertDialogTitle>Slett post</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Er du sikker på at du vil slette denne serviceposten?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteService(service.id)} className="bg-destructive text-destructive-foreground">
                                  Slett
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

        <TabsContent value="trips" className="mt-6 space-y-4 animate-in fade-in-50 duration-500">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Kjørebok</h2>
            <Link href={`/vehicles/${id}/trips/new`}>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Logg tur</Button>
            </Link>
          </div>

          {tripsLoading ? (
            <LoadingState message="Laster turer..." />
          ) : !trips || trips.length === 0 ? (
            <EmptyState
              icon={Route}
              title="Ingen turer logget"
              description="Hold oversikt over kilometer og drivstoffbruk her."
              action={
                <Link href={`/vehicles/${id}/trips/new`}>
                  <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Logg ny tur</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4">
              {trips.map((trip) => (
                <Card key={trip.id} className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-bold">{trip.fromLocation} → {trip.toLocation}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/vehicles/${id}/trips/${trip.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Slett tur</AlertDialogTitle>
                              <AlertDialogDescription>
                                Er du sikker på at du vil slette denne turen?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTrip(trip.id)} className="bg-destructive text-destructive-foreground">
                                Slett
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(trip.tripDate), "dd.MM.yyyy")}
                      </div>
                      {trip.distanceKm && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <Route className="w-3.5 h-3.5" />
                          {trip.distanceKm} km
                        </div>
                      )}
                      {trip.fuelUsedLiters && (
                        <div className="flex items-center gap-1.5 font-mono">
                          L/mil: {((trip.fuelUsedLiters / (trip.distanceKm || 1)) * 10).toFixed(2)}
                        </div>
                      )}
                      {trip.weather && (
                        <div className="hidden sm:block">
                          {trip.weather}
                        </div>
                      )}
                    </div>
                    {trip.notes && (
                      <p className="text-sm border-t border-border/50 pt-3 text-muted-foreground">{trip.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="receipts" className="mt-6 space-y-4 animate-in fade-in-50 duration-500">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Kvitteringer & Fakturaer</h2>
            <Link href={`/vehicles/${id}/receipts/new`}>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Ny kvittering</Button>
            </Link>
          </div>

          {receiptsLoading ? (
            <LoadingState message="Laster kvitteringer..." />
          ) : !receipts || receipts.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Ingen kvitteringer funnet"
              description="Hold oversikt over deler og servicefakturaer her."
              action={
                <Link href={`/vehicles/${id}/receipts/new`}>
                  <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Ny kvittering</Button>
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
                            <AlertDialogTitle>Slett kvittering</AlertDialogTitle>
                            <AlertDialogDescription>
                              Er du sikker på at du vil slette denne kvitteringen?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Avbryt</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteReceipt(receipt.id)} className="bg-destructive text-destructive-foreground">
                              Slett
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(receipt.receiptDate), "dd.MM.yyyy")}
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
                    
                    {receipt.imageUrl && (
                      <div className="mt-2 mb-4">
                        <img src={receipt.imageUrl} alt="Receipt" className="w-full h-32 object-cover rounded-md border border-border" />
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                      {receipt.fileUrl ? (
                        <Button variant="link" className="h-auto p-0" asChild>
                          <a href={receipt.fileUrl} target="_blank" rel="noopener noreferrer">
                            <FileText className="w-4 h-4 mr-1.5" />
                            Vis Fil
                          </a>
                        </Button>
                      ) : (
                        <div /> // Spacer
                      )}
                      {receipt.amount !== null && (
                        <div className="font-mono font-bold text-lg">
                          kr {receipt.amount.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="manuals" className="mt-6 space-y-4 animate-in fade-in-50 duration-500">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Manualer og ressurser</CardTitle>
              <CardDescription>Søk etter original servicemanual for {vehicle.make} {vehicle.model} {vehicle.year}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button variant="outline" className="justify-start h-14" asChild>
                  <a href={`https://www.haynes.com/en-us/search?q=${vehicle.make}+${vehicle.model}`} target="_blank" rel="noopener noreferrer">
                    <BookOpen className="w-5 h-5 mr-3 text-primary" />
                    <div className="flex flex-col items-start">
                      <span>Haynes Manuals</span>
                      <span className="text-xs font-normal text-muted-foreground">Søk etter reparasjonsmanual</span>
                    </div>
                  </a>
                </Button>
                
                {vehicle.type === "motorcycle" && (
                  <Button variant="outline" className="justify-start h-14" asChild>
                    <a href={`https://www.bikez.com/motorcycles/${vehicle.make.toLowerCase()}_${vehicle.model.toLowerCase().replace(/ /g, '_')}.php`} target="_blank" rel="noopener noreferrer">
                      <Bike className="w-5 h-5 mr-3 text-primary" />
                      <div className="flex flex-col items-start">
                        <span>Bikez.com</span>
                        <span className="text-xs font-normal text-muted-foreground">Spesifikasjoner og data</span>
                      </div>
                    </a>
                  </Button>
                )}

                <Button variant="outline" className="justify-start h-14" asChild>
                  <a href="https://www.mc-manualen.no" target="_blank" rel="noopener noreferrer">
                    <FileText className="w-5 h-5 mr-3 text-primary" />
                    <div className="flex flex-col items-start">
                      <span>MC-Manualen</span>
                      <span className="text-xs font-normal text-muted-foreground">Norsk ressurs</span>
                    </div>
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="mt-6 space-y-4 animate-in fade-in-50 duration-500">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Vedlikeholdskart</CardTitle>
              <CardDescription>Visuell oversikt over utført vedlikehold. Grønn = siste år, Gul = 1-2 år, Rød = over 2 år.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center bg-sidebar/50 rounded-xl p-8 border border-border">
                {services && <MaintenanceMap type={vehicle.type} records={services} />}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="mt-6 space-y-4 animate-in fade-in-50 duration-500">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Selg kjøretøydata</CardTitle>
              <CardDescription>Del denne filen med neste eier slik at de kan importere full servicehistorikk.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {exportData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Serviceposter</div>
                    <div className="text-xl font-bold">{exportData.serviceRecords.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Totalt brukt</div>
                    <div className="text-xl font-bold">kr {exportData.totalServiceCost.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Antall turer</div>
                    <div className="text-xl font-bold">{exportData.tripLogs.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Totalt kjørt</div>
                    <div className="text-xl font-bold">{exportData.totalTripKm.toLocaleString()} km</div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleDownloadExport} className="flex-1" size="lg">
                  <Download className="w-5 h-5 mr-2" />
                  Last ned data (JSON)
                </Button>
                <Button variant="outline" onClick={handleCopyExport} className="flex-1" size="lg">
                  <Copy className="w-5 h-5 mr-2" />
                  Kopier til utklippstavle
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
