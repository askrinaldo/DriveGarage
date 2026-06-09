import { useEffect, useState } from "react";
import { useParams } from "wouter";

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

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/vehicles/${vehicleId}`).then((r) => r.json() as Promise<Vehicle>),
      fetch(`/api/vehicles/${vehicleId}/service-records`).then((r) => r.json() as Promise<ServiceRecord[]>),
    ])
      .then(([v, sr]) => {
        setVehicle(v);
        setRecords(sr.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()));
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, [vehicleId]);

  useEffect(() => {
    if (!loading && !error && vehicle) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, error, vehicle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Forbereder servicebok...</p>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive">Kunne ikke laste kjøretøy.</p>
      </div>
    );
  }

  const totalCost = records
    .filter((r) => r.cost)
    .reduce((sum, r) => sum + parseFloat(r.cost!), 0);

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
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-amber-50 rounded border border-amber-200">
              <div className="text-2xl font-bold text-amber-700">{records.length}</div>
              <div className="text-xs text-gray-600 font-sans mt-1">Serviceoppføringer</div>
            </div>
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">
                {totalCost > 0 ? `${Math.round(totalCost).toLocaleString("nb-NO")}` : "—"}
              </div>
              <div className="text-xs text-gray-600 font-sans mt-1">Total kostnad (NOK)</div>
            </div>
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="text-2xl font-bold text-green-700">
                {records.length > 0
                  ? new Date(records[records.length - 1]!.serviceDate).getFullYear()
                  : "—"}
              </div>
              <div className="text-xs text-gray-600 font-sans mt-1">Første service</div>
            </div>
          </div>
        </div>

        {/* Service history */}
        <div>
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

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-400 font-sans">
          <p>Generert fra DriveGarage • {new Date().toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>
    </>
  );
}
