import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/ui-states";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, Car, Building2, BarChart3, Search, Shield, ShieldOff,
  TrendingUp, MessageSquare, ArrowLeft, Crown, Ban, CircleCheck,
  Lightbulb, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";

interface User {
  id: number;
  name: string;
  email: string;
  role: "user" | "super_admin";
  isActive: boolean;
  createdAt: string;
}

interface Club {
  id: number;
  name: string;
  description: string | null;
  ownerName: string;
  location: string | null;
  isSuspended: boolean;
  suspendedReason: string | null;
  createdAt: string;
}

interface Stats {
  users: number;
  activeUsers: number;
  vehicles: number;
  clubs: number;
  posts: number;
  comments: number;
  admins: number;
}

interface AdminTicket {
  id: number;
  userId: number | null;
  userEmail: string;
  userName: string;
  title: string;
  description: string;
  category: "feil" | "spørsmål" | "annet";
  status: "open" | "answered" | "closed";
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

interface AdminSuggestion {
  id: number;
  userId: number | null;
  userEmail: string;
  userName: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "reviewed" | "implemented" | "declined";
  adminNote: string | null;
  createdAt: string;
}

const TICKET_STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: "Åpen", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  answered: { label: "Besvart", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
  closed: { label: "Lukket", color: "text-muted-foreground bg-muted/20 border-border" },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: "Lav", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  medium: { label: "Medium", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
  high: { label: "Høy", color: "text-red-400 bg-red-500/15 border-red-500/30" },
};

const SUGGESTION_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Venter", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  reviewed: { label: "Vurdert", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
  implemented: { label: "Implementert", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
  declined: { label: "Avslått", color: "text-muted-foreground bg-muted/20 border-border" },
};

function authHeader(token: string | null): Record<string, string> {
  if (!token) return {};
  return { "x-user-token": token };
}

function ClubRow({ club, token, onUpdate }: { club: Club; token: string | null; onUpdate: () => void }) {
  const [suspendReason, setSuspendReason] = useState("");

  async function doToggle() {
    await fetch(`/api/admin/clubs/${club.id}/suspend`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify({ suspend: !club.isSuspended, reason: suspendReason }),
    });
    setSuspendReason("");
    onUpdate();
  }

  return (
    <tr className={`hover:bg-muted/10 ${club.isSuspended ? "opacity-60" : ""}`}>
      <td className="px-4 py-3">
        <div>
          <Link href={`/clubs/${club.id}`} className="font-medium hover:text-primary transition-colors">
            {club.name}
          </Link>
          {club.isSuspended && club.suspendedReason && (
            <p className="text-[10px] text-amber-400 mt-0.5">{club.suspendedReason}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs">{club.ownerName}</td>
      <td className="px-4 py-3 text-muted-foreground text-xs">{club.location ?? "—"}</td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={`text-[10px] ${club.isSuspended ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"}`}
        >
          {club.isSuspended ? "Suspendert" : "Aktiv"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(club.createdAt).toLocaleDateString("nb-NO")}
      </td>
      <td className="px-4 py-3">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className={`h-7 text-xs ${club.isSuspended ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" : "text-amber-400 border-amber-500/30 hover:bg-amber-500/10"}`}
            >
              {club.isSuspended ? (
                <><CircleCheck className="w-3 h-3 mr-1" />Gjenåpne</>
              ) : (
                <><Ban className="w-3 h-3 mr-1" />Suspender</>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {club.isSuspended ? `Gjenåpne "${club.name}"?` : `Suspender "${club.name}"?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {club.isSuspended
                  ? "Klubben vil bli gjenåpnet og tilgjengelig for medlemmer igjen."
                  : "Klubben vil bli midlertidig suspendert. Dette kan angres."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {!club.isSuspended && (
              <Textarea
                placeholder="Årsak til suspendering (valgfritt)"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="text-sm"
                rows={2}
              />
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                onClick={doToggle}
                className={club.isSuspended ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}
              >
                {club.isSuspended ? "Gjenåpne" : "Suspender"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </td>
    </tr>
  );
}

export default function Admin() {
  const [, navigate] = useLocation();
  const { isSuperAdmin, token, isAuthenticated } = useUserAuth();
  const [userSearch, setUserSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [suggestions, setSuggestions] = useState<AdminSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicket, setExpandedTicket] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const headers = authHeader(token);
    const [usersRes, clubsRes, statsRes, ticketsRes, suggestionsRes] = await Promise.all([
      fetch("/api/admin/users", { headers }),
      fetch("/api/admin/clubs", { headers }),
      fetch("/api/admin/stats", { headers }),
      fetch("/api/admin/support/tickets", { headers }),
      fetch("/api/admin/suggestions", { headers }),
    ]);
    if (usersRes.ok) setUsers(await usersRes.json() as User[]);
    if (clubsRes.ok) setClubs(await clubsRes.json() as Club[]);
    if (statsRes.ok) setStats(await statsRes.json() as Stats);
    if (ticketsRes.ok) setTickets(await ticketsRes.json() as AdminTicket[]);
    if (suggestionsRes.ok) setSuggestions(await suggestionsRes.json() as AdminSuggestion[]);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    if (!isSuperAdmin) { navigate("/"); return; }
    void load();
  }, [isAuthenticated, isSuperAdmin, load, navigate]);

  async function toggleUser(user: User) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    void load();
  }

  async function toggleClubSuspension(club: Club, reason?: string) {
    await fetch(`/api/admin/clubs/${club.id}/suspend`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify({ suspend: !club.isSuspended, reason: reason ?? "" }),
    });
    void load();
  }

  const filteredUsers = users.filter(u =>
    !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) return <LoadingState message="Laster admin-panel..." />;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Super Admin</h1>
          </div>
          <p className="text-sm text-muted-foreground">Administrer hele plattformen</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Brukere", value: stats.users, icon: Users, color: "text-blue-400" },
            { label: "Aktive", value: stats.activeUsers, icon: TrendingUp, color: "text-emerald-400" },
            { label: "Kjøretøy", value: stats.vehicles, icon: Car, color: "text-primary" },
            { label: "Klubber", value: stats.clubs, icon: Building2, color: "text-amber-400" },
            { label: "Innlegg", value: stats.posts, icon: MessageSquare, color: "text-purple-400" },
            { label: "Kommentarer", value: stats.comments, icon: BarChart3, color: "text-pink-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-4 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                <div className={`text-2xl font-bold ${color}`}>{Number(value).toLocaleString("nb-NO")}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="users">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Brukere ({users.length})
          </TabsTrigger>
          <TabsTrigger value="clubs">
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            Klubber ({clubs.length})
          </TabsTrigger>
          <TabsTrigger value="support">
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            Supportsaker
            {tickets.filter(t => t.status === "open").length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">
                {tickets.filter(t => t.status === "open").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="suggestions">
            <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
            Forslag ({suggestions.length})
          </TabsTrigger>
        </TabsList>

        {/* Users tab */}
        <TabsContent value="users" className="mt-4">
          <div className="space-y-3">
            <div className="relative max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Søk etter navn eller e-post..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Navn</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">E-post</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Rolle</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Registrert</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/10">
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{user.email}</td>
                      <td className="px-4 py-3">
                        {user.role === "super_admin" ? (
                          <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/30">
                            <Crown className="w-2.5 h-2.5 mr-1" />
                            Super Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Bruker</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${user.isActive ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}
                        >
                          {user.isActive ? "Aktiv" : "Deaktivert"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString("nb-NO")}
                      </td>
                      <td className="px-4 py-3">
                        {user.role !== "super_admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={`h-7 text-xs ${user.isActive ? "text-destructive border-destructive/30 hover:bg-destructive/10" : "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"}`}
                            onClick={() => toggleUser(user)}
                          >
                            {user.isActive ? (
                              <><ShieldOff className="w-3 h-3 mr-1" />Deaktiver</>
                            ) : (
                              <><Shield className="w-3 h-3 mr-1" />Aktiver</>
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">Ingen brukere funnet</div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Clubs tab */}
        <TabsContent value="clubs" className="mt-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Klubbnavn</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Eier</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Sted</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Opprettet</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {clubs.map((club) => (
                  <ClubRow key={club.id} club={club} token={token} onUpdate={load} />
                ))}
              </tbody>
            </table>
            {clubs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">Ingen klubber registrert</div>
            )}
          </div>
        </TabsContent>

        {/* Support tickets tab */}
        <TabsContent value="support" className="mt-4 space-y-3">
          {tickets.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ingen supportsaker ennå</p>
            </div>
          )}
          {tickets.map((ticket) => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              token={token}
              expanded={expandedTicket === ticket.id}
              onToggle={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
              onUpdate={load}
            />
          ))}
        </TabsContent>

        {/* Suggestions tab */}
        <TabsContent value="suggestions" className="mt-4 space-y-3">
          {suggestions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ingen forbedringsforslag ennå</p>
            </div>
          )}
          {suggestions.map((sug) => (
            <SuggestionRow key={sug.id} suggestion={sug} token={token} onUpdate={load} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── TicketRow ─────────────────────────────────────────────────────────────────
function TicketRow({
  ticket, token, expanded, onToggle, onUpdate,
}: {
  ticket: AdminTicket;
  token: string | null;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: () => void;
}) {
  const [reply, setReply] = useState(ticket.adminReply ?? "");
  const [status, setStatus] = useState(ticket.status);
  const [saving, setSaving] = useState(false);

  const statusInfo = TICKET_STATUS_MAP[ticket.status]!;

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/support/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { "x-user-token": token } : {}) },
      body: JSON.stringify({ adminReply: reply, status }),
    });
    setSaving(false);
    onUpdate();
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <button className="w-full text-left" onClick={onToggle}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{ticket.title}</span>
                <Badge variant="outline" className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
                <Badge variant="outline" className="text-[10px]">
                  {ticket.category === "feil" ? "Feil/Bug" : ticket.category === "spørsmål" ? "Spørsmål" : "Annet"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ticket.userName} · {ticket.userEmail} · {new Date(ticket.createdAt).toLocaleDateString("nb-NO")}
              </p>
            </div>
            {expanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
          </div>
        </button>

        {expanded && (
          <div className="mt-3 border-t border-border pt-3 space-y-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as AdminTicket["status"])}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Åpen</SelectItem>
                    <SelectItem value="answered">Besvart</SelectItem>
                    <SelectItem value="closed">Lukket</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Svar til bruker</Label>
                <Textarea
                  placeholder="Skriv svar her..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? "Lagrer..." : "Lagre svar"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── SuggestionRow ─────────────────────────────────────────────────────────────
function SuggestionRow({
  suggestion, token, onUpdate,
}: {
  suggestion: AdminSuggestion;
  token: string | null;
  onUpdate: () => void;
}) {
  const [status, setStatus] = useState(suggestion.status);
  const [note, setNote] = useState(suggestion.adminNote ?? "");
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const prio = PRIORITY_MAP[suggestion.priority]!;
  const statusInfo = SUGGESTION_STATUS_MAP[suggestion.status]!;

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/suggestions/${suggestion.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { "x-user-token": token } : {}) },
      body: JSON.stringify({ status, adminNote: note }),
    });
    setSaving(false);
    onUpdate();
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <button className="w-full text-left" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{suggestion.title}</span>
                <Badge variant="outline" className={`text-[10px] ${prio.color}`}>{prio.label} prioritet</Badge>
                <Badge variant="outline" className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {suggestion.userName} · {suggestion.userEmail} · {new Date(suggestion.createdAt).toLocaleDateString("nb-NO")}
              </p>
            </div>
            {expanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
          </div>
        </button>

        {expanded && (
          <div className="mt-3 border-t border-border pt-3 space-y-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{suggestion.description}</p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as AdminSuggestion["status"])}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Venter</SelectItem>
                    <SelectItem value="reviewed">Vurdert</SelectItem>
                    <SelectItem value="implemented">Implementert</SelectItem>
                    <SelectItem value="declined">Avslått</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Admin-notat (vises til brukeren)</Label>
                <Textarea
                  placeholder="Legg til notat om dette forslaget..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? "Lagrer..." : "Lagre"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
