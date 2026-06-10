import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Car, Wrench, Star, Medal, Crown } from "lucide-react";
import { LoadingState } from "@/components/ui-states";
import { useTranslation } from "react-i18next";

interface LeaderEntry {
  id: number;
  name: string;
  subscriptionTier: "free" | "standard" | "premium";
  createdAt: string;
  vehicles: number;
  services: number;
  score: number;
}

const TIER_COLORS: Record<string, string> = {
  free: "text-muted-foreground bg-muted/30 border-border",
  standard: "text-blue-400 bg-blue-500/15 border-blue-500/30",
  premium: "text-amber-400 bg-amber-500/15 border-amber-500/30",
};

function getInitials(name: string) {
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="w-5 h-5 text-amber-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
}

export default function Leaderboard() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const TIER_LABELS: Record<string, string> = {
    free: t("leaderboard.tierFree"),
    standard: t("leaderboard.tierStandard"),
    premium: t("leaderboard.tierPremium"),
  };

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/profile/leaderboard");
      if (res.ok) setEntries(await res.json() as LeaderEntry[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingState message={t("leaderboard.loading")} />;

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  void rest;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">{t("leaderboard.title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("leaderboard.subtitle")}</p>
        </div>
      </div>

      {/* Podium top 3 */}
      {top3.length >= 1 && (
        <div className="grid grid-cols-3 gap-3 items-end">
          {/* 2nd place */}
          {top3[1] ? (
            <div className="flex flex-col items-center gap-2 pb-2">
              <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center font-bold text-muted-foreground border-2 border-gray-500/30">
                {getInitials(top3[1].name)}
              </div>
              <div className="text-center">
                <p className="font-medium text-sm truncate max-w-[100px]">{top3[1].name}</p>
                <p className="text-xs text-muted-foreground">{top3[1].score} p</p>
              </div>
              <div className="w-full rounded-t-lg py-3 text-center bg-muted/20 border border-border">
                <Medal className="w-4 h-4 mx-auto text-gray-300 mb-1" />
                <span className="text-xs font-bold text-muted-foreground">2.</span>
              </div>
            </div>
          ) : <div />}

          {/* 1st place */}
          {top3[0] && (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-amber-400 border-2 border-amber-500/50"
                style={{ background: "rgba(184,115,51,0.15)" }}
              >
                {getInitials(top3[0].name)}
              </div>
              <div className="text-center">
                <p className="font-semibold truncate max-w-[100px]">{top3[0].name}</p>
                <p className="text-sm text-primary font-bold">{top3[0].score} p</p>
              </div>
              <div
                className="w-full rounded-t-lg py-4 text-center border"
                style={{ background: "rgba(184,115,51,0.1)", borderColor: "rgba(184,115,51,0.3)" }}
              >
                <Crown className="w-5 h-5 mx-auto text-amber-400 mb-1" />
                <span className="text-xs font-bold text-amber-400">1.</span>
              </div>
            </div>
          )}

          {/* 3rd place */}
          {top3[2] ? (
            <div className="flex flex-col items-center gap-2 pb-1">
              <div className="w-11 h-11 rounded-full bg-muted/30 flex items-center justify-center font-bold text-muted-foreground border-2 border-amber-700/30">
                {getInitials(top3[2].name)}
              </div>
              <div className="text-center">
                <p className="font-medium text-sm truncate max-w-[100px]">{top3[2].name}</p>
                <p className="text-xs text-muted-foreground">{top3[2].score} p</p>
              </div>
              <div className="w-full rounded-t-lg py-2 text-center bg-muted/20 border border-border">
                <Medal className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                <span className="text-xs font-bold text-muted-foreground">3.</span>
              </div>
            </div>
          ) : <div />}
        </div>
      )}

      {/* Full table */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm">{t("leaderboard.allRankings")}</CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Trophy className="w-8 h-8 mx-auto mb-3 opacity-30" />
              {t("leaderboard.noUsers")}
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {entries.map((entry, i) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 py-3 ${i < 3 ? "bg-gradient-to-r from-primary/5 to-transparent" : ""}`}
                >
                  <div className="w-8 flex justify-center shrink-0">
                    <RankIcon rank={i + 1} />
                  </div>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                    style={{
                      background: i === 0 ? "rgba(184,115,51,0.15)" : "rgba(255,255,255,0.05)",
                      color: i === 0 ? "#b87333" : undefined,
                      border: i === 0 ? "1px solid rgba(184,115,51,0.3)" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {getInitials(entry.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{entry.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={`text-[10px] ${TIER_COLORS[entry.subscriptionTier]}`}>
                        {entry.subscriptionTier === "premium" && <Star className="w-2.5 h-2.5 mr-0.5" />}
                        {TIER_LABELS[entry.subscriptionTier]}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    <div className="flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      <span>{entry.vehicles}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      <span>{entry.services}</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-primary min-w-[50px] justify-end">
                      <Star className="w-3 h-3" />
                      <span>{entry.score}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="rounded-lg border border-border bg-muted/10 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground mb-2">{t("leaderboard.pointsTitle")}</p>
        <div className="grid grid-cols-2 gap-1">
          <span>🚗 {t("leaderboard.vehiclePoints")}</span><span className="font-mono">× 50 p</span>
          <span>🔧 {t("leaderboard.servicePoints")}</span><span className="font-mono">× 10 p</span>
          <span>⭐ {t("leaderboard.projectPoints")}</span><span className="font-mono">+ 200 p</span>
        </div>
      </div>
    </div>
  );
}
