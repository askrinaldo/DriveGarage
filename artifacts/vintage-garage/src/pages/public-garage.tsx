import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Car, Bike, Calendar, Gauge, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GarageVehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  type: string;
  color: string | null;
  mileage: number | null;
  imageUrl: string | null;
}

interface PublicGarageData {
  user: {
    id: number;
    name: string;
    subscriptionTier: string;
    createdAt: string;
  };
  vehicles: GarageVehicle[];
}

function VehicleCard({ v }: { v: GarageVehicle }) {
  const isMoto = v.type === "motorcycle";
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      {v.imageUrl ? (
        <img src={v.imageUrl} alt={`${v.make} ${v.model}`} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-muted flex items-center justify-center">
          {isMoto
            ? <Bike className="w-12 h-12 text-muted-foreground/30" />
            : <Car className="w-12 h-12 text-muted-foreground/30" />}
        </div>
      )}
      <div className="p-4 flex flex-col gap-1">
        <div className="font-semibold text-base">{v.make} {v.model}</div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{v.year}</span>
          {v.mileage != null && (
            <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5" />{v.mileage.toLocaleString()} km</span>
          )}
          {v.color && <span className="capitalize">{v.color}</span>}
        </div>
      </div>
    </div>
  );
}

export default function PublicGarage() {
  const [, params] = useRoute("/garage/:username");
  const [, navigate] = useLocation();
  const username = params?.username ?? "";

  const [data, setData] = useState<PublicGarageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    void fetch(`/api/garage/${encodeURIComponent(username)}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null; }
        return r.ok ? r.json() as Promise<PublicGarageData> : null;
      })
      .then(d => { if (d) setData(d); setLoading(false); });
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laster garasje…</div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Car className="w-16 h-16 text-muted-foreground/30" />
        <h1 className="text-2xl font-bold">Garasje ikke funnet</h1>
        <p className="text-muted-foreground">Det finnes ingen garasje for «{username}».</p>
        <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Tilbake til forsiden
        </Button>
      </div>
    );
  }

  const joinYear = new Date(data.user.createdAt).getFullYear();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl font-black text-primary">
            {data.user.name.slice(0, 2).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold">{data.user.name}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" />{data.vehicles.length} kjøretøy</span>
            <span>·</span>
            <span>Medlem siden {joinYear}</span>
          </div>
        </div>
      </div>

      {/* Vehicles grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {data.vehicles.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Car className="w-12 h-12 opacity-20" />
            <p>Ingen kjøretøy ennå.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {data.vehicles.map(v => <VehicleCard key={v.id} v={v} />)}
          </div>
        )}
      </div>
    </div>
  );
}
