import { useState, useEffect, useMemo } from "react";
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
  getListVehiclesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { VehicleDetailSkeleton, ErrorState, EmptyState, LoadingState } from "@/components/ui-states";
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
  BookOpen,
  Bell,
  Sparkles,
  Printer,
  SendHorizontal,
  History,
  Users,
  Check,
  X,
  Clock,
  Loader2,
  TrendingUp,
  Image,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserAuth } from "@/hooks/use-user-auth";
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
  "other": "Annet",
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

const categoryDotColors: Record<string, string> = {
  "oil-change": "bg-yellow-500",
  "brakes": "bg-red-500",
  "tires": "bg-gray-400",
  "engine": "bg-orange-500",
  "electrical": "bg-blue-500",
  "bodywork": "bg-purple-500",
  "other": "bg-slate-500",
};

const MaintenanceMap = ({ type, records }: { type: string, records: { serviceDate: string; bodyArea?: string | null; title: string }[] }) => {
  const getAreaColor = (area: string) => {
    const areaRecords = records.filter(r => r.bodyArea === area);
    if (!areaRecords.length) return "fill-muted/20 stroke-muted/50";
    const latest = areaRecords.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0];
    const diffMonths = (new Date().getTime() - new Date(latest!.serviceDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (diffMonths <= 12) return "fill-green-500/50 stroke-green-500 hover:fill-green-500/70";
    if (diffMonths <= 24) return "fill-yellow-500/50 stroke-yellow-500 hover:fill-yellow-500/70";
    return "fill-red-500/50 stroke-red-500 hover:fill-red-500/70";
  };

  const getAreaTitle = (area: string) => {
    const areaRecords = records.filter(r => r.bodyArea === area);
    if (!areaRecords.length) return "Aldri utført";
    const latest = areaRecords.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0]!;
    return `Sist: ${latest.title} (${format(new Date(latest.serviceDate), "dd.MM.yyyy")})`;
  };

  if (type === "motorcycle") {
    return (
      <svg viewBox="0 0 800 500" className="w-full h-full max-h-[400px]">
        <path d="M 200,350 A 80 80 0 1 1 360,350 A 80 80 0 1 1 200,350" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 500,350 A 80 80 0 1 1 660,350 A 80 80 0 1 1 500,350" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 280,350 L 400,350 L 450,200 L 350,180 Z" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 580,350 L 500,200 L 450,200" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 350,180 L 320,120 L 250,150" fill="none" stroke="currentColor" strokeWidth="4" />
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
  const { isAuthenticated, token: userToken } = useUserAuth();

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState<{
    id: number; transferCode: string; transferToken: string;
    toEmail: string; expiresAt: string; status: string;
  } | null>(null);
  const [cancellingTransfer, setCancellingTransfer] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [ownershipHistory, setOwnershipHistory] = useState<{
    id: number; userName: string; userEmail: string;
    fromDate: string; toDate: string | null; consentToShow: boolean;
  }[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    if (!id || !isAuthenticated || !userToken) return;
    void (async () => {
      const res = await fetch(`/api/vehicles/${id}/transfer`, {
        headers: { "x-user-token": userToken },
      });
      if (res.ok) {
        const data = await res.json() as typeof pendingTransfer;
        setPendingTransfer(data);
      }
    })();
  }, [id, isAuthenticated, userToken]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const res = await fetch(`/api/vehicles/${id}/ownership-history`);
      if (res.ok) {
        const data = await res.json() as typeof ownershipHistory;
        setOwnershipHistory(data);
      }
    })();
  }, [id]);

  const handleCreateTransfer = async () => {
    if (!transferEmail.trim() || !userToken) return;
    setSubmittingTransfer(true);
    const res = await fetch(`/api/vehicles/${id}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-token": userToken },
      body: JSON.stringify({ toEmail: transferEmail.trim() }),
    });
    const json = await res.json() as { id?: number; transferCode?: string; transferToken?: string; toEmail?: string; expiresAt?: string; status?: string; error?: string };
    setSubmittingTransfer(false);
    if (!res.ok) {
      toast({ title: "Feil", description: json.error ?? "Overføring feilet", variant: "destructive" });
      return;
    }
    setPendingTransfer({ id: json.id!, transferCode: json.transferCode!, transferToken: json.transferToken!, toEmail: json.toEmail!, expiresAt: json.expiresAt!, status: json.status! });
    setTransferEmail("");
    toast({ title: "Overføring opprettet", description: `Kode sendt til ${json.toEmail}` });
  };

  const handleCancelTransfer = async () => {
    if (!userToken) return;
    setCancellingTransfer(true);
    const res = await fetch(`/api/vehicles/${id}/transfer`, {
      method: "DELETE",
      headers: { "x-user-token": userToken },
    });
    setCancellingTransfer(false);
    if (res.ok) {
      setPendingTransfer(null);
      toast({ title: "Overføring avbrutt" });
    }
  };

  const copyTransferLink = (transferToken: string) => {
    const url = `${window.location.origin}/vehicle-transfer/${transferToken}`;
    navigator.clipboard.writeText(url);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

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

  const deleteVehicle = useDeleteVehicle();
  const deleteService = useDeleteServiceRecord();
  const deleteReceipt = useDeleteReceipt();
  const deleteTrip = useDeleteTripLog();

  const categoryCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    (services ?? []).forEach(s => {
      map[s.category] = (map[s.category] ?? 0) + 1;
    });
    return map;
  }, [services]);

  if (vehicleLoading) return <VehicleDetailSkeleton />;
  if (vehicleError || !vehicle) return <ErrorState onRetry={() => window.location.reload()} />;

  const totalTripKm = trips?.reduce((sum, t) => sum + (t.distanceKm || 0), 0) || 0;

  const totalServiceCost = (services ?? []).reduce((sum, s) => sum + (s.cost ?? 0), 0);
  const totalReceiptAmount = (receipts ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0);

  const lastServiceDate = (() => {
    if (!services || services.length === 0) return null;
    return services.reduce<Date | null>((latest, s) => {
      const d = new Date(s.serviceDate);
      return !latest || d > latest ? d : latest;
    }, null);
  })();

  const filteredServices = (() => {
    if (!services) return [];
    if (activeCategory === "all") return services;
    return services.filter(s => s.category === activeCategory);
  })();

  const servicesByYear = (() => {
    const groups: Record<number, typeof filteredServices> = {};
    filteredServices.forEach(s => {
      const year = new Date(s.serviceDate).getFullYear();
      if (!groups[year]) groups[year] = [];
      groups[year]!.push(s);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, records]) => ({ year: Number(year), records: records! }));
  })();

  const handleDeleteVehicle = () => {
    deleteVehicle.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
        toast({ title: "Kjøretøy slettet" });
        setLocation("/vehicles");
      },
      onError: () => {
        toast({ title: "Kunne ikke slette kjøretøy", variant: "destructive" });
      }
    });
  };

  const handleDeleteService = (serviceId: number) => {
    deleteService.mutate({ vehicleId: id, id: serviceId }, {
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
    deleteReceipt.mutate({ vehicleId: id, id: receiptId }, {
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
    deleteTrip.mutate({ vehicleId: id, id: tripId }, {
      onSuccess: () => {
        toast({ title: "Tur slettet" });
        queryClient.invalidateQueries({ queryKey: getListTripLogsQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Kunne ikke slette tur", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 pb-24">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Row 1: back + title + actions */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button variant="outline" size="icon" onClick={() => setLocation("/vehicles")} className="shrink-0 mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h1>
                {vehicle.registrationNumber && (
                  <Badge variant="secondary" className="font-mono bg-sidebar text-sidebar-foreground text-sm px-2 py-0.5 shrink-0">
                    {vehicle.registrationNumber}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  {vehicle.type === "motorcycle" ? <Bike className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                  {vehicle.type === 'car' ? 'Bil' : 'Motorsykkel'}
                </span>
                {vehicle.mileage && (
                  <span className="flex items-center gap-1.5">
                    <Gauge className="w-4 h-4" />
                    <span className="font-mono">{vehicle.mileage.toLocaleString("nb-NO")} km</span>
                  </span>
                )}
                {vehicle.color && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full border border-border shrink-0" style={{ backgroundColor: vehicle.color }} />
                    <span className="capitalize">{vehicle.color}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons — scroll on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 pb-1">
            {vehicle.finnUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={vehicle.finnUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
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
            {isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTransfer(true)}
                className={pendingTransfer ? "border-amber-500/50 text-amber-400 shrink-0" : "shrink-0"}
                title="Overfør kjøretøy til ny eier"
              >
                <SendHorizontal className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">{pendingTransfer ? "Venter" : "Overfør"}</span>
              </Button>
            )}
            <Link href={`/vehicles/${id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Rediger</span>
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

        {/* Vehicle image hero (if available) */}
        {vehicle.imageUrl && (
          <div className="relative rounded-xl overflow-hidden h-52 md:h-64 border border-border/50">
            <img
              src={vehicle.imageUrl}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <span className="text-white/80 text-sm backdrop-blur-sm bg-black/30 px-3 py-1 rounded-full">
                {vehicle.year} · {vehicle.type === 'car' ? 'Bil' : 'Motorsykkel'}
              </span>
            </div>
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Serviceposter</div>
              <div className="text-lg font-bold">{services?.length ?? "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:border-amber-500/30 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Total kostnad</div>
              <div className="text-lg font-bold truncate">
                {totalServiceCost > 0
                  ? `kr ${Math.round(totalServiceCost).toLocaleString("nb-NO")}`
                  : "—"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:border-green-500/30 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <Route className="w-4 h-4 text-green-500" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Loggede km</div>
              <div className="text-lg font-bold">
                {totalTripKm > 0
                  ? `${totalTripKm.toLocaleString("nb-NO")} km`
                  : "—"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:border-blue-500/30 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Sist service</div>
              <div className="text-lg font-bold">
                {lastServiceDate ? format(lastServiceDate, "dd.MM.yy") : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {vehicle.notes && (
        <Card className="bg-card border-border/50">
          <CardContent className="pt-5 pb-5">
            <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Notater</h3>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{vehicle.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Transfer Modal */}
      <Dialog open={showTransfer} onOpenChange={setShowTransfer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SendHorizontal className="w-5 h-5 text-primary" />
              Overfør kjøretøy
            </DialogTitle>
            <DialogDescription>
              Overfør eierskap av {vehicle.year} {vehicle.make} {vehicle.model} til en annen bruker.
            </DialogDescription>
          </DialogHeader>

          {pendingTransfer ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-amber-400 font-medium">
                  <Clock className="w-4 h-4" />
                  Venter på aksept
                </div>
                <p className="text-sm text-muted-foreground">
                  Sendt til <strong>{pendingTransfer.toEmail}</strong>
                </p>
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground mb-1">Overføringskode</p>
                  <p className="text-3xl font-mono font-bold tracking-[0.3em] text-primary">{pendingTransfer.transferCode}</p>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Utløper: {new Date(pendingTransfer.expiresAt).toLocaleDateString("nb-NO")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => copyTransferLink(pendingTransfer.transferToken)}>
                  {codeCopied ? <><Check className="w-4 h-4 mr-2 text-emerald-400" />Kopiert!</> : <><Calendar className="w-4 h-4 mr-2" />Kopier lenke</>}
                </Button>
                <Button variant="destructive" onClick={() => void handleCancelTransfer()} disabled={cancellingTransfer}>
                  {cancellingTransfer ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                  Avbryt
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transfer-email">Mottakerens e-post</Label>
                <Input
                  id="transfer-email"
                  type="email"
                  placeholder="ny-eier@example.com"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleCreateTransfer(); }}
                />
                <p className="text-xs text-muted-foreground">
                  Mottakeren vil få en unik lenke og kode for å godta kjøretøyet.
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                <p>• Overføringen utløper etter 7 dager</p>
                <p>• Du kan avbryte overføringen når som helst</p>
                <p>• Servicehistorikk og dokumenter følger med</p>
              </div>
            </div>
          )}

          {!pendingTransfer && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransfer(false)}>Avbryt</Button>
              <Button onClick={() => void handleCreateTransfer()} disabled={submittingTransfer || !transferEmail.trim()}>
                {submittingTransfer ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Oppretter...</> : <><SendHorizontal className="w-4 h-4 mr-2" />Send overføring</>}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <Tabs defaultValue="service" className="w-full">
        {/* Scrollable tab list */}
        <TabsList className="flex w-full overflow-x-auto no-scrollbar h-auto p-1 bg-muted/50 rounded-lg gap-0.5 justify-start">
          <TabsTrigger value="service" className="shrink-0 py-2.5 text-xs md:text-sm whitespace-nowrap">
            Servicehistorikk
            {services && services.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
                {services.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="trips" className="shrink-0 py-2.5 text-xs md:text-sm whitespace-nowrap">Kjørebok</TabsTrigger>
          <TabsTrigger value="receipts" className="shrink-0 py-2.5 text-xs md:text-sm whitespace-nowrap">
            Kvitteringer
            {receipts && receipts.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
                {receipts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="manuals" className="shrink-0 py-2.5 text-xs md:text-sm whitespace-nowrap">Manualer</TabsTrigger>
          <TabsTrigger value="map" className="shrink-0 py-2.5 text-xs md:text-sm whitespace-nowrap">Vedlikeholdskart</TabsTrigger>
          <TabsTrigger value="owners" className="shrink-0 py-2.5 text-xs md:text-sm whitespace-nowrap">
            <Users className="w-3.5 h-3.5 mr-1" />
            Eiere
          </TabsTrigger>
          <TabsTrigger value="export" className="shrink-0 py-2.5 text-xs md:text-sm whitespace-nowrap">Eksport</TabsTrigger>
        </TabsList>

        {/* ── Service history ──────────────────────────────────── */}
        <TabsContent value="service" className="mt-6 space-y-5 animate-in fade-in-50 duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Servicehistorikk</h2>
            <Link href={`/vehicles/${id}/service/new`}>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Ny servicepost</Button>
            </Link>
          </div>

          {/* Category filter chips */}
          {services && services.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveCategory("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                Alle ({services.length})
              </button>
              {Object.entries(categoryTranslations).map(([key, label]) => {
                const count = categoryCountMap[key] ?? 0;
                if (!count) return null;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveCategory(key === activeCategory ? "all" : key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                      activeCategory === key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${categoryDotColors[key] ?? "bg-slate-500"}`} />
                    {label} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {servicesLoading ? (
            <LoadingState message="Laster servicehistorikk..." />
          ) : filteredServices.length === 0 && services && services.length > 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ingen poster i denne kategorien</p>
              <button onClick={() => setActiveCategory("all")} className="text-xs text-primary mt-2 underline underline-offset-2">
                Vis alle
              </button>
            </div>
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
            <div className="relative border-l border-border ml-3 md:ml-4 pb-8">
              {servicesByYear.map(({ year, records }) => (
                <div key={year} className="mb-2">
                  {/* Year divider */}
                  <div className="relative flex items-center gap-3 mb-6 mt-6 first:mt-0">
                    <div className="absolute -left-[13px] md:-left-[15px] w-6 h-6 bg-sidebar rounded-full flex items-center justify-center border-2 border-border z-10 shrink-0">
                      <span className="text-[9px] font-bold text-muted-foreground leading-none">{String(year).slice(2)}</span>
                    </div>
                    <div className="pl-6 flex items-center gap-3 flex-1">
                      <span className="text-sm font-bold text-muted-foreground">{year}</span>
                      <div className="flex-1 h-px bg-border/40" />
                      <span className="text-xs text-muted-foreground">
                        {records.length} {records.length === 1 ? "post" : "poster"}
                        {records.some(r => r.cost) && (
                          <> · kr {Math.round(records.reduce((s, r) => s + (r.cost ?? 0), 0)).toLocaleString("nb-NO")}</>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Service cards for this year */}
                  <div className="space-y-6">
                    {records.map((service) => (
                      <div key={service.id} className="relative pl-6 md:pl-8">
                        <div
                          className={`absolute w-3 h-3 rounded-full -left-[6.5px] top-5 border-2 border-background ${categoryDotColors[service.category] ?? "bg-primary"}`}
                        />
                        <Card className="bg-card hover-elevate transition-all">
                          <CardContent className="p-4 md:p-5">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                              <div className="space-y-2 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className={`${categoryColors[service.category] ?? "bg-secondary"} border-0`}>
                                    {categoryTranslations[service.category] ?? service.category}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(service.serviceDate), "dd. MMMM yyyy", { locale: nb })}
                                  </span>
                                  {service.mileageAtService && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                                      <Gauge className="w-3 h-3" />
                                      {service.mileageAtService.toLocaleString("nb-NO")} km
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-base font-bold leading-snug">{service.title}</h3>
                                {service.description && (
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{service.description}</p>
                                )}
                                {(service.performedBy || service.cost !== null) && (
                                  <div className="flex items-center gap-4 text-sm mt-3 pt-3 border-t border-border/40">
                                    {service.performedBy && (
                                      <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Wrench className="w-3.5 h-3.5" />
                                        <span>{service.performedBy}</span>
                                      </div>
                                    )}
                                    {service.cost !== null && (
                                      <div className="flex items-center gap-1.5 font-mono font-semibold text-foreground">
                                        <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                                        kr {service.cost.toLocaleString("nb-NO")}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Link href={`/vehicles/${id}/service/${service.id}/edit`}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                  </Button>
                                </Link>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive">
                                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Slett post</AlertDialogTitle>
                                      <AlertDialogDescription>Er du sikker på at du vil slette denne serviceposten?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteService(service.id)} className="bg-destructive text-destructive-foreground">Slett</AlertDialogAction>
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
                </div>
              ))}

              {/* Running total */}
              {services && services.length > 0 && totalServiceCost > 0 && (
                <div className="pl-6 md:pl-8 mt-8 pt-6 border-t border-border/40">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">Total servicekostnad</span>
                    <span className="font-bold text-base font-mono">
                      kr {Math.round(totalServiceCost).toLocaleString("nb-NO")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Trip log ─────────────────────────────────────────── */}
        <TabsContent value="trips" className="mt-6 space-y-4 animate-in fade-in-50 duration-500">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">Kjørebok</h2>
              {trips && trips.length > 0 && totalTripKm > 0 && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Totalt {totalTripKm.toLocaleString("nb-NO")} km over {trips.length} turer
                </p>
              )}
            </div>
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
                <Card key={trip.id} className="bg-card hover-elevate transition-all">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-bold truncate">{trip.fromLocation} → {trip.toLocation}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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
                              <AlertDialogDescription>Er du sikker på at du vil slette denne turen?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTrip(trip.id)} className="bg-destructive text-destructive-foreground">Slett</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(trip.tripDate), "dd.MM.yyyy")}
                      </span>
                      {trip.distanceKm && (
                        <span className="flex items-center gap-1.5 font-mono font-medium text-foreground">
                          <Route className="w-3.5 h-3.5 text-muted-foreground" />
                          {trip.distanceKm} km
                        </span>
                      )}
                      {trip.fuelUsedLiters && (
                        <span className="font-mono text-xs bg-muted/60 px-2 py-0.5 rounded-full">
                          {((trip.fuelUsedLiters / (trip.distanceKm || 1)) * 10).toFixed(2)} L/mil
                        </span>
                      )}
                      {trip.weather && <span className="hidden sm:block">{trip.weather}</span>}
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

        {/* ── Receipts ─────────────────────────────────────────── */}
        <TabsContent value="receipts" className="mt-6 space-y-4 animate-in fade-in-50 duration-500">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">Kvitteringer & Fakturaer</h2>
              {receipts && receipts.length > 0 && totalReceiptAmount > 0 && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Totalt kr {Math.round(totalReceiptAmount).toLocaleString("nb-NO")} · {receipts.length} dokumenter
                </p>
              )}
            </div>
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
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {receipts.map((receipt) => (
                  <Card key={receipt.id} className="bg-card hover-elevate transition-all overflow-hidden">
                    {receipt.imageUrl && (
                      <div className="relative h-36 overflow-hidden bg-muted/30">
                        <img src={receipt.imageUrl} alt="Kvittering" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      </div>
                    )}
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold leading-tight">{receipt.title}</div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1 hover:text-destructive shrink-0">
                              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Slett kvittering</AlertDialogTitle>
                              <AlertDialogDescription>Er du sikker på at du vil slette denne kvitteringen?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteReceipt(receipt.id)} className="bg-destructive text-destructive-foreground">Slett</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(receipt.receiptDate), "dd.MM.yyyy")}
                        </span>
                        {receipt.vendor && (
                          <span className="bg-muted/60 px-2 py-0.5 rounded-full">{receipt.vendor}</span>
                        )}
                      </div>
                      {receipt.notes && (
                        <p className="text-sm text-muted-foreground mb-3 flex-1 leading-relaxed">{receipt.notes}</p>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/40">
                        {receipt.fileUrl ? (
                          <Button variant="link" className="h-auto p-0 text-xs" asChild>
                            <a href={receipt.fileUrl} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-3.5 h-3.5 mr-1" />
                              Vis fil
                            </a>
                          </Button>
                        ) : (
                          <div />
                        )}
                        {receipt.amount !== null && (
                          <div className="font-mono font-bold text-lg">
                            kr {receipt.amount.toLocaleString("nb-NO")}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Receipts total footer */}
              {totalReceiptAmount > 0 && (
                <div className="flex justify-between items-center p-4 bg-card rounded-xl border border-border/50 text-sm">
                  <span className="text-muted-foreground font-medium">Totalt kvitteringer ({receipts.length})</span>
                  <span className="font-bold font-mono text-base">
                    kr {Math.round(totalReceiptAmount).toLocaleString("nb-NO")}
                  </span>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Manuals ──────────────────────────────────────────── */}
        <TabsContent value="manuals" className="mt-6 space-y-4 animate-in fade-in-50 duration-500">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Manualer og ressurser</CardTitle>
              <CardDescription>Søk etter original servicemanual for {vehicle.make} {vehicle.model} {vehicle.year}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Button variant="outline" className="justify-start h-14" asChild>
                  <a href={`https://www.haynes.com/en-us/search?q=${vehicle.make}+${vehicle.model}`} target="_blank" rel="noopener noreferrer">
                    <BookOpen className="w-5 h-5 mr-3 text-primary shrink-0" />
                    <div className="flex flex-col items-start">
                      <span>Haynes Manuals</span>
                      <span className="text-xs font-normal text-muted-foreground">Søk etter reparasjonsmanual</span>
                    </div>
                  </a>
                </Button>

                {vehicle.type === "motorcycle" && (
                  <Button variant="outline" className="justify-start h-14" asChild>
                    <a href={`https://www.bikez.com/motorcycles/${vehicle.make.toLowerCase()}_${vehicle.model.toLowerCase().replace(/ /g, '_')}.php`} target="_blank" rel="noopener noreferrer">
                      <Bike className="w-5 h-5 mr-3 text-primary shrink-0" />
                      <div className="flex flex-col items-start">
                        <span>Bikez.com</span>
                        <span className="text-xs font-normal text-muted-foreground">Spesifikasjoner og data</span>
                      </div>
                    </a>
                  </Button>
                )}

                <Button variant="outline" className="justify-start h-14" asChild>
                  <a href="https://www.mc-manualen.no" target="_blank" rel="noopener noreferrer">
                    <FileText className="w-5 h-5 mr-3 text-primary shrink-0" />
                    <div className="flex flex-col items-start">
                      <span>MC-Manualen</span>
                      <span className="text-xs font-normal text-muted-foreground">Norsk ressurs</span>
                    </div>
                  </a>
                </Button>

                <Button variant="outline" className="justify-start h-14" asChild>
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(`${vehicle.year} ${vehicle.make} ${vehicle.model} servicemanual PDF`)}`} target="_blank" rel="noopener noreferrer">
                    <FileText className="w-5 h-5 mr-3 text-primary shrink-0" />
                    <div className="flex flex-col items-start">
                      <span>Søk PDF-manual</span>
                      <span className="text-xs font-normal text-muted-foreground">Google-søk etter servicemanual</span>
                    </div>
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Maintenance map ───────────────────────────────────── */}
        <TabsContent value="map" className="mt-6 space-y-4 animate-in fade-in-50 duration-500">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Vedlikeholdskart</CardTitle>
              <CardDescription>Visuell oversikt over utført vedlikehold. Grønn = siste år · Gul = 1–2 år · Rød = over 2 år siden.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center bg-sidebar/50 rounded-xl p-8 border border-border">
                {services && <MaintenanceMap type={vehicle.type} records={services} />}
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500/60 border border-green-500" />≤ 12 mnd</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-500/60 border border-yellow-500" />12–24 mnd</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500/60 border border-red-500" />&gt; 24 mnd</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-muted/30 border border-muted" />Ikke utført</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Ownership history ─────────────────────────────────── */}
        <TabsContent value="owners" className="mt-6 space-y-4 animate-in fade-in-50 duration-500">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Eierhistorikk</h2>
            {isAuthenticated && (
              <Button size="sm" variant="outline" onClick={() => setShowTransfer(true)}>
                <SendHorizontal className="w-4 h-4 mr-2" />
                Overfør kjøretøy
              </Button>
            )}
          </div>

          {ownershipHistory.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <History className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Ingen eierhistorikk registrert</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Historikk registreres automatisk ved kjøretøyoverføring.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative border-l border-border ml-3 space-y-6 pb-6">
              {ownershipHistory.map((entry, idx) => (
                <div key={entry.id} className="relative pl-6">
                  <div className={`absolute w-3 h-3 rounded-full -left-[6.5px] top-4 border-2 border-background ${idx === 0 ? "bg-primary" : "bg-muted-foreground/50"}`} />
                  <Card className={`bg-card ${idx === 0 ? "border-primary/20" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">
                              {entry.consentToShow ? entry.userName : "Anonym eier"}
                            </p>
                            {idx === 0 && (
                              <Badge variant="outline" className="text-xs border-primary/40 text-primary">Nåværende</Badge>
                            )}
                          </div>
                          {entry.consentToShow && (
                            <p className="text-xs text-muted-foreground">{entry.userEmail}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {format(new Date(entry.fromDate), "dd.MM.yyyy", { locale: nb })}
                              {entry.toDate && ` → ${format(new Date(entry.toDate), "dd.MM.yyyy", { locale: nb })}`}
                              {!entry.toDate && " → nå"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}

          {pendingTransfer && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 font-medium">Aktiv overføring</span>
                  <span className="text-muted-foreground">til {pendingTransfer.toEmail}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setShowTransfer(true)}>
                  Se detaljer
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Export ───────────────────────────────────────────── */}
        <TabsContent value="export" className="mt-6 space-y-4 animate-in fade-in-50 duration-500">
          <h2 className="text-xl font-bold">Eksport & deling</h2>

          {/* Stats summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/40 rounded-xl border border-border/50">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Serviceposter</div>
              <div className="text-xl font-bold">{services?.length ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Total servicekostnad</div>
              <div className="text-xl font-bold">
                {totalServiceCost > 0 ? `kr ${Math.round(totalServiceCost).toLocaleString("nb-NO")}` : "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Kvitteringer</div>
              <div className="text-xl font-bold">{receipts?.length ?? 0}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Loggede km</div>
              <div className="text-xl font-bold">{totalTripKm > 0 ? `${totalTripKm.toLocaleString("nb-NO")} km` : "—"}</div>
            </div>
          </div>

          {/* PDF export card */}
          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Printer className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base mb-1">Digital Servicehefte (PDF)</h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Generer et profesjonelt servicehefte med all vedlikeholdshistorikk, kvitteringer og turer. 
                    Egnet for å dele med kjøper, selge kjøretøyet, eller for verkstedet.
                  </p>
                  <Link href={`/vehicles/${id}/print`}>
                    <Button>
                      <Printer className="w-4 h-4 mr-2" />
                      Åpne servicehefte
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Image section */}
          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Image className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base mb-1">Kjøretøybilde</h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Legg til et bilde av kjøretøyet som vises i servicehefte og på garasjeoversikten.
                  </p>
                  <Link href={`/vehicles/${id}/edit`}>
                    <Button variant="outline">
                      <Pencil className="w-4 h-4 mr-2" />
                      {vehicle.imageUrl ? "Bytt bilde" : "Legg til bilde"}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transfer ownership */}
          {isAuthenticated && (
            <Card className="bg-card border-dashed border-border/60">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <SendHorizontal className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base mb-1">Overfør kjøretøy</h3>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      Selg eller gi bort kjøretøyet til en ny eier. All historikk og dokumentasjon følger med.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setShowTransfer(true)}
                      className={pendingTransfer ? "border-amber-500/50 text-amber-400" : ""}
                    >
                      <SendHorizontal className="w-4 h-4 mr-2" />
                      {pendingTransfer ? "Aktiv overføring – se detaljer" : "Overfør til ny eier"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
