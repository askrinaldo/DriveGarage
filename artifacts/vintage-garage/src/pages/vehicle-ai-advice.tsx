import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Loader2, AlertCircle, RefreshCw, Bot } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Params { id: string }

export default function VehicleAiAdvice() {
  const { t } = useTranslation();
  const params = useParams<Params>();
  const vehicleId = parseInt(params.id, 10);
  const [, navigate] = useLocation();

  const [advice, setAdvice] = useState<string | null>(null);
  const [source, setSource] = useState<"ai" | "rule_based" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

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
        return <h2 key={i} className="text-base font-bold mt-5 mb-2 text-foreground">{line.slice(3)}</h2>;
      }
      if (line.startsWith("### ")) {
        return <h3 key={i} className="text-sm font-semibold mt-4 mb-1.5 text-foreground/90">{line.slice(4)}</h3>;
      }
      if (line.startsWith("- **")) {
        const match = line.match(/^- \*\*(.+?)\*\*(.*)$/);
        if (match) {
          return (
            <div key={i} className="flex gap-2 mb-1.5">
              <span className="text-primary mt-0.5 shrink-0">•</span>
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
          <div key={i} className="flex gap-2 mb-1.5">
            <span className="text-primary mt-0.5 shrink-0">•</span>
            <p className="text-sm text-muted-foreground leading-relaxed">{line.slice(2)}</p>
          </div>
        );
      }
      if (line.trim() === "") return <div key={i} className="h-1" />;
      return <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-1">{line}</p>;
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/vehicles/${vehicleId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{t("aiAdvice.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("aiAdvice.subtitle")}</p>
        </div>
      </div>

      {!advice && !loading && !error && (
        <Card className="border-primary/20">
          <CardContent className="pt-10 pb-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">{t("aiAdvice.readyTitle")}</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
              {t("aiAdvice.readyDesc")}
            </p>
            <Button onClick={loadAdvice} size="lg">
              <Sparkles className="w-4 h-4 mr-2" />
              {t("aiAdvice.generate")}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">{t("aiAdvice.analyzing")}</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/20">
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

      {advice && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {source === "ai" ? (
                  <>
                    <Sparkles className="w-4 h-4 text-primary" />
                    {t("aiAdvice.aiLabel")}
                    <span className="ml-auto text-[10px] font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {t("aiAdvice.aiGenerated")}
                    </span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 text-primary" />
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

          <div className="flex justify-center pb-4">
            <Button variant="outline" onClick={loadAdvice} size="sm">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              {t("aiAdvice.refresh")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
