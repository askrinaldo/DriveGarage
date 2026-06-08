import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Star, Heart, Trophy, Calendar, Car } from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { LoadingState } from "@/components/ui-states";

interface MonthProject {
  id: number;
  title: string;
  description: string | null;
  nominatorName: string;
  voteCount: number;
  isWinner: boolean;
  status: string;
  month: number;
  year: number;
  createdAt: string;
  hasVoted: boolean;
  vehicle: {
    make: string;
    model: string;
    year: number | null;
    imageUrl: string | null;
  } | null;
}

interface Winner {
  id: number;
  title: string;
  nominatorName: string;
  voteCount: number;
  month: number;
  year: number;
  vehicle: {
    make: string;
    model: string;
    year: number | null;
    imageUrl: string | null;
  } | null;
}

interface UserVehicle {
  id: number;
  make: string;
  model: string;
  year: number | null;
}

const MONTH_NAMES = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];

function authHeader(token: string | null): Record<string, string> {
  if (!token) return {};
  return { "x-user-token": token };
}

export default function ProjectOfMonth() {
  const [, navigate] = useLocation();
  const { isAuthenticated, token } = useUserAuth();

  const [data, setData] = useState<{ month: number; year: number; projects: MonthProject[] } | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<number | null>(null);

  const [myVehicles, setMyVehicles] = useState<UserVehicle[]>([]);
  const [nominating, setNominating] = useState(false);
  const [nomForm, setNomForm] = useState({ vehicleId: "", title: "", description: "" });
  const [nomOpen, setNomOpen] = useState(false);

  const load = useCallback(async () => {
    const [monthRes, winnersRes] = await Promise.all([
      fetch("/api/projects/month"),
      fetch("/api/projects/winners"),
    ]);
    if (monthRes.ok) setData(await monthRes.json() as typeof data);
    if (winnersRes.ok) setWinners(await winnersRes.json() as Winner[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    if (isAuthenticated && token) {
      void (async () => {
        const res = await fetch("/api/vehicles", { headers: authHeader(token) });
        if (res.ok) setMyVehicles(await res.json() as UserVehicle[]);
      })();
    }
  }, [isAuthenticated, token, load]);

  async function handleVote(projectId: number) {
    if (!isAuthenticated) { navigate("/login"); return; }
    setVoting(projectId);
    await fetch(`/api/projects/month/${projectId}/vote`, {
      method: "POST",
      headers: authHeader(token),
    });
    setVoting(null);
    void load();
  }

  async function handleNominate() {
    if (!nomForm.vehicleId || !nomForm.title) return;
    setNominating(true);
    const res = await fetch("/api/projects/month/nominate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify({
        vehicleId: parseInt(nomForm.vehicleId, 10),
        title: nomForm.title,
        description: nomForm.description || undefined,
      }),
    });
    setNominating(false);
    if (res.ok) {
      setNomOpen(false);
      setNomForm({ vehicleId: "", title: "", description: "" });
      void load();
    } else {
      const err = await res.json() as { error: string };
      alert(err.error ?? "Noe gikk galt");
    }
  }

  if (loading) return <LoadingState message="Laster månedens prosjekt..." />;

  const currentMonthName = data ? MONTH_NAMES[(data.month - 1)] : "";

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              <h1 className="text-2xl font-bold tracking-tight">Månedens prosjekt</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Stem på {currentMonthName} {data?.year}s beste prosjekt
            </p>
          </div>
        </div>

        {isAuthenticated && (
          <Dialog open={nomOpen} onOpenChange={setNomOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Star className="w-4 h-4" />
                Nominer prosjekt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nominer et prosjekt</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-sm">Kjøretøy</Label>
                  <Select value={nomForm.vehicleId} onValueChange={(v) => setNomForm(f => ({ ...f, vehicleId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Velg kjøretøy..." />
                    </SelectTrigger>
                    <SelectContent>
                      {myVehicles.map(v => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.make} {v.model} {v.year ? `(${v.year})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Prosjekttittel</Label>
                  <Input
                    placeholder="F.eks. «Komplett restaurering 1967 Volvo 122S»"
                    value={nomForm.title}
                    onChange={(e) => setNomForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Beskrivelse (valgfritt)</Label>
                  <Textarea
                    placeholder="Beskriv hva som er gjort, hva som gjør prosjektet spesielt..."
                    value={nomForm.description}
                    onChange={(e) => setNomForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNomOpen(false)}>Avbryt</Button>
                <Button onClick={handleNominate} disabled={nominating || !nomForm.vehicleId || !nomForm.title}>
                  {nominating ? "Nominerer..." : "Nominer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Current month nominations */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          {currentMonthName} {data?.year} — Aktive nomineringer
        </h2>

        {!data?.projects.length ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Star className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm mb-3">Ingen nomineringer ennå denne måneden.</p>
              {isAuthenticated && (
                <Button size="sm" variant="outline" onClick={() => setNomOpen(true)}>
                  Vær den første til å nominere!
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {data.projects.map((project, i) => (
              <Card
                key={project.id}
                className={`overflow-hidden transition-all ${i === 0 ? "ring-1 ring-amber-500/30" : ""}`}
              >
                {/* Vehicle image or gradient */}
                <div className="h-40 relative overflow-hidden bg-muted/20">
                  {project.vehicle?.imageUrl ? (
                    <img
                      src={project.vehicle.imageUrl}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Car className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                  {i === 0 && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-black">
                      #1 Leder
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2">
                    <Badge variant="outline" className="bg-black/60 border-white/20 text-white text-[10px]">
                      {project.vehicle ? `${project.vehicle.make} ${project.vehicle.model}${project.vehicle.year ? ` ${project.vehicle.year}` : ""}` : "Ukjent kjøretøy"}
                    </Badge>
                  </div>
                </div>

                <CardContent className="pt-4 pb-4">
                  <h3 className="font-semibold text-sm mb-1">{project.title}</h3>
                  {project.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mb-3">Nominert av {project.nominatorName}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Heart className={`w-4 h-4 ${project.hasVoted ? "fill-red-400 text-red-400" : "text-muted-foreground"}`} />
                      <span className="font-medium">{project.voteCount}</span>
                      <span className="text-muted-foreground text-xs">stemmer</span>
                    </div>
                    <Button
                      size="sm"
                      variant={project.hasVoted ? "default" : "outline"}
                      className={`h-7 text-xs gap-1.5 ${project.hasVoted ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30" : ""}`}
                      onClick={() => void handleVote(project.id)}
                      disabled={voting === project.id || !isAuthenticated}
                    >
                      <Heart className="w-3 h-3" />
                      {project.hasVoted ? "Angre stemme" : "Stem"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past winners */}
      {winners.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Tidligere vinnere
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {winners.map(winner => (
              <div
                key={winner.id}
                className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{winner.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {MONTH_NAMES[(winner.month - 1)]} {winner.year}
                    {winner.vehicle && ` · ${winner.vehicle.make} ${winner.vehicle.model}`}
                  </p>
                  <p className="text-[10px] text-amber-400 mt-0.5">{winner.voteCount} stemmer</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
