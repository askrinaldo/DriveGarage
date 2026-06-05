import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Users, Car, Building2, Search, Shield, ShieldOff, TrendingUp,
  MessageSquare, ArrowLeft, Crown, Ban, CircleCheck, Lightbulb,
  ChevronDown, ChevronUp, CreditCard, BarChart3, Activity,
  ScrollText, CheckCircle2, Clock, AlertCircle, RefreshCw,
  DollarSign, TrendingDown, Star,
} from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DetailedUser {
  id: number;
  name: string;
  email: string;
  role: "user" | "super_admin";
  isActive: boolean;
  subscriptionTier: "free" | "standard" | "premium";
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  vehicleCount: number;
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

interface BillingStats {
  tiers: { free: number; standard: number; premium: number };
  newUsersThisMonth: number;
  activeSubscriptions: number;
  mrr: number;
  arr: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueYtd: number;
  userGrowth: Array<{ month: string; count: number }>;
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

interface Subscription {
  id: number;
  name: string;
  email: string;
  subscriptionTier: "free" | "standard" | "premium";
  subscriptionStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  stripe: {
    status: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    amount: number;
    interval: string;
  } | null;
}

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

// ─── Constants ───────────────────────────────────────────────────────────────

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

const TIER_COLORS: Record<string, string> = {
  free: "text-muted-foreground bg-muted/30 border-border",
  standard: "text-blue-400 bg-blue-500/15 border-blue-500/30",
  premium: "text-amber-400 bg-amber-500/15 border-amber-500/30",
};

const TIER_LABELS: Record<string, string> = {
  free: "Gratis",
  standard: "Standard",
  premium: "Premium",
};

const PIE_COLORS = ["#6b7280", "#3b82f6", "#f59e0b"];

function authHeader(token: string | null): Record<string, string> {
  if (!token) return {};
  return { "x-user-token": token };
}

function formatNOK(kr: number) {
  return `kr ${kr.toLocaleString("nb-NO")}`;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1 truncate">{label}</p>
            <p className={`text-2xl font-bold ${color} leading-none`}>{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-current/10 shrink-0`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
        </div>
        {trend && (
          <div className="absolute bottom-2 right-3">
            {trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-500" />}
            {trend === "down" && <TrendingDown className="w-3 h-3 text-red-500" />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Subscription tier badge ─────────────────────────────────────────────────

function TierBadge({ tier }: { tier: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] ${TIER_COLORS[tier] ?? TIER_COLORS.free}`}>
      {tier === "premium" && <Star className="w-2.5 h-2.5 mr-0.5" />}
      {TIER_LABELS[tier] ?? tier}
    </Badge>
  );
}

// ─── Club row ────────────────────────────────────────────────────────────────

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
          className={`text-[10px] ${club.isSuspended
            ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
            : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"}`}
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
              className={`h-7 text-xs ${club.isSuspended
                ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                : "text-amber-400 border-amber-500/30 hover:bg-amber-500/10"}`}
            >
              {club.isSuspended
                ? <><CircleCheck className="w-3 h-3 mr-1" />Gjenåpne</>
                : <><Ban className="w-3 h-3 mr-1" />Suspender</>}
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

// ─── Ticket row ───────────────────────────────────────────────────────────────

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
      headers: { "Content-Type": "application/json", ...authHeader(token) },
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

// ─── Suggestion row ───────────────────────────────────────────────────────────

function SuggestionRow({
  suggestion, token, onUpdate,
}: {
  suggestion: AdminSuggestion;
  token: string | null;
  onUpdate: () => void;
}) {
  const [status, setStatus] = useState(suggestion.status);
  const [note, setNote] = useState(suggestion.adminNote ?? "");
  const [saving, setSaving] = useState(false);
  const statusInfo = SUGGESTION_STATUS_MAP[suggestion.status]!;
  const priorityInfo = PRIORITY_MAP[suggestion.priority]!;

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/suggestions/${suggestion.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify({ status, adminNote: note }),
    });
    setSaving(false);
    onUpdate();
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{suggestion.title}</span>
              <Badge variant="outline" className={`text-[10px] ${statusInfo.color}`}>{statusInfo.label}</Badge>
              <Badge variant="outline" className={`text-[10px] ${priorityInfo.color}`}>{priorityInfo.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {suggestion.userName} · {suggestion.userEmail} · {new Date(suggestion.createdAt).toLocaleDateString("nb-NO")}
            </p>
            <p className="text-sm text-muted-foreground">{suggestion.description}</p>
            <div className="flex gap-2 flex-wrap pt-1">
              <Select value={status} onValueChange={(v) => setStatus(v as AdminSuggestion["status"])}>
                <SelectTrigger className="h-7 text-xs w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Venter</SelectItem>
                  <SelectItem value="reviewed">Vurdert</SelectItem>
                  <SelectItem value="implemented">Implementert</SelectItem>
                  <SelectItem value="declined">Avslått</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Intern merknad..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="h-7 text-xs flex-1 min-w-32"
              />
              <Button size="sm" className="h-7 text-xs" onClick={save} disabled={saving}>
                {saving ? "..." : "Lagre"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── User row (detailed) ─────────────────────────────────────────────────────

function UserRow({
  user, token, onUpdate,
}: {
  user: DetailedUser;
  token: string | null;
  onUpdate: () => void;
}) {
  const [changingTier, setChangingTier] = useState(false);

  async function toggleActive() {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    onUpdate();
  }

  async function changeTier(tier: string) {
    setChangingTier(true);
    await fetch(`/api/admin/users/${user.id}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify({ subscriptionTier: tier }),
    });
    setChangingTier(false);
    onUpdate();
  }

  return (
    <tr className={`hover:bg-muted/10 ${!user.isActive ? "opacity-60" : ""}`}>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-sm">{user.name}</p>
          <p className="text-[10px] text-muted-foreground">{user.email}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        {user.role === "super_admin" ? (
          <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/30">
            <Crown className="w-2.5 h-2.5 mr-1" />Admin
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">Bruker</Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <Select
          value={user.subscriptionTier}
          onValueChange={changeTier}
          disabled={changingTier || user.role === "super_admin"}
        >
          <SelectTrigger className="h-6 text-[10px] w-28 border-0 bg-transparent p-0 shadow-none focus:ring-0">
            <TierBadge tier={user.subscriptionTier} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="free">Gratis</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3">
        <Badge
          variant="outline"
          className={`text-[10px] ${user.isActive
            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            : "bg-destructive/15 text-destructive border-destructive/30"}`}
        >
          {user.isActive ? "Aktiv" : "Deaktivert"}
        </Badge>
      </td>
      <td className="px-4 py-3 text-xs text-center">{user.vehicleCount}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(user.createdAt).toLocaleDateString("nb-NO")}
      </td>
      <td className="px-4 py-3">
        {user.role !== "super_admin" && (
          <Button
            size="sm"
            variant="outline"
            className={`h-7 text-xs ${user.isActive
              ? "text-destructive border-destructive/30 hover:bg-destructive/10"
              : "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"}`}
            onClick={toggleActive}
          >
            {user.isActive
              ? <><ShieldOff className="w-3 h-3 mr-1" />Deaktiver</>
              : <><Shield className="w-3 h-3 mr-1" />Aktiver</>}
          </Button>
        )}
      </td>
    </tr>
  );
}

// ─── Main admin page ──────────────────────────────────────────────────────────

export default function Admin() {
  const [, navigate] = useLocation();
  const { isSuperAdmin, token, isAuthenticated } = useUserAuth();

  const [userSearch, setUserSearch] = useState("");
  const [userTierFilter, setUserTierFilter] = useState("all");
  const [users, setUsers] = useState<DetailedUser[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [billingStats, setBillingStats] = useState<BillingStats | null>(null);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [suggestions, setSuggestions] = useState<AdminSuggestion[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicket, setExpandedTicket] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const h = authHeader(token);
    const [usersRes, clubsRes, statsRes, billingRes, ticketsRes, suggestionsRes] = await Promise.all([
      fetch("/api/admin/users-detailed", { headers: h }),
      fetch("/api/admin/clubs", { headers: h }),
      fetch("/api/admin/stats", { headers: h }),
      fetch("/api/admin/billing-stats", { headers: h }),
      fetch("/api/admin/support/tickets", { headers: h }),
      fetch("/api/admin/suggestions", { headers: h }),
    ]);
    if (usersRes.ok) setUsers(await usersRes.json() as DetailedUser[]);
    if (clubsRes.ok) setClubs(await clubsRes.json() as Club[]);
    if (statsRes.ok) setStats(await statsRes.json() as Stats);
    if (billingRes.ok) setBillingStats(await billingRes.json() as BillingStats);
    if (ticketsRes.ok) setTickets(await ticketsRes.json() as AdminTicket[]);
    if (suggestionsRes.ok) setSuggestions(await suggestionsRes.json() as AdminSuggestion[]);
    setLoading(false);
  }, [token]);

  const loadSubscriptions = useCallback(async () => {
    if (!token) return;
    const res = await fetch("/api/admin/subscriptions", { headers: authHeader(token) });
    if (res.ok) setSubscriptions(await res.json() as Subscription[]);
  }, [token]);

  const loadAuditLog = useCallback(async () => {
    if (!token) return;
    const res = await fetch("/api/admin/audit-log", { headers: authHeader(token) });
    if (res.ok) setAuditLogs(await res.json() as AuditLog[]);
  }, [token]);

  useEffect(() => {
    if (activeTab === "subscriptions" && subscriptions.length === 0) void loadSubscriptions();
    if (activeTab === "audit" && auditLogs.length === 0) void loadAuditLog();
  }, [activeTab, subscriptions.length, auditLogs.length, loadSubscriptions, loadAuditLog]);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    if (!isSuperAdmin) { navigate("/"); return; }
    void load();
  }, [isAuthenticated, isSuperAdmin, load, navigate]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = !userSearch
      || u.name.toLowerCase().includes(userSearch.toLowerCase())
      || u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesTier = userTierFilter === "all" || u.subscriptionTier === userTierFilter;
    return matchesSearch && matchesTier;
  });

  const openTickets = tickets.filter(t => t.status === "open").length;

  if (loading) return <LoadingState message="Laster admin-panel..." />;

  const tierPieData = billingStats ? [
    { name: "Gratis", value: billingStats.tiers.free },
    { name: "Standard", value: billingStats.tiers.standard },
    { name: "Premium", value: billingStats.tiers.premium },
  ] : [];

  const payingUsers = (billingStats?.tiers.standard ?? 0) + (billingStats?.tiers.premium ?? 0);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        <Button variant="outline" size="sm" onClick={() => void load()} className="h-8 text-xs gap-1.5">
          <RefreshCw className="w-3 h-3" />
          Oppdater
        </Button>
      </div>

      {/* Primary KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Totalt brukere" value={stats?.users ?? 0} icon={Users} color="text-blue-400" />
        <KpiCard label="Aktive brukere" value={stats?.activeUsers ?? 0} icon={Activity} color="text-emerald-400" />
        <KpiCard label="Nye denne mnd" value={billingStats?.newUsersThisMonth ?? 0} icon={TrendingUp} color="text-purple-400" trend="up" />
        <KpiCard label="Betalende" value={payingUsers} sub={`av ${stats?.users ?? 0} brukere`} icon={CreditCard} color="text-primary" />
        <KpiCard label="Åpne saker" value={openTickets} icon={MessageSquare} color={openTickets > 0 ? "text-amber-400" : "text-muted-foreground"} />
      </div>

      {/* Revenue KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="MRR"
          value={formatNOK(billingStats?.mrr ?? 0)}
          sub="månedlig inntekt"
          icon={DollarSign}
          color="text-emerald-400"
          trend="up"
        />
        <KpiCard
          label="ARR"
          value={formatNOK(billingStats?.arr ?? 0)}
          sub="årlig inntekt"
          icon={BarChart3}
          color="text-primary"
        />
        <KpiCard
          label="Inntekt denne mnd"
          value={formatNOK(billingStats?.revenueThisMonth ?? 0)}
          sub={`forrige mnd: ${formatNOK(billingStats?.revenueLastMonth ?? 0)}`}
          icon={TrendingUp}
          color="text-blue-400"
        />
        <KpiCard
          label="Aktive abonnementer"
          value={billingStats?.activeSubscriptions ?? 0}
          sub={`${billingStats?.tiers.standard ?? 0} standard · ${billingStats?.tiers.premium ?? 0} premium`}
          icon={Star}
          color="text-amber-400"
        />
      </div>

      {/* Platform KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard label="Kjøretøy" value={stats?.vehicles ?? 0} icon={Car} color="text-primary" />
        <KpiCard label="Klubber" value={stats?.clubs ?? 0} icon={Building2} color="text-amber-400" />
        <KpiCard label="Innlegg" value={stats?.posts ?? 0} icon={MessageSquare} color="text-purple-400" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Oversikt
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-3.5 h-3.5 mr-1.5" />Brukere ({users.length})
          </TabsTrigger>
          <TabsTrigger value="clubs">
            <Building2 className="w-3.5 h-3.5 mr-1.5" />Klubber ({clubs.length})
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />Abonnementer
          </TabsTrigger>
          <TabsTrigger value="support">
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />Support
            {openTickets > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">
                {openTickets}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="suggestions">
            <Lightbulb className="w-3.5 h-3.5 mr-1.5" />Forslag ({suggestions.length})
          </TabsTrigger>
          <TabsTrigger value="audit">
            <ScrollText className="w-3.5 h-3.5 mr-1.5" />Audit-logg
          </TabsTrigger>
        </TabsList>

        {/* ── Overview tab ── */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* User growth chart */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm">Brukervekst (siste 6 måneder)</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {billingStats?.userGrowth && billingStats.userGrowth.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={billingStats.userGrowth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#b45309" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#b45309" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Area type="monotone" dataKey="count" name="Nye brukere" stroke="#b45309" fill="url(#colorUsers)" strokeWidth={2} dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                    Ingen brukerdata ennå
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tier breakdown pie */}
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm">Abonnementsfordeling</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {tierPieData.some(d => d.value > 0) ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={180}>
                      <PieChart>
                        <Pie
                          data={tierPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {tierPieData.map((_, index) => (
                            <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {tierPieData.map((entry, i) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                          <span className="text-xs text-muted-foreground flex-1">{entry.name}</span>
                          <span className="text-xs font-medium">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">
                    Ingen abonnementsdata ennå
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenue overview */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm">Inntektssammendrag</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-3 rounded-lg bg-muted/20 border border-border">
                    <p className="text-2xl font-bold text-emerald-400">{formatNOK(billingStats?.revenueThisMonth ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Denne måneden</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20 border border-border">
                    <p className="text-2xl font-bold text-blue-400">{formatNOK(billingStats?.revenueLastMonth ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Forrige måned</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20 border border-border">
                    <p className="text-2xl font-bold text-primary">{formatNOK(billingStats?.mrr ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">MRR</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/20 border border-border">
                    <p className="text-2xl font-bold text-amber-400">{formatNOK(billingStats?.arr ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">ARR</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tier bar chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm">Brukere per abonnementsnivå</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={tierPieData} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 12 }}
                    />
                    <Bar dataKey="value" name="Brukere" radius={[0, 4, 4, 0]}>
                      {tierPieData.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Users tab ── */}
        <TabsContent value="users" className="mt-4">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Søk etter navn eller e-post..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Select value={userTierFilter} onValueChange={setUserTierFilter}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue placeholder="Alle nivåer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle nivåer</SelectItem>
                  <SelectItem value="free">Gratis</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="h-9 px-3 text-xs flex items-center">
                {filteredUsers.length} brukere
              </Badge>
            </div>
            <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Bruker</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Rolle</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Abonnement</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Kjøretøy</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Registrert</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredUsers.map((user) => (
                    <UserRow key={user.id} user={user} token={token} onUpdate={load} />
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">Ingen brukere funnet</div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Clubs tab ── */}
        <TabsContent value="clubs" className="mt-4">
          <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
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

        {/* ── Subscriptions tab ── */}
        <TabsContent value="subscriptions" className="mt-4">
          <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Bruker</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Nivå</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Stripe-status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Beløp</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Neste fornyelse</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Registrert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{sub.name}</p>
                      <p className="text-[10px] text-muted-foreground">{sub.email}</p>
                    </td>
                    <td className="px-4 py-3"><TierBadge tier={sub.subscriptionTier} /></td>
                    <td className="px-4 py-3">
                      {sub.stripe ? (
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            sub.stripe.status === "active"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : sub.stripe.status === "past_due"
                              ? "bg-red-500/15 text-red-300 border-red-500/30"
                              : "bg-muted/20 text-muted-foreground border-border"
                          }`}
                        >
                          {sub.stripe.status === "active"
                            ? "Aktiv"
                            : sub.stripe.status === "past_due"
                            ? "Forfalt"
                            : sub.stripe.status}
                          {sub.stripe.cancelAtPeriodEnd && " · Avsluttes"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Manuell</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {sub.stripe
                        ? `${formatNOK(sub.stripe.amount)}/${sub.stripe.interval === "year" ? "år" : "mnd"}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {sub.stripe?.currentPeriodEnd
                        ? new Date(sub.stripe.currentPeriodEnd * 1000).toLocaleDateString("nb-NO")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(sub.createdAt).toLocaleDateString("nb-NO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {subscriptions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">Ingen abonnementer ennå</div>
            )}
          </div>
        </TabsContent>

        {/* ── Support tab ── */}
        <TabsContent value="support" className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {(["all", "open", "answered", "closed"] as const).map(f => {
              const counts: Record<string, number> = {
                all: tickets.length,
                open: tickets.filter(t => t.status === "open").length,
                answered: tickets.filter(t => t.status === "answered").length,
                closed: tickets.filter(t => t.status === "closed").length,
              };
              const labels: Record<string, string> = { all: "Alle", open: "Åpne", answered: "Besvart", closed: "Lukket" };
              return (
                <Button
                  key={f}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => {}}
                >
                  {f === "open" && <AlertCircle className="w-3 h-3 text-blue-400" />}
                  {f === "answered" && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {f === "closed" && <Clock className="w-3 h-3 text-muted-foreground" />}
                  {labels[f]} <span className="text-muted-foreground">({counts[f]})</span>
                </Button>
              );
            })}
          </div>
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ingen supportsaker ennå</p>
            </div>
          ) : (
            tickets.map(ticket => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                token={token}
                expanded={expandedTicket === ticket.id}
                onToggle={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                onUpdate={load}
              />
            ))
          )}
        </TabsContent>

        {/* ── Suggestions tab ── */}
        <TabsContent value="suggestions" className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap text-xs text-muted-foreground items-center pl-1">
            {[
              ["pending", suggestions.filter(s => s.status === "pending").length],
              ["reviewed", suggestions.filter(s => s.status === "reviewed").length],
              ["implemented", suggestions.filter(s => s.status === "implemented").length],
              ["declined", suggestions.filter(s => s.status === "declined").length],
            ].map(([status, count]) => (
              <span key={status} className="flex items-center gap-1">
                {count} {SUGGESTION_STATUS_MAP[String(status)]?.label}
              </span>
            ))}
          </div>
          {suggestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ingen forbedringsforslag ennå</p>
            </div>
          ) : (
            suggestions.map(sug => (
              <SuggestionRow key={sug.id} suggestion={sug} token={token} onUpdate={load} />
            ))
          )}
        </TabsContent>

        {/* ── Audit log tab ── */}
        <TabsContent value="audit" className="mt-4">
          <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Tidspunkt</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Aktør</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Handling</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Mål</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Detaljer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-muted/10">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium">{log.actorName}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-[10px] font-mono">{log.action}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {log.targetType && `${log.targetType}${log.targetName ? `: ${log.targetName}` : ""}`}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">
                      {log.metadata ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <ScrollText className="w-6 h-6 mx-auto mb-2 opacity-30" />
                Ingen audit-logg-oppføringer ennå
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
