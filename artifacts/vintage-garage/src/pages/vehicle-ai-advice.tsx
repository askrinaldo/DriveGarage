import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Sparkles, Loader2, AlertCircle, RefreshCw, Bot,
  Car, Bike, Gauge, Calendar, Wrench, CheckCircle2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUserAuth } from "@/hooks/use-user-auth";
import { format } from "date-fns";

interface Params { id: string }

interface VehicleSummary {
  make: string;
  model: string;
  year: number | null;
  type: string;
  mileage: number | null;
}

interface ServiceSummary {
  serviceDate: string;
  title: string;
  category: string;
}

export default function VehicleAiAdvice() {
  const { t } = useTranslation();
  const params = useParams<Params>();
  const vehicleId = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { getAuthHeaders, isAuthenticated, isAuthLoading } = useUserAuth();

  const [advice, setAdvice] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "rule_based" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [vehicle, setVehicle] = useState<VehicleSummary | null>(null);
  const [recentServices, setRecentServices] = useState<ServiceSummary[]>([]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;
    void (async () => {
      try {
        const headers = await getAuthHeaders();
        const [v, sr] = await Promise.all([
          fetch(`/api/vehicles/${vehicleId}`, { headers }).then(r => r.ok ? r.json() as Promise<VehicleSummary> : null),
          fetch(`/api/vehicles/${vehicleId}/service-records`, { headers }).then(r => r.ok ? r.json() as Promise<ServiceSummary[]> : []),
        ]);
        if (v) setVehicle(v);
        if (Array.isArray(sr)) {
          setRecentServices(
            [...sr]
              .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())
              .slice(0, 5)
          );
        }
      } catch { /* non-fatal */ }
    })();
  }, [vehicleId, isAuthenticated, isAuthLoading, getAuthHeaders]);

  async function loadAdvice() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/maintenance-advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { advice: string; source: "ai" | "rule_based" };
      setAdvice(data.advice);
      setSource(data.source);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function renderMarkdown(text: string): React.ReactNode[] {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) {
        return (
          <div key={i} className="flex items-center gap-2 mt-6 mb-3 first:mt-2">
            <div className="w-1 h-5 bg-primary rounded-full shrink-0" />
            <h2 className="text-sm font-bold text-foreground">{line.slice(3)}</h2>
          </div>
        );
      }
      if (line.startsWith("### ")) {
        return <h3 key={i} className="text-sm font-semibold mt-4 mb-1.5 text-foreground/90">{line.slice(4)}</h3>;
      }
      if (line.startsWith("- **")) {
        const match = line.match(/^- \*\*(.+?)\*\*(.*)$/);
        if (match) {
          return (
            <div key={i} className="flex gap-2.5 mb-2 pl-1">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed">
                <span className="font-semibold text-foreground">{match[1]}</span>
                <span className="text-muted-foreground">{match[2]}</span>
              </p>
            </div>
          );
        }
      }
      if (line.startsWith("- ")) {
        return (
          <div key={i} className="flex gap-2.5 mb-1.5 pl-1">
            <span className="text-primary mt-1 shrink-0 text-xs">●</span>
            <p className="text-sm text-muted-foreground leading-relaxed">{line.slice(2)}</p>
          </div>
        );
      }
      if (line.trim() === "") return <div key={i} className="h-2" />;
      return <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-1.5">{line}</p>;
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/vehicles/${vehicleId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{t("aiAdvice.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("aiAdvice.subtitle")}</p>
        </div>
        {source && (
          <Badge variant="outline" className={source === "ai"
            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
            : "border-border text-muted-foreground"
          }>
            {source === "ai" ? <Sparkles className="w-3 h-3 mr-1.5" /> : <Bot className="w-3 h-3 mr-1.5" />}
            {source === "ai" ? "AI" : "Regelbasert"}
          </Badge>
        )}
      </div>

      {/* Vehicle context card */}
      {vehicle && (
        <Card className="border-border/60 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                {vehicle.type === "motorcycle"
                  ? <Bike className="w-5 h-5 text-foreground" />
                  : <Car className="w-5 h-5 text-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {vehicle.mileage && (
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3" />
                      {vehicle.mileage.toLocaleString("nb-NO")} km
                    </span>
                  )}
                  {recentServices.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Sist: {format(new Date(recentServices[0]!.serviceDate), "dd.MM.yyyy")}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    {recentServices.length === 0 ? "Ingen serviceposter" : `${recentServices.length} nylige poster`}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent service pills */}
            {recentServices.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/40">
                {recentServices.map((s, i) => (
                  <span key={i} className="text-[10px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full border border-border/40">
                    {s.title}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Initial prompt */}
      {!advice && !loading && !error && (
        <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">{t("aiAdvice.readyTitle")}</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
              {t("aiAdvice.readyDesc")}
            </p>
            <Button onClick={loadAdvice} size="lg" className="px-8">
              <Sparkles className="w-4 h-4 mr-2" />
              {t("aiAdvice.generate")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card className="border-border/50">
          <CardContent className="pt-10 pb-10 text-center space-y-3">
            <div className="relative w-12 h-12 mx-auto">
              <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
              <Sparkles className="w-5 h-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-sm font-medium">{t("aiAdvice.analyzing")}</p>
            <p className="text-xs text-muted-foreground">Analyserer servicehistorikk og kjøretøydata…</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">{t("aiAdvice.errorTitle")}</p>
            <p className="text-xs text-muted-foreground mb-4">{t("aiAdvice.errorDesc")}</p>
            <Button variant="outline" onClick={loadAdvice}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {t("aiAdvice.retry")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Advice result */}
      {advice && (
        <>
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {source === "ai" ? (
                  <>
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    </div>
                    {t("aiAdvice.aiLabel")}
                    <span className="ml-auto text-[10px] font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {t("aiAdvice.aiGenerated")}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    {t("aiAdvice.ruleLabel")}
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border border-border">
                      {t("aiAdvice.ruleBased")}
                    </span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0.5">
                {renderMarkdown(advice)}
              </div>
            </CardContent>
          </Card>

          {source === "rule_based" && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-300/90">
                    <span className="font-semibold">{t("aiAdvice.noAiNote")}</span>{" "}
                    {t("aiAdvice.noAiDesc")}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between pb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/vehicles/${vehicleId}`)}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Tilbake til kjøretøy
            </Button>
            <Button variant="outline" size="sm" onClick={loadAdvice}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {t("aiAdvice.refresh")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
