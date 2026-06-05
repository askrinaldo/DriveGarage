import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUserAuth } from "@/hooks/use-user-auth";
import {
  Car, Bike, CheckCircle2, XCircle, AlertCircle, ArrowRight, Loader2, Wrench, Clock,
} from "lucide-react";

interface TransferData {
  transfer: {
    id: number;
    vehicleId: number;
    fromUserName: string;
    fromUserEmail: string;
    toEmail: string;
    transferCode: string;
    status: string;
    expiresAt: string;
  };
  vehicle: {
    id: number;
    make: string;
    model: string;
    year: number;
    type: string;
    color: string | null;
    registrationNumber: string | null;
    mileage: number | null;
    imageUrl: string | null;
  };
}

export default function VehicleTransfer() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated, token: userToken, email: userEmail, name: userName } = useUserAuth();
  const { toast } = useToast();

  const [data, setData] = useState<TransferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const res = await fetch(`/api/vehicle-transfer/${token}`);
      const json = await res.json() as TransferData & { error?: string; status?: string };
      if (!res.ok) {
        setError(json.error ?? "Noe gikk galt");
        setErrorStatus(json.status ?? null);
      } else {
        setData(json);
      }
      setLoading(false);
    })();
  }, [token]);

  async function accept() {
    if (!userToken) return;
    setAccepting(true);
    const res = await fetch(`/api/vehicle-transfer/${token}/accept`, {
      method: "POST",
      headers: { "x-user-token": userToken },
    });
    const json = await res.json() as { ok?: boolean; error?: string; vehicleId?: number };
    setAccepting(false);
    if (!res.ok) {
      toast({ title: "Feil", description: json.error ?? "Godkjenning feilet", variant: "destructive" });
      return;
    }
    setAccepted(true);
    setTimeout(() => navigate(`/vehicles/${json.vehicleId}`), 2500);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Laster overføring...</p>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Kjøretøy overført!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {data?.vehicle.year} {data?.vehicle.make} {data?.vehicle.model} er nå i din garasje.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Sender deg til kjøretøyet...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    const isExpired = errorStatus === "expired";
    const isAccepted = errorStatus === "accepted";
    const isCancelled = errorStatus === "cancelled";

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${isAccepted ? "bg-emerald-500/20" : "bg-destructive/20"}`}>
              {isAccepted ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              ) : isExpired ? (
                <Clock className="w-8 h-8 text-muted-foreground" />
              ) : (
                <XCircle className="w-8 h-8 text-destructive" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isExpired ? "Lenken er utløpt" : isAccepted ? "Allerede godtatt" : isCancelled ? "Overføring avbrutt" : "Ugyldig lenke"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={() => navigate("/")} variant="outline">
              Gå til forsiden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { transfer, vehicle } = data;
  const isMyTransfer = isAuthenticated && userEmail?.toLowerCase() === transfer.toEmail.toLowerCase();
  const isWrongUser = isAuthenticated && userEmail?.toLowerCase() !== transfer.toEmail.toLowerCase();
  const expiresDate = new Date(transfer.expiresAt);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-lg w-full space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="bg-primary/20 p-2.5 rounded-lg">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-xl">Vintage Garage</span>
          </div>
          <h1 className="text-2xl font-bold">Kjøretøyoverføring</h1>
          <p className="text-sm text-muted-foreground">
            <strong>{transfer.fromUserName}</strong> ønsker å overføre et kjøretøy til deg
          </p>
        </div>

        {/* Vehicle card */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {vehicle.imageUrl ? (
                  <img src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} className="w-full h-full object-cover rounded-lg" />
                ) : vehicle.type === "motorcycle" ? (
                  <Bike className="w-8 h-8 text-primary" />
                ) : (
                  <Car className="w-8 h-8 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold">{vehicle.year} {vehicle.make} {vehicle.model}</h2>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {vehicle.color && (
                    <Badge variant="outline" className="text-xs">{vehicle.color}</Badge>
                  )}
                  {vehicle.registrationNumber && (
                    <Badge variant="outline" className="text-xs font-mono">{vehicle.registrationNumber}</Badge>
                  )}
                  {vehicle.mileage && (
                    <Badge variant="outline" className="text-xs">{vehicle.mileage.toLocaleString("nb-NO")} km</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Fra: {transfer.fromUserName} ({transfer.fromUserEmail})</span>
              <span>Utløper: {expiresDate.toLocaleDateString("nb-NO")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Kode */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Overføringskode</p>
              <p className="text-3xl font-mono font-bold tracking-[0.3em] text-primary">{transfer.transferCode}</p>
            </div>
          </CardContent>
        </Card>

        {/* Action section */}
        {isWrongUser && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4 pb-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-400">Feil konto</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Denne overføringen er til <strong>{transfer.toEmail}</strong>, men du er logget inn som <strong>{userEmail}</strong>.
                  Logg ut og bruk riktig konto.
                </p>
                <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => navigate("/login")}>
                  Logg inn med annen konto
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!isAuthenticated && (
          <Card className="border-primary/20">
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-center text-muted-foreground mb-3">
                Du må logge inn eller registrere deg som <strong>{transfer.toEmail}</strong> for å godta overføringen.
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => navigate(`/login?redirect=/vehicle-transfer/${token}`)}
                >
                  Logg inn
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/register?redirect=/vehicle-transfer/${token}`)}
                >
                  Registrer deg
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isMyTransfer && (
          <Button
            className="w-full h-12 text-base"
            onClick={() => void accept()}
            disabled={accepting}
          >
            {accepting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Godtar overføring...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 mr-2" />Godta kjøretøy<ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Historikk, servicelogg og dokumenter følger med ved overføring.
        </p>
      </div>
    </div>
  );
}
