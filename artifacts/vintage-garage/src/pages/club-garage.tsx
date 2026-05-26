import { useState, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetClub,
  useListClubGarage,
  useListVehicles,
  useAddToClubGarage,
  useRemoveFromClubGarage,
  getGetClubQueryKey,
  getListClubGarageQueryKey,
  getListVehiclesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LoadingState, ErrorState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import {
  ArrowLeft,
  Car,
  Bike,
  Gauge,
  Wrench,
  Calendar,
  User,
  Plus,
  Search,
  RotateCcw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Params { id: string }

const PAGE_SIZE = 12;

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeSince(d: string | null) {
  if (!d) return null;
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "I dag";
  if (days === 1) return "I går";
  if (days < 30) return `${days} dager siden`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mnd siden`;
  return `${Math.floor(months / 12)} år siden`;
}

function freshnessColor(d: string | null) {
  if (!d) return "text-muted-foreground";
  const days = (Date.now() - new Date(d).getTime()) / 86400000;
  if (days < 365) return "text-emerald-400";
  if (days < 730) return "text-amber-400";
  return "text-red-400";
}

export default function ClubGarage() {
  const params = useParams<Params>();
  const clubId = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("all");
  const [filterMake, setFilterMake] = useState("");
  const [filterYearFrom, setFilterYearFrom] = useState("");
  const [filterYearTo, setFilterYearTo] = useState("");
  const [searchMake, setSearchMake] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addMemberName, setAddMemberName] = useState("");
  const [addVehicleId, setAddVehicleId] = useState<number | null>(null);

  const garageParams = {
    ...(filterType !== "all" ? { type: filterType } : {}),
    ...(filterMake ? { make: filterMake } : {}),
    ...(filterYearFrom ? { yearFrom: parseInt(filterYearFrom, 10) } : {}),
    ...(filterYearTo ? { yearTo: parseInt(filterYearTo, 10) } : {}),
    page,
    pageSize: PAGE_SIZE,
  };

  const { data: club } = useGetClub(clubId, {
    query: { queryKey: getGetClubQueryKey(clubId) },
  });

  const {
    data: garageData,
    isLoading,
    isError,
    refetch,
  } = useListClubGarage(clubId, garageParams, {
    query: { queryKey: getListClubGarageQueryKey(clubId, garageParams) },
  });

  const { data: allVehicles } = useListVehicles({
    query: { queryKey: getListVehiclesQueryKey() },
  });

  const addMutation = useAddToClubGarage();
  const removeMutation = useRemoveFromClubGarage();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/clubs/${clubId}/garage`] });
  };

  async function handleAdd() {
    if (!addVehicleId || !addMemberName.trim()) {
      toast({ title: "Kjøretøy og navn er påkrevd", variant: "destructive" });
      return;
    }
    try {
      await addMutation.mutateAsync({
        clubId,
        data: { vehicleId: addVehicleId, memberName: addMemberName.trim() },
      });
      toast({ title: "Kjøretøy lagt til i garasjen" });
      setAddOpen(false);
      setAddVehicleId(null);
      invalidate();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast({ title: msg ?? "Noe gikk galt", variant: "destructive" });
    }
  }

  async function handleRemove(entryId: number) {
    await removeMutation.mutateAsync({ clubId, entryId });
    toast({ title: "Kjøretøy fjernet fra garasjen" });
    invalidate();
  }

  function resetFilters() {
    setFilterType("all");
    setFilterMake("");
    setFilterYearFrom("");
    setFilterYearTo("");
    setSearchMake("");
    setPage(1);
  }

  const hasFilters = filterType !== "all" || filterMake || filterYearFrom || filterYearTo;

  const vehicles = garageData?.vehicles ?? [];
  const totalPages = garageData?.totalPages ?? 1;
  const total = garageData?.total ?? 0;

  // Unique makes in current garage for filter suggestions
  const allMakes = useMemo(() => {
    return [...new Set((garageData?.vehicles ?? []).map((v) => v.make))].sort();
  }, [garageData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/clubs/${clubId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">
            {club?.name ?? "Klubb"} — Garasje
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {total} kjøretøy delt av klubbens medlemmer
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Legg til kjøretøy
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex gap-2">
          {[
            { value: "all", label: "Alle" },
            { value: "car", label: "Biler" },
            { value: "motorcycle", label: "Motorsykler" },
          ].map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filterType === f.value ? "default" : "outline"}
              onClick={() => { setFilterType(f.value); setPage(1); }}
            >
              {f.value === "car" && <Car className="w-3.5 h-3.5 mr-1.5" />}
              {f.value === "motorcycle" && <Bike className="w-3.5 h-3.5 mr-1.5" />}
              {f.label}
            </Button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 w-36 h-9 text-sm"
            placeholder="Merke..."
            value={searchMake}
            onChange={(e) => {
              setSearchMake(e.target.value);
              setFilterMake(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex gap-2 items-center">
          <Input
            className="w-20 h-9 text-sm"
            placeholder="Fra år"
            value={filterYearFrom}
            onChange={(e) => { setFilterYearFrom(e.target.value); setPage(1); }}
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            className="w-20 h-9 text-sm"
            placeholder="Til år"
            value={filterYearTo}
            onChange={(e) => { setFilterYearTo(e.target.value); setPage(1); }}
          />
        </div>

        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={resetFilters}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Nullstill
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState message="Laster garasje..." />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Wrench className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {hasFilters ? "Ingen kjøretøy matcher filteret" : "Garasjen er tom"}
          </h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            {hasFilters
              ? "Prøv å justere filtrene for å se flere kjøretøy."
              : "Ingen har lagt til kjøretøy i klubbens garasje ennå."}
          </p>
          {hasFilters ? (
            <Button variant="outline" onClick={resetFilters}>Nullstill filter</Button>
          ) : (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Legg til det første kjøretøyet
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {vehicles.map((v) => (
              <Card key={v.entryId} className="group overflow-hidden bg-card border-border hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5">
                {/* Image / placeholder */}
                <div className="relative h-44 bg-gradient-to-br from-muted to-muted/60 overflow-hidden">
                  {v.imageUrl ? (
                    <img
                      src={v.imageUrl}
                      alt={`${v.make} ${v.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {v.type === "motorcycle" ? (
                        <Bike className="w-16 h-16 text-muted-foreground/30" />
                      ) : (
                        <Car className="w-16 h-16 text-muted-foreground/30" />
                      )}
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <Badge className={`text-xs border-0 ${v.type === "motorcycle" ? "bg-amber-500/80 text-amber-100" : "bg-blue-500/80 text-blue-100"}`}>
                      {v.type === "motorcycle" ? "Motorsykkel" : "Bil"}
                    </Badge>
                  </div>
                  {v.registrationNumber && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="font-mono text-xs bg-background/80 backdrop-blur-sm">
                        {v.registrationNumber}
                      </Badge>
                    </div>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-destructive/80 hover:bg-destructive rounded text-white">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Fjerne fra garasjen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {v.year} {v.make} {v.model} vil bli fjernet fra klubbens garasje.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemove(v.entryId)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Fjern
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Title */}
                  <div>
                    <Link href={`/vehicles/${v.vehicleId}`}>
                      <h3 className="font-bold text-base leading-tight hover:text-primary transition-colors cursor-pointer">
                        {v.year} {v.make} {v.model}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{v.memberName}</span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                    {v.mileage !== null && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Gauge className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono">{v.mileage.toLocaleString()} km</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Wrench className="w-3.5 h-3.5 shrink-0" />
                      <span>{v.updateCount} serv.</span>
                    </div>
                  </div>

                  {/* Last service */}
                  <div className={`flex items-center gap-1.5 text-xs ${freshnessColor(v.lastService)}`}>
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {v.lastService ? (
                      <span>Service {timeSince(v.lastService)}</span>
                    ) : (
                      <span className="text-muted-foreground">Ingen service registrert</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Side {page} av {totalPages} · {total} kjøretøy totalt
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Forrige
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Neste
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add vehicle dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Legg kjøretøy til garasjen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="addMemberName">Ditt navn (klubbmedlem)</Label>
              <Input
                id="addMemberName"
                value={addMemberName}
                onChange={(e) => setAddMemberName(e.target.value)}
                placeholder="Ola Nordmann"
              />
              <p className="text-xs text-muted-foreground">Må være registrert som klubbmedlem.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Velg kjøretøy</Label>
              <Select
                value={addVehicleId?.toString() ?? ""}
                onValueChange={(v) => setAddVehicleId(parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg et kjøretøy..." />
                </SelectTrigger>
                <SelectContent>
                  {(allVehicles ?? []).map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                      {vehicle.registrationNumber ? ` — ${vehicle.registrationNumber}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Velg et kjøretøy fra din garasje som du vil dele med klubben.
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Avbryt</Button>
            </DialogClose>
            <Button
              onClick={handleAdd}
              disabled={addMutation.isPending || !addVehicleId || !addMemberName.trim()}
            >
              {addMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Legg til
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
