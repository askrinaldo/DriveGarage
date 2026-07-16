import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useUserAuth } from "@/hooks/use-user-auth";

interface ServiceRecord {
  id: number;
  title: string;
  description: string | null;
  serviceDate: string;
  mileageAtService: number | null;
  cost: number | null;
  category: string;
  performedBy: string | null;
}

interface Receipt {
  id: number;
  title: string;
  amount: number | null;
  receiptDate: string | null;
  vendor: string | null;
  notes: string | null;
}

interface TripLog {
  id: number;
  tripDate: string;
  distanceKm: number | null;
  fromLocation: string | null;
  toLocation: string | null;
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

const CATEGORY_BG: Record<string, string> = {
  "oil-change": "#fef9c3",
  brakes: "#fee2e2",
  tires: "#f3f4f6",
  engine: "#fff7ed",
  electrical: "#eff6ff",
  bodywork: "#faf5ff",
  other: "#f8fafc",
};

const CATEGORY_COLOR: Record<string, string> = {
  "oil-change": "#a16207",
  brakes: "#b91c1c",
  tires: "#374151",
  engine: "#c2410c",
  electrical: "#1d4ed8",
  bodywork: "#7e22ce",
  other: "#475569",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nb-NO");
}

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
      setTimeout(() => window.print(), 600);
    }
  }, [loading, error, vehicle]);

  if (isAuthLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Forbereder servicehefte…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600 text-sm">Du må være innlogget for å laste ned servicehefte.</p>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-600 text-sm">Kunne ikke laste kjøretøy. Sjekk at du har tilgang.</p>
      </div>
    );
  }

  const totalServiceCost = records.filter(r => r.cost !== null).reduce((s, r) => s + (r.cost ?? 0), 0);
  const totalReceiptAmount = receipts.filter(r => r.amount !== null).reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalTripKm = trips.filter(t => t.distanceKm !== null).reduce((s, t) => s + (t.distanceKm ?? 0), 0);

  /* Category breakdown */
  const categoryBreakdown = Object.entries(
    records.reduce<Record<string, { count: number; cost: number }>>((acc, r) => {
      const key = r.category;
      if (!acc[key]) acc[key] = { count: 0, cost: 0 };
      acc[key]!.count++;
      acc[key]!.cost += r.cost ?? 0;
      return acc;
    }, {})
  ).sort(([, a], [, b]) => b.cost - a.cost);

  /* Group records by year */
  const recordsByYear = Object.entries(
    records.reduce<Record<number, ServiceRecord[]>>((acc, r) => {
      const yr = new Date(r.serviceDate).getFullYear();
      if (!acc[yr]) acc[yr] = [];
      acc[yr]!.push(r);
      return acc;
    }, {})
  ).sort(([a], [b]) => Number(b) - Number(a));

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        @media print {
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; break-after: page; }
          .avoid-break { page-break-inside: avoid; break-inside: avoid; }
        }
        @page { margin: 16mm 18mm; size: A4; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; }
        h1, h2, h3 { font-weight: 700; }
      `}</style>

      {/* ── Screen controls ─────────────────────────────────── */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">
            Servicehefte — {vehicle.make} {vehicle.model} {vehicle.year}
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            Forhåndsvisning
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            ← Tilbake
          </button>
          <button
            onClick={() => window.print()}
            className="text-sm font-medium bg-amber-600 text-white px-4 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Skriv ut / Lagre PDF
          </button>
        </div>
      </div>

      {/* ── Document ─────────────────────────────────────────── */}
      <div className="no-print h-16" /> {/* spacer for fixed bar */}
      <div className="max-w-[720px] mx-auto p-8 bg-white text-black min-h-screen">

        {/* ══ Cover page ══════════════════════════════════════ */}
        <div className="page-break">
          {/* Brand strip */}
          <div style={{ background: "linear-gradient(135deg, #92400e 0%, #d97706 100%)", borderRadius: "12px", padding: "20px 28px", marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ color: "#fde68a", fontSize: "10px", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "4px" }}>
                  DriveGarage
                </div>
                <div style={{ color: "#fff", fontSize: "11px", opacity: 0.8 }}>Digital Servicehefte</div>
              </div>
              <div style={{ color: "#fde68a", fontSize: "28px", fontWeight: 900, letterSpacing: "-1px", opacity: 0.9 }}>
                DG
              </div>
            </div>
          </div>

          {/* Vehicle name */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "36px", fontWeight: 900, letterSpacing: "-1px", lineHeight: 1.1, marginBottom: "8px" }}>
              {vehicle.make} {vehicle.model}
            </div>
            {vehicle.year && (
              <div style={{ fontSize: "20px", color: "#6b7280", fontWeight: 500 }}>{vehicle.year}</div>
            )}
          </div>

          {/* Vehicle image */}
          {vehicle.imageUrl && (
            <div style={{ borderRadius: "12px", overflow: "hidden", marginBottom: "32px", height: "220px" }}>
              <img
                src={vehicle.imageUrl}
                alt={`${vehicle.make} ${vehicle.model}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}

          {/* Info grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "0", border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden",
            marginBottom: "28px", fontSize: "13px"
          }}>
            {[
              ["Merke", vehicle.make],
              ["Modell", vehicle.model],
              ["Årsmodell", vehicle.year?.toString()],
              ["Type", vehicle.type === "motorcycle" ? "Motorsykkel" : "Bil"],
              ["Reg.nr.", vehicle.registrationNumber],
              ["Farge", vehicle.color],
              ["Km-stand", vehicle.mileage ? `${vehicle.mileage.toLocaleString("nb-NO")} km` : undefined],
            ].filter(([, v]) => v).map(([label, value], i) => (
              <div key={String(label)} style={{
                display: "flex", justifyContent: "space-between",
                padding: "10px 16px",
                background: i % 2 === 0 ? "#f9fafb" : "#fff",
                borderBottom: "1px solid #e5e7eb"
              }}>
                <span style={{ color: "#6b7280", fontWeight: 600 }}>{label}</span>
                <span style={{ fontWeight: 700 }}>{String(value)}</span>
              </div>
            ))}
          </div>

          {vehicle.notes && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "14px 16px", marginBottom: "28px", fontSize: "13px", color: "#92400e" }}>
              <div style={{ fontWeight: 700, marginBottom: "4px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>Notater</div>
              {vehicle.notes}
            </div>
          )}

          {/* Summary stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "28px" }}>
            {[
              { label: "Serviceposter", value: records.length.toString(), color: "#d97706", bg: "#fffbeb" },
              { label: "Servicekostnad", value: totalServiceCost > 0 ? `${Math.round(totalServiceCost).toLocaleString("nb-NO")} kr` : "—", color: "#1d4ed8", bg: "#eff6ff" },
              { label: "Kvitteringer", value: receipts.length.toString(), color: "#7e22ce", bg: "#faf5ff" },
              { label: "Loggede km", value: totalTripKm > 0 ? `${Math.round(totalTripKm).toLocaleString("nb-NO")} km` : "—", color: "#059669", bg: "#f0fdf4" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ textAlign: "center", padding: "14px 8px", borderRadius: "10px", background: bg, border: `1px solid ${color}30` }}>
                <div style={{ fontSize: "20px", fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Category breakdown */}
          {categoryBreakdown.length > 0 && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#9ca3af", marginBottom: "10px" }}>
                Fordeling etter kategori
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {categoryBreakdown.map(([cat, { count, cost }]) => (
                  <div key={cat} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px", borderRadius: "8px",
                    background: CATEGORY_BG[cat] ?? "#f9fafb",
                    fontSize: "13px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{
                        fontWeight: 700, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px",
                        color: CATEGORY_COLOR[cat] ?? "#374151",
                        background: (CATEGORY_COLOR[cat] ?? "#374151") + "20",
                        padding: "2px 8px", borderRadius: "999px"
                      }}>
                        {CATEGORY_LABEL[cat] ?? cat}
                      </span>
                      <span style={{ color: "#6b7280", fontSize: "12px" }}>{count} {count === 1 ? "post" : "poster"}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: "#111" }}>
                      {cost > 0 ? `${Math.round(cost).toLocaleString("nb-NO")} kr` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: "40px", paddingTop: "16px", borderTop: "1px solid #e5e7eb", textAlign: "center", fontSize: "11px", color: "#9ca3af" }}>
            Generert fra DriveGarage · {new Date().toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* ══ Service history ══════════════════════════════════ */}
        {records.length > 0 && (
          <div className="page-break" style={{ paddingTop: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#d97706", marginBottom: "4px" }}>
                  Servicehistorikk
                </div>
                <div style={{ fontSize: "22px", fontWeight: 900 }}>{vehicle.make} {vehicle.model}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: "12px", color: "#6b7280" }}>
                <div>{records.length} poster</div>
                {totalServiceCost > 0 && (
                  <div style={{ fontWeight: 700, color: "#111" }}>
                    kr {Math.round(totalServiceCost).toLocaleString("nb-NO")} totalt
                  </div>
                )}
              </div>
            </div>

            {recordsByYear.map(([year, yearRecords]) => (
              <div key={year} className="avoid-break" style={{ marginBottom: "28px" }}>
                {/* Year header */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  marginBottom: "12px", paddingBottom: "8px", borderBottom: "2px solid #f3f4f6"
                }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "8px",
                    background: "linear-gradient(135deg, #92400e, #d97706)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontWeight: 900, fontSize: "13px"
                  }}>
                    {String(year).slice(2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "15px" }}>{year}</div>
                    <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                      {yearRecords!.length} {yearRecords!.length === 1 ? "post" : "poster"}
                      {yearRecords!.some(r => r.cost) && (
                        ` · kr ${Math.round(yearRecords!.reduce((s, r) => s + (r.cost ?? 0), 0)).toLocaleString("nb-NO")}`
                      )}
                    </div>
                  </div>
                </div>

                {/* Records */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {yearRecords!.map((record) => (
                    <div
                      key={record.id}
                      className="avoid-break"
                      style={{
                        padding: "14px 16px", borderRadius: "10px",
                        background: CATEGORY_BG[record.category] ?? "#f9fafb",
                        border: `1px solid ${(CATEGORY_COLOR[record.category] ?? "#374151")}20`
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: record.description ? "8px" : "0" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                            <span style={{
                              fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
                              color: CATEGORY_COLOR[record.category] ?? "#374151",
                              background: (CATEGORY_COLOR[record.category] ?? "#374151") + "18",
                              padding: "2px 8px", borderRadius: "999px"
                            }}>
                              {CATEGORY_LABEL[record.category] ?? record.category}
                            </span>
                            <span style={{ fontSize: "12px", color: "#6b7280" }}>
                              {formatDate(record.serviceDate)}
                            </span>
                            {record.mileageAtService && (
                              <span style={{ fontSize: "12px", color: "#6b7280", fontFamily: "monospace" }}>
                                {record.mileageAtService.toLocaleString("nb-NO")} km
                              </span>
                            )}
                            {record.performedBy && (
                              <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                                Utført av: {record.performedBy}
                              </span>
                            )}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: "14px" }}>{record.title}</div>
                        </div>
                        {record.cost !== null && (
                          <div style={{ textAlign: "right", fontWeight: 900, fontSize: "15px", color: CATEGORY_COLOR[record.category] ?? "#111", whiteSpace: "nowrap" }}>
                            {record.cost.toLocaleString("nb-NO")} kr
                          </div>
                        )}
                      </div>
                      {record.description && (
                        <div style={{ fontSize: "12px", color: "#374151", lineHeight: 1.6, marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${(CATEGORY_COLOR[record.category] ?? "#374151")}15` }}>
                          {record.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Service total */}
            {totalServiceCost > 0 && (
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 16px", background: "#fffbeb", borderRadius: "10px",
                border: "1px solid #fde68a", fontWeight: 700, fontSize: "14px"
              }}>
                <span>Total servicekostnad ({records.length} poster)</span>
                <span style={{ color: "#92400e", fontSize: "18px" }}>
                  kr {Math.round(totalServiceCost).toLocaleString("nb-NO")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ══ Receipts ═════════════════════════════════════════ */}
        {receipts.length > 0 && (
          <div style={{ paddingTop: "32px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#7e22ce", marginBottom: "4px" }}>
              Kvitteringer
            </div>
            <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "16px" }}>
              {receipts.length} dokumenter
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#faf5ff", textAlign: "left" }}>
                  {["Tittel", "Leverandør", "Dato", "Beløp"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", fontWeight: 700, color: "#374151", borderBottom: "2px solid #e9d5ff" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {receipts.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#faf5ff" }}>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", fontWeight: 600 }}>{r.title}</td>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", color: "#6b7280" }}>{r.vendor ?? "—"}</td>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", color: "#6b7280" }}>
                      {r.receiptDate ? formatShortDate(r.receiptDate) : "—"}
                    </td>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", fontWeight: 700, textAlign: "right", color: "#7e22ce" }}>
                      {r.amount !== null ? `${r.amount.toLocaleString("nb-NO")} kr` : "—"}
                    </td>
                  </tr>
                ))}
                {totalReceiptAmount > 0 && (
                  <tr style={{ background: "#f3e8ff" }}>
                    <td colSpan={3} style={{ padding: "10px 12px", fontWeight: 700 }}>Totalt kvitteringer</td>
                    <td style={{ padding: "10px 12px", fontWeight: 900, textAlign: "right", color: "#7e22ce", fontSize: "14px" }}>
                      {Math.round(totalReceiptAmount).toLocaleString("nb-NO")} kr
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ══ Trip logs ════════════════════════════════════════ */}
        {trips.length > 0 && (
          <div style={{ paddingTop: "32px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#059669", marginBottom: "4px" }}>
              Kjørebok
            </div>
            <div style={{ fontSize: "18px", fontWeight: 800, marginBottom: "16px" }}>
              {trips.length} turer · {Math.round(totalTripKm).toLocaleString("nb-NO")} km totalt
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f0fdf4", textAlign: "left" }}>
                  {["Dato", "Rute", "Kilometer"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", fontWeight: 700, color: "#374151", borderBottom: "2px solid #bbf7d0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trips.slice(0, 20).map((t, i) => (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? "#fff" : "#f0fdf4" }}>
                    <td style={{ padding: "7px 12px", borderBottom: "1px solid #e5e7eb", color: "#6b7280" }}>
                      {formatShortDate(t.tripDate)}
                    </td>
                    <td style={{ padding: "7px 12px", borderBottom: "1px solid #e5e7eb" }}>
                      {t.fromLocation && t.toLocation
                        ? `${t.fromLocation} → ${t.toLocation}`
                        : t.fromLocation ?? t.toLocation ?? "—"}
                    </td>
                    <td style={{ padding: "7px 12px", borderBottom: "1px solid #e5e7eb", fontWeight: 700, textAlign: "right", color: "#059669", fontFamily: "monospace" }}>
                      {t.distanceKm !== null ? `${t.distanceKm.toLocaleString("nb-NO")} km` : "—"}
                    </td>
                  </tr>
                ))}
                {trips.length > 20 && (
                  <tr>
                    <td colSpan={3} style={{ padding: "8px 12px", color: "#9ca3af", fontSize: "11px", fontStyle: "italic" }}>
                      … og {trips.length - 20} flere turer
                    </td>
                  </tr>
                )}
                <tr style={{ background: "#dcfce7" }}>
                  <td colSpan={2} style={{ padding: "10px 12px", fontWeight: 700 }}>Totalt kjørt</td>
                  <td style={{ padding: "10px 12px", fontWeight: 900, textAlign: "right", color: "#059669", fontSize: "14px", fontFamily: "monospace" }}>
                    {Math.round(totalTripKm).toLocaleString("nb-NO")} km
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ══ Document footer ══════════════════════════════════ */}
        <div style={{ marginTop: "48px", paddingTop: "16px", borderTop: "2px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#9ca3af" }}>
          <div>
            <strong style={{ color: "#374151" }}>DriveGarage</strong> — Digital Servicehefte
          </div>
          <div>
            {vehicle.make} {vehicle.model} {vehicle.year}
            {vehicle.registrationNumber && ` · ${vehicle.registrationNumber}`}
            {" · "}
            Generert {new Date().toLocaleDateString("nb-NO")}
          </div>
        </div>
      </div>
    </>
  );
}
