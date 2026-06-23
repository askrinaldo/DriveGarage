import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useUserAuth } from "@/hooks/use-user-auth";

interface ServiceRecord {
  id: number;
  title: string;
  description: string | null;
  serviceDate: string;
  mileageAtService: number | null;
  cost: string | null;
  category: string;
  performedBy: string | null;
}

interface Receipt {
  id: number;
  title: string;
  amount: string | null;
  receiptDate: string | null;
  vendor: string | null;
}

interface TripLog {
  id: number;
  date: string;
  distanceKm: string | null;
  description: string | null;
}

interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number | null;
  type: string;
  mileage: number | null;
  registrationNumber: string | null;
  color: string | null;
  notes: string | null;
  imageUrl: string | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  "oil-change": "Oljeskift",
  oil_change: "Oljeskift",
  brakes: "Bremser",
  tires: "Dekk",
  engine: "Motor",
  electrical: "Elektro",
  bodywork: "Karosseri",
  other: "Annet",
};

export default function VehiclePrint() {
  const params = useParams<{ id: string }>();
  const vehicleId = parseInt(params.id, 10);
  const { getAuthHeaders, isAuthenticated, isAuthLoading } = useUserAuth();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [trips, setTrips] = useState<TripLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      setError(true);
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const headers = await getAuthHeaders();
        const [v, sr, rc, tl] = await Promise.all([
          fetch(`/api/vehicles/${vehicleId}`, { headers }).then((r) => {
            if (!r.ok) throw new Error(`${r.status}`);
            return r.json() as Promise<Vehicle>;
          }),
          fetch(`/api/vehicles/${vehicleId}/service-records`, { headers }).then((r) => {
            if (!r.ok) throw new Error(`${r.status}`);
            return r.json() as Promise<ServiceRecord[]>;
          }),
          fetch(`/api/vehicles/${vehicleId}/receipts`, { headers }).then((r) =>
            r.ok ? (r.json() as Promise<Receipt[]>) : []
          ),
          fetch(`/api/vehicles/${vehicleId}/trip-logs`, { headers }).then((r) =>
            r.ok ? (r.json() as Promise<TripLog[]>) : []
          ),
        ]);
        setVehicle(v);
        setRecords(sr.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()));
        setReceipts(rc);
        setTrips(tl);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [vehicleId, isAuthLoading, isAuthenticated, getAuthHeaders]);

  useEffect(() => {
    if (!loading && !error && vehicle) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, error, vehicle]);

  if (isAuthLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Forbereder servicebok...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Du må være innlogget for å laste ned servicebok.</p>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Kunne ikke laste kjøretøy. Sjekk at du har tilgang.</p>
      </div>
    );
  }

  const totalCost = records
    .filter((r) => r.cost)
    .reduce((sum, r) => sum + parseFloat(r.cost!), 0);

  const totalReceiptAmount = receipts
    .filter((r) => r.amount)
    .reduce((sum, r) => sum + parseFloat(r.amount!), 0);

  const totalTripKm = trips
    .filter((t) => t.distanceKm)
    .reduce((sum, t) => sum + parseFloat(t.distanceKm!), 0);

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-page { page-break-after: always; }
        }
        @page { margin: 20mm; size: A4; }
        body { font-family: 'Georgia', serif; }
      `}</style>

      {/* Print button — hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
        >
          Skriv ut / Lagre PDF
        </button>
        <button
          onClick={() => window.history.back()}
          className="bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
        >
          Tilbake
        </button>
      </div>

      <div className="max-w-2xl mx-auto p-8 bg-white text-black min-h-screen">
        {/* Cover */}
        <div className="text-center border-b-4 border-amber-600 pb-8 mb-8">
          <div className="text-xs uppercase tracking-widest text-amber-700 mb-2 font-sans">Digital Servicebok</div>
          <h1 className="text-4xl font-bold mb-1">{vehicle.make} {vehicle.model}</h1>
          {vehicle.year && <p className="text-xl text-gray-600">{vehicle.year}</p>}
          {vehicle.imageUrl && (
            <img
              src={vehicle.imageUrl}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="w-64 h-44 object-cover mx-auto mt-6 rounded-lg border"
            />
          )}
        </div>

        {/* Vehicle info */}
        <div className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-4 font-sans">Kjøretøyinformasjon</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {[
              ["Merke", vehicle.make],
              ["Modell", vehicle.model],
              ["Årsmodell", vehicle.year],
              ["Type", vehicle.type === "motorcycle" ? "Motorsykkel" : "Bil"],
              ["Registreringsnummer", vehicle.registrationNumber],
              ["Farge", vehicle.color],
              ["Km-stand", vehicle.mileage ? `${vehicle.mileage.toLocaleString("nb-NO")} km` : undefined],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={String(label)} className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600 font-sans font-medium">{label}</span>
                <span className="font-semibold">{String(value)}</span>
              </div>
            ))}
          </div>
          {vehicle.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-700 italic">
              {vehicle.notes}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-4 font-sans">Sammendrag</h2>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-amber-50 rounded border border-amber-200">
              <div className="text-2xl font-bold text-amber-700">{records.length}</div>
              <div className="text-xs text-gray-600 font-sans mt-1">Serviceoppføringer</div>
            </div>
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">
                {totalCost > 0 ? `${Math.round(totalCost).toLocaleString("nb-NO")}` : "—"}
              </div>
              <div className="text-xs text-gray-600 font-sans mt-1">Service (NOK)</div>
            </div>
            <div className="p-3 bg-purple-50 rounded border border-purple-200">
              <div className="text-2xl font-bold text-purple-700">
                {totalReceiptAmount > 0 ? `${Math.round(totalReceiptAmount).toLocaleString("nb-NO")}` : "—"}
              </div>
              <div className="text-xs text-gray-600 font-sans mt-1">Kvitteringer (NOK)</div>
            </div>
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="text-2xl font-bold text-green-700">
                {totalTripKm > 0 ? `${Math.round(totalTripKm).toLocaleString("nb-NO")} km` : "—"}
              </div>
              <div className="text-xs text-gray-600 font-sans mt-1">Loggede turer</div>
            </div>
          </div>
        </div>

        {/* Service history */}
        <div className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-4 font-sans">Servicehistorikk</h2>
          {records.length === 0 ? (
            <p className="text-gray-500 italic text-sm">Ingen serviceoppføringer registrert.</p>
          ) : (
            <div className="space-y-4">
              {records.map((record, i) => (
                <div
                  key={record.id}
                  className={`p-4 rounded border ${i % 2 === 0 ? "bg-gray-50" : "bg-white"} border-gray-200`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-bold text-base">{record.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 font-sans mt-0.5">
                        <span>
                          {new Date(record.serviceDate).toLocaleDateString("nb-NO", {
                            day: "numeric", month: "long", year: "numeric",
                          })}
                        </span>
                        {record.mileageAtService && (
                          <span>{record.mileageAtService.toLocaleString("nb-NO")} km</span>
                        )}
                        <span className="italic">{CATEGORY_LABEL[record.category] ?? record.category}</span>
                        {record.performedBy && <span>Utført av: {record.performedBy}</span>}
                      </div>
                    </div>
                    {record.cost && (
                      <div className="text-right shrink-0">
                        <div className="font-bold text-amber-700">{parseFloat(record.cost).toLocaleString("nb-NO")} kr</div>
                      </div>
                    )}
                  </div>
                  {record.description && (
                    <p className="text-sm text-gray-700 leading-relaxed">{record.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Receipts summary */}
        {receipts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-4 font-sans">Kvitteringer ({receipts.length})</h2>
            <div className="space-y-2">
              {receipts.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 text-sm">
                  <div>
                    <span className="font-medium">{r.title}</span>
                    {r.vendor && <span className="text-gray-500 text-xs ml-2">· {r.vendor}</span>}
                    {r.receiptDate && (
                      <span className="text-gray-400 text-xs ml-2">
                        {new Date(r.receiptDate).toLocaleDateString("nb-NO")}
                      </span>
                    )}
                  </div>
                  {r.amount && (
                    <span className="font-semibold text-purple-700">{parseFloat(r.amount).toLocaleString("nb-NO")} kr</span>
                  )}
                </div>
              ))}
              <div className="flex justify-between font-bold text-sm pt-1">
                <span>Totalt kvitteringer</span>
                <span className="text-purple-700">{Math.round(totalReceiptAmount).toLocaleString("nb-NO")} kr</span>
              </div>
            </div>
          </div>
        )}

        {/* Trip logs summary */}
        {trips.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold border-b border-gray-300 pb-1 mb-4 font-sans">Turer ({trips.length})</h2>
            <div className="space-y-2">
              {trips.slice(0, 10).map((t) => (
                <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs">{new Date(t.date).toLocaleDateString("nb-NO")}</span>
                    {t.description && <span className="ml-2 text-gray-700">{t.description}</span>}
                  </div>
                  {t.distanceKm && (
                    <span className="font-semibold text-green-700">{parseFloat(t.distanceKm).toLocaleString("nb-NO")} km</span>
                  )}
                </div>
              ))}
              {trips.length > 10 && (
                <p className="text-xs text-gray-400 italic">… og {trips.length - 10} flere turer</p>
              )}
              <div className="flex justify-between font-bold text-sm pt-1">
                <span>Totalt kjørt</span>
                <span className="text-green-700">{Math.round(totalTripKm).toLocaleString("nb-NO")} km</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-400 font-sans">
          <p>Generert fra DriveGarage • {new Date().toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>
    </>
  );
}
