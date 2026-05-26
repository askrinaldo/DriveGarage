import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Shield, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useClubAuth } from "@/hooks/use-club-auth";
import { LoadingState, ErrorState } from "@/components/ui-states";

interface AuditLog {
  id: number;
  clubId: number | null;
  actorName: string;
  action: string;
  targetType: string | null;
  targetId: number | null;
  targetName: string | null;
  metadata: string | null;
  createdAt: string;
}

interface Params { id: string }

const ACTION_COLORS: Record<string, string> = {
  "club.created": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "club.updated": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "club.deleted": "bg-red-500/20 text-red-300 border-red-500/30",
  "member.joined": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "member.left": "bg-slate-500/20 text-slate-300 border-slate-500/30",
  "member.removed": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "member.role_changed": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "invitation.created": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "invitation.revoked": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "invitation.accepted": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "forum.post_created": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "forum.post_deleted": "bg-red-500/20 text-red-300 border-red-500/30",
  "forum.post_pinned": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "forum.post_unpinned": "bg-slate-500/20 text-slate-300 border-slate-500/30",
  "forum.comment_deleted": "bg-red-500/20 text-red-300 border-red-500/30",
  "auth.login": "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const ACTION_LABELS: Record<string, string> = {
  "club.created": "Klubb opprettet",
  "club.updated": "Klubb redigert",
  "club.deleted": "Klubb slettet",
  "member.joined": "Ble medlem",
  "member.left": "Forlot klubb",
  "member.removed": "Fjernet fra klubb",
  "member.role_changed": "Rolle endret",
  "invitation.created": "Invitasjon sendt",
  "invitation.revoked": "Invitasjon trukket",
  "invitation.accepted": "Invitasjon akseptert",
  "forum.post_created": "Innlegg publisert",
  "forum.post_deleted": "Innlegg slettet",
  "forum.post_pinned": "Innlegg festet",
  "forum.post_unpinned": "Innlegg løsnet",
  "forum.comment_deleted": "Kommentar slettet",
  "auth.login": "Innlogget",
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Akkurat nå";
  if (mins < 60) return `${mins} min siden`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} t siden`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} d siden`;
  return new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

const PAGE_SIZE = 25;

export default function ClubAuditLog() {
  const params = useParams<Params>();
  const clubId = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { session, hasRole } = useClubAuth(clubId);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    setError(false);
    fetch(`/api/clubs/${clubId}/audit-log`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<AuditLog[]>;
      })
      .then((data) => { setLogs(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [clubId, session]);

  if (!session || !hasRole("admin")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <Shield className="w-10 h-10 text-muted-foreground/50 mx-auto" />
            <h2 className="text-lg font-bold">Ingen tilgang</h2>
            <p className="text-muted-foreground text-sm">Du trenger admin- eller eierrolle for å se revisjonloggen.</p>
            <Button variant="outline" onClick={() => navigate(`/clubs/${clubId}`)}>
              Tilbake til klubb
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filtered = logs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.actorName.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (l.targetName?.toLowerCase().includes(q) ?? false)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/clubs/${clubId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Revisjonslogg
          </h1>
          <p className="text-sm text-muted-foreground">Alle handlinger utført i klubben</p>
        </div>
        <Badge variant="secondary">{filtered.length} oppføringer</Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Filtrer etter navn, handling..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Laster revisjonslogg..." />
      ) : error ? (
        <ErrorState onRetry={() => { setError(false); setLoading(true); }} />
      ) : paginated.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Ingen oppføringer funnet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((log) => {
            let metadata: Record<string, unknown> | null = null;
            try { if (log.metadata) metadata = JSON.parse(log.metadata); } catch { /* ok */ }

            return (
              <div
                key={log.id}
                className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border/50 bg-card hover:bg-muted/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{log.actorName}</span>
                    <Badge
                      variant="outline"
                      className={`text-[11px] px-1.5 py-0 ${ACTION_COLORS[log.action] ?? "bg-muted/30 text-muted-foreground"}`}
                    >
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                    {log.targetName && (
                      <span className="text-sm text-muted-foreground truncate">
                        → {log.targetName}
                      </span>
                    )}
                    {metadata && typeof metadata.oldRole === "string" && typeof metadata.newRole === "string" && (
                      <span className="text-xs text-muted-foreground">
                        ({metadata.oldRole} → {metadata.newRole})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(log.createdAt)}</p>
                </div>
                <span className="text-[11px] text-muted-foreground/60 shrink-0 pt-0.5">
                  #{log.id}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">Side {page} av {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
