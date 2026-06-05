import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState, ErrorState } from "@/components/ui-states";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Plus, Bell, AlertTriangle, CheckCircle2, Clock,
  Loader2, Trash2, Gauge, Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Params { id: string }

interface Reminder {
  id: number;
  vehicleId: number;
  title: string;
  description: string | null;
  type: "mileage" | "date" | "both";
  dueMileage: number | null;
  dueDate: string | null;
  intervalMonths: number | null;
  intervalMileage: number | null;
  isActive: boolean;
  lastCompleted: string | null;
  lastCompletedMileage: number | null;
  notifyBefore: number;
  status: "ok" | "due_soon" | "overdue";
}

const STATUS_CONFIG = {
  ok: { label: "OK", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  due_soon: { label: "Snart forfalt", color: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: Clock },
  overdue: { label: "Forfalt", color: "bg-destructive/15 text-destructive border-destructive/30", icon: AlertTriangle },
};

function ReminderForm({
  onSuccess, vehicleId, existing,
}: { onSuccess: () => void; vehicleId: number; existing?: Reminder }) {
  const { toast } = useToast();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [type, setType] = useState<"mileage" | "date" | "both">(existing?.type ?? "date");
  const [dueMileage, setDueMileage] = useState(existing?.dueMileage ? String(existing.dueMileage) : "");
  const [dueDate, setDueDate] = useState(
    existing?.dueDate ? existing.dueDate.split("T")[0] ?? "" : ""
  );
  const [intervalMonths, setIntervalMonths] = useState(existing?.intervalMonths ? String(existing.intervalMonths) : "");
  const [intervalMileage, setIntervalMileage] = useState(existing?.intervalMileage ? String(existing.intervalMileage) : "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const url = existing
        ? `/api/vehicles/${vehicleId}/reminders/${existing.id}`
        : `/api/vehicles/${vehicleId}/reminders`;
      const res = await fetch(url, {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          type,
          dueMileage: dueMileage ? parseInt(dueMileage, 10) : null,
          dueDate: dueDate || null,
          intervalMonths: intervalMonths ? parseInt(intervalMonths, 10) : null,
          intervalMileage: intervalMileage ? parseInt(intervalMileage, 10) : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: existing ? "Påminnelse oppdatert" : "Påminnelse opprettet" });
      onSuccess();
    } catch {
      toast({ title: "Noe gikk galt", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Tittel *</Label>
        <Input placeholder="f.eks. Oljeskift" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Beskrivelse</Label>
        <Textarea placeholder="Ekstra detaljer..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label>Type påminnelse</Label>
        <div className="flex gap-2">
          {(["date", "mileage", "both"] as const).map((t) => (
            <Button
              key={t}
              type="button"
              size="sm"
              variant={type === t ? "default" : "outline"}
              onClick={() => setType(t)}
            >
              {t === "date" ? "Dato" : t === "mileage" ? "Km-stand" : "Begge"}
            </Button>
          ))}
        </div>
      </div>

      {(type === "date" || type === "both") && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Forfallsdato</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Repeter hvert (måneder)</Label>
            <Input type="number" min="1" placeholder="12" value={intervalMonths} onChange={(e) => setIntervalMonths(e.target.value)} />
          </div>
        </div>
      )}

      {(type === "mileage" || type === "both") && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Forfaller ved km</Label>
            <Input type="number" min="0" placeholder="15000" value={dueMileage} onChange={(e) => setDueMileage(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Repeter hver (km)</Label>
            <Input type="number" min="0" placeholder="5000" value={intervalMileage} onChange={(e) => setIntervalMileage(e.target.value)} />
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
        {existing ? "Lagre" : "Opprett påminnelse"}
      </Button>
    </form>
  );
}

export default function VehicleReminders() {
  const params = useParams<Params>();
  const vehicleId = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/vehicles/${vehicleId}/reminders`)
      .then((r) => r.json() as Promise<Reminder[]>)
      .then((d) => { setReminders(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [vehicleId]);

  useEffect(() => { load(); }, [load]);

  async function handleComplete(reminder: Reminder) {
    const mileageStr = window.prompt("Nåværende km-stand (valgfritt):");
    const mileage = mileageStr ? parseInt(mileageStr, 10) : undefined;
    try {
      await fetch(`/api/vehicles/${vehicleId}/reminders/${reminder.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mileage }),
      });
      toast({ title: `"${reminder.title}" markert som utført` });
      load();
    } catch {
      toast({ title: "Noe gikk galt", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/vehicles/${vehicleId}/reminders/${id}`, { method: "DELETE" });
    toast({ title: "Påminnelse slettet" });
    load();
  }

  if (loading) return <LoadingState message="Laster påminnelser..." />;
  if (error) return <ErrorState onRetry={load} />;

  const overdue = reminders.filter((r) => r.status === "overdue");
  const dueSoon = reminders.filter((r) => r.status === "due_soon");
  const ok = reminders.filter((r) => r.status === "ok");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/vehicles/${vehicleId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Servicepåminnelser</h1>
          <p className="text-sm text-muted-foreground">Automatiske påminnelser for vedlikehold</p>
        </div>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Ny påminnelse
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ny servicepåminnelse</DialogTitle></DialogHeader>
            <ReminderForm onSuccess={() => { setNewOpen(false); load(); }} vehicleId={vehicleId} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {reminders.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className={overdue.length > 0 ? "border-destructive/40" : ""}>
            <CardContent className="pt-4 pb-4 text-center">
              <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${overdue.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              <div className={`text-2xl font-bold ${overdue.length > 0 ? "text-destructive" : "text-muted-foreground"}`}>{overdue.length}</div>
              <div className="text-xs text-muted-foreground">Forfalt</div>
            </CardContent>
          </Card>
          <Card className={dueSoon.length > 0 ? "border-amber-500/30" : ""}>
            <CardContent className="pt-4 pb-4 text-center">
              <Clock className={`w-5 h-5 mx-auto mb-1 ${dueSoon.length > 0 ? "text-amber-400" : "text-muted-foreground"}`} />
              <div className={`text-2xl font-bold ${dueSoon.length > 0 ? "text-amber-400" : "text-muted-foreground"}`}>{dueSoon.length}</div>
              <div className="text-xs text-muted-foreground">Snart</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
              <div className="text-2xl font-bold text-emerald-400">{ok.length}</div>
              <div className="text-xs text-muted-foreground">OK</div>
            </CardContent>
          </Card>
        </div>
      )}

      {reminders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium mb-1">Ingen påminnelser ennå</p>
          <p className="text-xs mb-4">Legg til servicepåminnelser for å holde styr på vedlikehold.</p>
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Legg til første påminnelse
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {[...overdue, ...dueSoon, ...ok].map((reminder) => {
            const cfg = STATUS_CONFIG[reminder.status];
            const Icon = cfg.icon;
            return (
              <Card key={reminder.id} className={reminder.status === "overdue" ? "border-destructive/30" : reminder.status === "due_soon" ? "border-amber-500/20" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      reminder.status === "overdue" ? "bg-destructive/10"
                      : reminder.status === "due_soon" ? "bg-amber-500/10"
                      : "bg-emerald-500/10"
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        reminder.status === "overdue" ? "text-destructive"
                        : reminder.status === "due_soon" ? "text-amber-400"
                        : "text-emerald-400"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-sm">{reminder.title}</h3>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                      {reminder.description && (
                        <p className="text-xs text-muted-foreground mb-1.5">{reminder.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {reminder.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(reminder.dueDate).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                        )}
                        {reminder.dueMileage && (
                          <span className="flex items-center gap-1">
                            <Gauge className="w-3 h-3" />
                            {reminder.dueMileage.toLocaleString("nb-NO")} km
                          </span>
                        )}
                        {reminder.lastCompleted && (
                          <span className="flex items-center gap-1 text-emerald-400/70">
                            <CheckCircle2 className="w-3 h-3" />
                            Sist: {new Date(reminder.lastCompleted).toLocaleDateString("nb-NO")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                        onClick={() => handleComplete(reminder)}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Utført
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Slett påminnelse?</AlertDialogTitle>
                            <AlertDialogDescription>Dette kan ikke angres.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Avbryt</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(reminder.id)} className="bg-destructive text-destructive-foreground">Slett</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
