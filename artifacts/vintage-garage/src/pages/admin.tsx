import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, Link } from "wouter";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Users, Car, Building2, Search, Shield, ShieldOff, TrendingUp, TrendingDown,
  MessageSquare, Crown, Ban, CircleCheck, Lightbulb, ChevronDown, ChevronUp,
  CreditCard, BarChart3, Activity, ScrollText, CheckCircle2, Clock, AlertCircle,
  RefreshCw, DollarSign, Star, Zap, Server, Database, Wifi, ArrowLeft,
  X, ExternalLink, LayoutDashboard, Receipt, Settings, Bell,
  ArrowUpRight, ArrowDownRight, Minus, ChevronRight, Hash,
  Bot, Send, Loader2,
} from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface MrrPoint { month: string; mrr: number; newSubs: number; churned: number }

interface Invoice {
  id: string;
  customerEmail: string;
  amount: number;
  status: string;
  created: number;
  hostedUrl: string | null;
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

interface FinanceMetrics {
  mrr: number;
  arr: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueYtd: number;
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  payingUsers: number;
  freeUsers: number;
  standardUsers: number;
  premiumUsers: number;
  activeSubscriptions: number;
  cancelingSubscriptions: number;
  pastDueSubscriptions: number;
  openInvoices: number;
  failedInvoices: number;
  paidInvoices: number;
  totalInvoiceRevenue: number;
}

interface FinanceInsight {
  summary: string;
  insights: string[];
  risks: string[];
  opportunities: string[];
  nextSteps: string[];
  metrics: FinanceMetrics;
  generatedAt: string;
}

interface SystemHealth {
  api: { status: "ok" | "error"; latencyMs: number };
  database: { status: "ok" | "error"; latencyMs: number };
  stats: { users: number; vehicles: number; clubs: number };
  uptime: number;
  memory: { heapUsedMb: number; heapTotalMb: number };
  nodeVersion: string;
  timestamp: string;
}

// ─── Nav sections ─────────────────────────────────────────────────────────────

type Section =
  | "overview"
  | "crm"
  | "payments"
  | "subscriptions"
  | "support"
  | "clubs"
  | "system"
  | "audit"
  | "ai";

const NAV_ITEMS: Array<{
  id: Section;
  label: string;
  icon: React.ElementType;
  badge?: string;
}> = [
  { id: "overview", label: "Oversikt", icon: LayoutDashboard },
  { id: "ai", label: "Økonomi AI", icon: Bot },
  { id: "crm", label: "Brukere (CRM)", icon: Users },
  { id: "payments", label: "Betalinger", icon: Receipt },
  { id: "subscriptions", label: "Abonnementer", icon: CreditCard },
  { id: "support", label: "Support", icon: MessageSquare },
  { id: "clubs", label: "Klubber", icon: Building2 },
  { id: "system", label: "System", icon: Server },
  { id: "audit", label: "Audit-logg", icon: ScrollText },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeader(token: string | null): Record<string, string> {
  if (!token) return {};
  return { "x-user-token": token };
}

function formatNOK(kr: number) {
  return `kr ${kr.toLocaleString("nb-NO")}`;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}t ${m}min`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, gradient, trend, trendValue, index = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  gradient: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <div className={`relative overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br ${gradient} p-px`}>
        <div className="rounded-xl bg-[#0d1117]/80 backdrop-blur-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-2xl font-bold text-white leading-none">{value}</p>
              {sub && <p className="text-[11px] text-white/40 mt-1.5">{sub}</p>}
            </div>
            <div className={`p-2.5 rounded-lg bg-gradient-to-br ${gradient} opacity-80 shrink-0`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
          </div>
          {(trend || trendValue) && (
            <div className="mt-3 flex items-center gap-1.5">
              {trend === "up" && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />}
              {trend === "down" && <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />}
              {trend === "neutral" && <Minus className="w-3.5 h-3.5 text-white/30" />}
              {trendValue && (
                <span className={`text-[11px] font-medium ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-white/40"}`}>
                  {trendValue}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Tier badge ───────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<string, { label: string; className: string }> = {
  free: { label: "Gratis", className: "text-white/50 bg-white/5 border-white/10" },
  standard: { label: "Standard", className: "text-blue-300 bg-blue-500/15 border-blue-500/25" },
  premium: { label: "Premium", className: "text-amber-300 bg-amber-500/15 border-amber-500/25" },
};

function TierBadge({ tier }: { tier: string }) {
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.free!;
  return (
    <Badge variant="outline" className={`text-[10px] font-medium ${cfg.className}`}>
      {tier === "premium" && <Star className="w-2.5 h-2.5 mr-0.5" />}
      {cfg.label}
    </Badge>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

const ChartTooltipStyle = {
  background: "rgba(13, 17, 23, 0.95)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  fontSize: 12,
  color: "#fff",
};

// ─── User detail slide-over ───────────────────────────────────────────────────

function UserDetailPanel({
  user, token, onClose, onUpdate,
}: {
  user: DetailedUser;
  token: string | null;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [changingTier, setChangingTier] = useState(false);
  const [saving, setSaving] = useState(false);

  async function toggleActive() {
    setSaving(true);
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    setSaving(false);
    onUpdate();
    onClose();
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

  const initials = user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-y-0 right-0 w-[400px] z-50 bg-[#0d1117] border-l border-white/8 shadow-2xl shadow-black/60 overflow-y-auto"
    >
      <div className="sticky top-0 bg-[#0d1117]/95 backdrop-blur-sm border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <h3 className="font-semibold text-white">Brukerdetaljer</h3>
        <Button variant="ghost" size="icon" className="w-7 h-7 text-white/50 hover:text-white" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-6 space-y-6">
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-900/30">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-white text-lg leading-tight">{user.name}</p>
            <p className="text-sm text-white/50">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <TierBadge tier={user.subscriptionTier} />
              <Badge variant="outline" className={`text-[10px] ${user.isActive ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/25" : "text-red-300 bg-red-500/15 border-red-500/25"}`}>
                {user.isActive ? "Aktiv" : "Deaktivert"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Kjøretøy", value: user.vehicleCount, icon: Car },
            { label: "Rolle", value: user.role === "super_admin" ? "Admin" : "Bruker", icon: Shield },
            { label: "Registrert", value: new Date(user.createdAt).toLocaleDateString("nb-NO"), icon: Clock },
            { label: "Stripe ID", value: user.stripeCustomerId ? user.stripeCustomerId.slice(0, 14) + "…" : "—", icon: CreditCard },
          ].map(item => (
            <div key={item.label} className="rounded-xl bg-white/3 border border-white/6 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <item.icon className="w-3 h-3 text-white/30" />
                <p className="text-[10px] text-white/40 uppercase tracking-wider">{item.label}</p>
              </div>
              <p className="text-sm font-medium text-white truncate">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Subscription tier */}
        {user.role !== "super_admin" && (
          <div className="space-y-2">
            <Label className="text-xs text-white/50 uppercase tracking-wider">Abonnementsnivå</Label>
            <Select value={user.subscriptionTier} onValueChange={changeTier} disabled={changingTier}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Gratis</SelectItem>
                <SelectItem value="standard">Standard (kr 50/mnd)</SelectItem>
                <SelectItem value="premium">Premium (kr 99/mnd)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Actions */}
        {user.role !== "super_admin" && (
          <div className="space-y-2 pt-2 border-t border-white/8">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Handlinger</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full h-9 text-sm justify-start gap-2 ${user.isActive
                    ? "text-red-300 border-red-500/20 hover:bg-red-500/10"
                    : "text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/10"}`}
                  disabled={saving}
                >
                  {user.isActive
                    ? <><Ban className="w-3.5 h-3.5" />Deaktiver bruker</>
                    : <><Shield className="w-3.5 h-3.5" />Aktiver bruker</>}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#0d1117] border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">
                    {user.isActive ? "Deaktiver bruker?" : "Aktiver bruker?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-white/50">
                    {user.isActive
                      ? `${user.name} mister tilgang til plattformen.`
                      : `${user.name} får tilgang til plattformen igjen.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Avbryt</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={toggleActive}
                    className={user.isActive ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}
                  >
                    {user.isActive ? "Deaktiver" : "Aktiver"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Ticket item ──────────────────────────────────────────────────────────────

function TicketItem({
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

  const statusCfg = {
    open: { label: "Åpen", className: "text-blue-300 bg-blue-500/15 border-blue-500/25" },
    answered: { label: "Besvart", className: "text-emerald-300 bg-emerald-500/15 border-emerald-500/25" },
    closed: { label: "Lukket", className: "text-white/40 bg-white/5 border-white/10" },
  }[ticket.status] ?? { label: ticket.status, className: "text-white/40 bg-white/5 border-white/10" };

  return (
    <div className="rounded-xl border border-white/6 bg-white/2 overflow-hidden">
      <button className="w-full text-left px-5 py-4" onClick={onToggle}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-white">{ticket.title}</span>
              <Badge variant="outline" className={`text-[10px] ${statusCfg.className}`}>{statusCfg.label}</Badge>
              <Badge variant="outline" className="text-[10px] text-white/40 bg-white/5 border-white/10">
                {ticket.category === "feil" ? "Feil/Bug" : ticket.category === "spørsmål" ? "Spørsmål" : "Annet"}
              </Badge>
            </div>
            <p className="text-[11px] text-white/40 mt-0.5">
              {ticket.userName} · {ticket.userEmail} · {new Date(ticket.createdAt).toLocaleDateString("nb-NO")}
            </p>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-white/30 shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />}
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-5 border-t border-white/6 pt-4 space-y-4">
          <p className="text-sm text-white/60 whitespace-pre-wrap">{ticket.description}</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-white/40 uppercase tracking-wider">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AdminTicket["status"])}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white">
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
              <Label className="text-[11px] text-white/40 uppercase tracking-wider">Svar til bruker</Label>
              <Textarea
                placeholder="Skriv svar her..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                className="text-sm bg-white/5 border-white/10 text-white placeholder:text-white/20 resize-none"
              />
            </div>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Lagrer..." : "Lagre svar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Overview section ─────────────────────────────────────────────────────────

function OverviewSection({
  stats, billingStats, mrrHistory,
}: {
  stats: Stats | null;
  billingStats: BillingStats | null;
  mrrHistory: MrrPoint[];
}) {
  const payingUsers = (billingStats?.tiers.standard ?? 0) + (billingStats?.tiers.premium ?? 0);
  const totalUsers = stats?.users ?? 0;
  const pct = pctChange(billingStats?.revenueThisMonth ?? 0, billingStats?.revenueLastMonth ?? 0);
  const tierPie = billingStats ? [
    { name: "Gratis", value: billingStats.tiers.free },
    { name: "Standard", value: billingStats.tiers.standard },
    { name: "Premium", value: billingStats.tiers.premium },
  ] : [];
  const PIE_COLORS = ["#374151", "#6366f1", "#f59e0b"];

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="MRR"
          value={formatNOK(billingStats?.mrr ?? 0)}
          sub="månedlig inntekt"
          icon={DollarSign}
          gradient="from-emerald-500/20 to-emerald-600/10"
          trend={pct >= 0 ? "up" : "down"}
          trendValue={`${pct > 0 ? "+" : ""}${pct}% vs forrige mnd`}
          index={0}
        />
        <KpiCard
          label="ARR"
          value={formatNOK(billingStats?.arr ?? 0)}
          sub="årlig inntekt"
          icon={BarChart3}
          gradient="from-indigo-500/20 to-indigo-600/10"
          trend="neutral"
          trendValue={`YTD: ${formatNOK(billingStats?.revenueYtd ?? 0)}`}
          index={1}
        />
        <KpiCard
          label="Betalende kunder"
          value={payingUsers}
          sub={`${totalUsers > 0 ? Math.round((payingUsers / totalUsers) * 100) : 0}% av ${totalUsers} brukere`}
          icon={CreditCard}
          gradient="from-cyan-500/20 to-cyan-600/10"
          trend="up"
          trendValue={`${billingStats?.tiers.premium ?? 0} premium · ${billingStats?.tiers.standard ?? 0} standard`}
          index={2}
        />
        <KpiCard
          label="Aktive abonnementer"
          value={billingStats?.activeSubscriptions ?? 0}
          sub="via Stripe"
          icon={Zap}
          gradient="from-violet-500/20 to-violet-600/10"
          index={3}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Totale brukere"
          value={totalUsers}
          sub={`+${billingStats?.newUsersThisMonth ?? 0} denne måneden`}
          icon={Users}
          gradient="from-blue-500/20 to-blue-600/10"
          trend="up"
          trendValue={`${stats?.activeUsers ?? 0} aktive`}
          index={4}
        />
        <KpiCard
          label="Kjøretøy"
          value={stats?.vehicles ?? 0}
          icon={Car}
          gradient="from-sky-500/20 to-sky-600/10"
          index={5}
        />
        <KpiCard
          label="Klubber"
          value={stats?.clubs ?? 0}
          icon={Building2}
          gradient="from-amber-500/20 to-amber-600/10"
          index={6}
        />
        <KpiCard
          label="Innlegg"
          value={stats?.posts ?? 0}
          icon={MessageSquare}
          gradient="from-pink-500/20 to-pink-600/10"
          index={7}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* MRR chart */}
        <div className="lg:col-span-2 rounded-xl border border-white/6 bg-white/2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-white">MRR Utvikling</p>
              <p className="text-[11px] text-white/40">Siste 12 måneder</p>
            </div>
            <Badge variant="outline" className="text-[10px] text-emerald-300 bg-emerald-500/10 border-emerald-500/20">
              <TrendingUp className="w-2.5 h-2.5 mr-1" />
              Inntekt
            </Badge>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mrrHistory} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} />
              <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} tickFormatter={v => `${v}`} />
              <Tooltip contentStyle={ChartTooltipStyle} formatter={(v: number) => [`kr ${v}`, "MRR"]} />
              <Area type="monotone" dataKey="mrr" stroke="#6366f1" fill="url(#mrrGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tier breakdown */}
        <div className="rounded-xl border border-white/6 bg-white/2 p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-white">Abonnementsfordeling</p>
            <p className="text-[11px] text-white/40">Alle brukere</p>
          </div>
          {tierPie.some(d => d.value > 0) ? (
            <div>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={tierPie} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
                    {tierPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={ChartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {tierPie.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-white/50 flex-1">{entry.name}</span>
                    <span className="text-xs font-semibold text-white">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[160px] text-white/30 text-sm">
              Ingen abonnementsdata
            </div>
          )}
        </div>
      </div>

      {/* User growth chart */}
      <div className="rounded-xl border border-white/6 bg-white/2 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-white">Brukervekst</p>
            <p className="text-[11px] text-white/40">Nye brukere per måned (siste 6 måneder)</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={billingStats?.userGrowth ?? []} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} />
            <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} />
            <Tooltip contentStyle={ChartTooltipStyle} formatter={(v: number) => [v, "Nye brukere"]} />
            <Bar dataKey="count" fill="#06b6d4" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── CRM section ──────────────────────────────────────────────────────────────

function CrmSection({
  users, token, onUpdate,
}: {
  users: DetailedUser[];
  token: string | null;
  onUpdate: () => void;
}) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<DetailedUser | null>(null);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchTier = tierFilter === "all" || u.subscriptionTier === tierFilter;
    const matchStatus = statusFilter === "all"
      || (statusFilter === "active" && u.isActive)
      || (statusFilter === "inactive" && !u.isActive)
      || (statusFilter === "paying" && u.subscriptionTier !== "free");
    return matchSearch && matchTier && matchStatus;
  });

  return (
    <div className="relative">
      <SectionHeader
        title="Brukeradministrasjon (CRM)"
        sub={`${users.length} totale brukere`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <Input
            placeholder="Søk etter navn eller e-post..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white/5 border-white/10 text-white placeholder:text-white/25 text-sm"
          />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="h-9 w-36 text-xs bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Alle nivåer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle nivåer</SelectItem>
            <SelectItem value="free">Gratis</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36 text-xs bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Alle statuser" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            <SelectItem value="active">Aktive</SelectItem>
            <SelectItem value="inactive">Deaktiverte</SelectItem>
            <SelectItem value="paying">Betalende</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="h-9 px-3 text-xs flex items-center text-white/50 border-white/10">
          {filtered.length} brukere
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-white/3 border-b border-white/6">
                {["Bruker", "Abonnement", "Status", "Kjøretøy", "Stripe ID", "Registrert", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => {
                const initials = user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`border-b border-white/4 hover:bg-white/3 cursor-pointer transition-colors ${!user.isActive ? "opacity-50" : ""}`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/40 to-cyan-500/40 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm leading-none">{user.name}</p>
                          <p className="text-[11px] text-white/40 mt-0.5">{user.email}</p>
                        </div>
                        {user.role === "super_admin" && (
                          <Badge variant="outline" className="text-[10px] text-indigo-300 bg-indigo-500/15 border-indigo-500/25 ml-1">
                            <Crown className="w-2.5 h-2.5 mr-0.5" />Admin
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><TierBadge tier={user.subscriptionTier} /></td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className={`text-[10px] ${user.isActive
                        ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/25"
                        : "text-red-300 bg-red-500/15 border-red-500/25"}`}>
                        {user.isActive ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/60">{user.vehicleCount}</td>
                    <td className="px-5 py-3.5 text-[11px] text-white/30 font-mono">
                      {user.stripeCustomerId ? user.stripeCustomerId.slice(0, 12) + "…" : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/40">
                      {new Date(user.createdAt).toLocaleDateString("nb-NO")}
                    </td>
                    <td className="px-5 py-3.5">
                      <ChevronRight className="w-4 h-4 text-white/20" />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-white/30 text-sm">Ingen brukere funnet</div>
          )}
        </div>
      </div>

      {/* Detail slide-over */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSelectedUser(null)}
            />
            <UserDetailPanel
              user={selectedUser}
              token={token}
              onClose={() => setSelectedUser(null)}
              onUpdate={onUpdate}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Payments section ─────────────────────────────────────────────────────────

function PaymentsSection({ token }: { token: string | null }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/admin/invoices", { headers: authHeader(token) })
      .then(r => r.json() as Promise<Invoice[]>)
      .then(data => { setInvoices(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const filtered = invoices.filter(inv => {
    const matchSearch = !search || inv.customerEmail.toLowerCase().includes(search.toLowerCase()) || inv.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const countPaid = invoices.filter(i => i.status === "paid").length;
  const countFailed = invoices.filter(i => i.status === "uncollectible" || i.status === "open").length;

  const statusCfg: Record<string, { label: string; className: string }> = {
    paid: { label: "Betalt", className: "text-emerald-300 bg-emerald-500/15 border-emerald-500/25" },
    open: { label: "Åpen", className: "text-amber-300 bg-amber-500/15 border-amber-500/25" },
    void: { label: "Annullert", className: "text-white/40 bg-white/5 border-white/10" },
    uncollectible: { label: "Mislyktes", className: "text-red-300 bg-red-500/15 border-red-500/25" },
    draft: { label: "Utkast", className: "text-white/40 bg-white/5 border-white/10" },
  };

  return (
    <div>
      <SectionHeader
        title="Betalinger"
        sub="Stripe faktura-historikk"
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Totalt innbetalt", value: formatNOK(totalPaid), icon: DollarSign, color: "text-emerald-400" },
          { label: "Betalte fakturaer", value: countPaid, icon: CheckCircle2, color: "text-blue-400" },
          { label: "Mislykkede", value: countFailed, icon: AlertCircle, color: "text-red-400" },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-white/6 bg-white/2 p-4 flex items-center gap-3">
            <item.icon className={`w-5 h-5 ${item.color} shrink-0`} />
            <div>
              <p className="text-xs text-white/40 mb-0.5">{item.label}</p>
              <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <Input
            placeholder="Søk e-post eller faktura-ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white/5 border-white/10 text-white placeholder:text-white/25 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36 text-xs bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statuser</SelectItem>
            <SelectItem value="paid">Betalt</SelectItem>
            <SelectItem value="open">Åpen</SelectItem>
            <SelectItem value="uncollectible">Mislyktes</SelectItem>
            <SelectItem value="void">Annullert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-white/30 text-sm">Laster betalinger...</div>
      ) : (
        <div className="rounded-xl border border-white/6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-white/3 border-b border-white/6">
                  {["Faktura ID", "Kunde", "Beløp", "Status", "Dato", ""].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => {
                  const cfg = statusCfg[inv.status] ?? { label: inv.status, className: "text-white/40 bg-white/5 border-white/10" };
                  return (
                    <tr key={inv.id} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-[11px] text-white/40">
                        <div className="flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {inv.id.slice(-12)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-white/70">{inv.customerEmail}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-white">{formatNOK(inv.amount)}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>{cfg.label}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-white/40">
                        {inv.created ? new Date(inv.created * 1000).toLocaleDateString("nb-NO") : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {inv.hostedUrl && (
                          <a href={inv.hostedUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="w-3.5 h-3.5 text-white/20 hover:text-white/60 transition-colors" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-white/30 text-sm">
                {invoices.length === 0 ? "Ingen betalinger ennå (Stripe-webhooks synkroniserer snart)" : "Ingen betalinger matcher søket"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subscriptions section ────────────────────────────────────────────────────

function SubscriptionsSection({ token }: { token: string | null }) {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/subscriptions", { headers: authHeader(token) })
      .then(r => r.json() as Promise<Subscription[]>)
      .then(data => { setSubs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const active = subs.filter(s => s.stripe?.status === "active").length;
  const canceling = subs.filter(s => s.stripe?.cancelAtPeriodEnd).length;
  const pastDue = subs.filter(s => s.stripe?.status === "past_due").length;

  return (
    <div>
      <SectionHeader title="Abonnementer" sub="Oversikt over alle betalte planer" />

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Aktive", value: active, color: "text-emerald-400" },
          { label: "Avsluttes", value: canceling, color: "text-amber-400" },
          { label: "Forfalt", value: pastDue, color: "text-red-400" },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-white/6 bg-white/2 p-4 text-center">
            <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
            <p className="text-xs text-white/40 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-white/30 text-sm">Laster abonnementer...</div>
      ) : (
        <div className="rounded-xl border border-white/6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead>
                <tr className="bg-white/3 border-b border-white/6">
                  {["Bruker", "Nivå", "Stripe-status", "Beløp", "Neste fornyelse", "Registrert"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map(sub => (
                  <tr key={sub.id} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-white text-sm">{sub.name}</p>
                      <p className="text-[11px] text-white/40">{sub.email}</p>
                    </td>
                    <td className="px-5 py-3.5"><TierBadge tier={sub.subscriptionTier} /></td>
                    <td className="px-5 py-3.5">
                      {sub.stripe ? (
                        <Badge variant="outline" className={`text-[10px] ${
                          sub.stripe.status === "active"
                            ? "text-emerald-300 bg-emerald-500/15 border-emerald-500/25"
                            : sub.stripe.status === "past_due"
                            ? "text-red-300 bg-red-500/15 border-red-500/25"
                            : "text-white/40 bg-white/5 border-white/10"}`}>
                          {sub.stripe.status === "active" ? "Aktiv" : sub.stripe.status === "past_due" ? "Forfalt" : sub.stripe.status}
                          {sub.stripe.cancelAtPeriodEnd && " · Avsluttes"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-white/40 bg-white/5 border-white/10">Manuell</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-white">
                      {sub.stripe ? `${formatNOK(sub.stripe.amount)}/${sub.stripe.interval === "year" ? "år" : "mnd"}` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/40">
                      {sub.stripe?.currentPeriodEnd
                        ? new Date(sub.stripe.currentPeriodEnd * 1000).toLocaleDateString("nb-NO")
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/40">
                      {new Date(sub.createdAt).toLocaleDateString("nb-NO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {subs.length === 0 && (
              <div className="text-center py-12 text-white/30 text-sm">Ingen abonnementer ennå</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Support section ──────────────────────────────────────────────────────────

function SupportSection({
  tickets, suggestions, token, onUpdate,
}: {
  tickets: AdminTicket[];
  suggestions: AdminSuggestion[];
  token: string | null;
  onUpdate: () => void;
}) {
  const [tab, setTab] = useState<"tickets" | "suggestions">("tickets");
  const [ticketFilter, setTicketFilter] = useState<"all" | "open" | "answered" | "closed">("all");
  const [expandedTicket, setExpandedTicket] = useState<number | null>(null);

  const filteredTickets = ticketFilter === "all" ? tickets : tickets.filter(t => t.status === ticketFilter);
  const openCount = tickets.filter(t => t.status === "open").length;

  return (
    <div>
      <SectionHeader title="Support & Forslag" sub="Brukerhjelp og funksjonsønsker" />

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab("tickets")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === "tickets" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white hover:bg-white/5"}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Support-saker ({tickets.length})
          {openCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {openCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("suggestions")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === "suggestions" ? "bg-indigo-600 text-white" : "text-white/50 hover:text-white hover:bg-white/5"}`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          Forslag ({suggestions.length})
        </button>
      </div>

      {tab === "tickets" && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {(["all", "open", "answered", "closed"] as const).map(f => {
              const labels = { all: "Alle", open: "Åpne", answered: "Besvart", closed: "Lukket" };
              const counts = {
                all: tickets.length,
                open: tickets.filter(t => t.status === "open").length,
                answered: tickets.filter(t => t.status === "answered").length,
                closed: tickets.filter(t => t.status === "closed").length,
              };
              return (
                <button
                  key={f}
                  onClick={() => setTicketFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${ticketFilter === f ? "bg-white/15 text-white" : "text-white/40 hover:text-white hover:bg-white/5"}`}
                >
                  {labels[f]} ({counts[f]})
                </button>
              );
            })}
          </div>
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">Ingen saker å vise</div>
          ) : (
            filteredTickets.map(ticket => (
              <TicketItem
                key={ticket.id}
                ticket={ticket}
                token={token}
                expanded={expandedTicket === ticket.id}
                onToggle={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                onUpdate={onUpdate}
              />
            ))
          )}
        </div>
      )}

      {tab === "suggestions" && (
        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">Ingen forslag ennå</div>
          ) : (
            suggestions.map(sug => (
              <SuggestionItem key={sug.id} suggestion={sug} token={token} onUpdate={onUpdate} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionItem({
  suggestion, token, onUpdate,
}: {
  suggestion: AdminSuggestion;
  token: string | null;
  onUpdate: () => void;
}) {
  const [status, setStatus] = useState(suggestion.status);
  const [note, setNote] = useState(suggestion.adminNote ?? "");
  const [saving, setSaving] = useState(false);

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

  const priorityCfg: Record<string, { label: string; className: string }> = {
    low: { label: "Lav", className: "text-blue-300 bg-blue-500/15 border-blue-500/25" },
    medium: { label: "Medium", className: "text-amber-300 bg-amber-500/15 border-amber-500/25" },
    high: { label: "Høy", className: "text-red-300 bg-red-500/15 border-red-500/25" },
  };
  const statusCfg: Record<string, string> = {
    pending: "text-blue-300 bg-blue-500/15 border-blue-500/25",
    reviewed: "text-amber-300 bg-amber-500/15 border-amber-500/25",
    implemented: "text-emerald-300 bg-emerald-500/15 border-emerald-500/25",
    declined: "text-white/40 bg-white/5 border-white/10",
  };
  const pCfg = priorityCfg[suggestion.priority] ?? priorityCfg.low!;

  return (
    <div className="rounded-xl border border-white/6 bg-white/2 p-5">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-white">{suggestion.title}</span>
            <Badge variant="outline" className={`text-[10px] ${statusCfg[suggestion.status] ?? statusCfg.pending}`}>
              {{ pending: "Venter", reviewed: "Vurdert", implemented: "Implementert", declined: "Avslått" }[suggestion.status] ?? suggestion.status}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${pCfg.className}`}>{pCfg.label}</Badge>
          </div>
          <p className="text-[11px] text-white/40">{suggestion.userName} · {suggestion.userEmail} · {new Date(suggestion.createdAt).toLocaleDateString("nb-NO")}</p>
          <p className="text-sm text-white/60">{suggestion.description}</p>
          <div className="flex gap-2 flex-wrap pt-1">
            <Select value={status} onValueChange={(v) => setStatus(v as AdminSuggestion["status"])}>
              <SelectTrigger className="h-7 text-xs w-36 bg-white/5 border-white/10 text-white">
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
              onChange={e => setNote(e.target.value)}
              className="h-7 text-xs flex-1 min-w-32 bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
            <Button size="sm" className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" onClick={save} disabled={saving}>
              {saving ? "..." : "Lagre"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Clubs section ────────────────────────────────────────────────────────────

function ClubsSection({ clubs, token, onUpdate }: { clubs: Club[]; token: string | null; onUpdate: () => void }) {
  const [suspendReason, setSuspendReason] = useState<Record<number, string>>({});

  async function toggleClub(club: Club) {
    const reason = suspendReason[club.id] ?? "";
    await fetch(`/api/admin/clubs/${club.id}/suspend`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify({ suspend: !club.isSuspended, reason }),
    });
    onUpdate();
  }

  return (
    <div>
      <SectionHeader title="Klubb-administrasjon" sub={`${clubs.length} registrerte klubber`} />
      <div className="rounded-xl border border-white/6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[650px]">
            <thead>
              <tr className="bg-white/3 border-b border-white/6">
                {["Klubbnavn", "Eier", "Sted", "Status", "Opprettet", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clubs.map(club => (
                <tr key={club.id} className={`border-b border-white/4 hover:bg-white/2 transition-colors ${club.isSuspended ? "opacity-50" : ""}`}>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-white text-sm">{club.name}</p>
                    {club.isSuspended && club.suspendedReason && (
                      <p className="text-[10px] text-amber-400 mt-0.5">{club.suspendedReason}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-white/50">{club.ownerName}</td>
                  <td className="px-5 py-3.5 text-xs text-white/40">{club.location ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant="outline" className={`text-[10px] ${club.isSuspended
                      ? "text-amber-300 bg-amber-500/15 border-amber-500/25"
                      : "text-emerald-300 bg-emerald-500/15 border-emerald-500/25"}`}>
                      {club.isSuspended ? "Suspendert" : "Aktiv"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-white/40">{new Date(club.createdAt).toLocaleDateString("nb-NO")}</td>
                  <td className="px-5 py-3.5">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className={`h-7 text-xs ${club.isSuspended
                          ? "text-emerald-300 border-emerald-500/25 hover:bg-emerald-500/10"
                          : "text-amber-300 border-amber-500/25 hover:bg-amber-500/10"}`}>
                          {club.isSuspended ? <><CircleCheck className="w-3 h-3 mr-1" />Gjenåpne</> : <><Ban className="w-3 h-3 mr-1" />Suspender</>}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#0d1117] border-white/10">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">{club.isSuspended ? `Gjenåpne "${club.name}"?` : `Suspender "${club.name}"?`}</AlertDialogTitle>
                          <AlertDialogDescription className="text-white/50">
                            {club.isSuspended ? "Klubben gjenåpnes for alle medlemmer." : "Klubben suspenderes midlertidig."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        {!club.isSuspended && (
                          <Textarea
                            placeholder="Årsak (valgfritt)"
                            value={suspendReason[club.id] ?? ""}
                            onChange={e => setSuspendReason(prev => ({ ...prev, [club.id]: e.target.value }))}
                            className="bg-white/5 border-white/10 text-white text-sm"
                            rows={2}
                          />
                        )}
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Avbryt</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void toggleClub(club)}
                            className={club.isSuspended ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}
                          >
                            {club.isSuspended ? "Gjenåpne" : "Suspender"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clubs.length === 0 && (
            <div className="text-center py-12 text-white/30 text-sm">Ingen klubber registrert</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── System Health section ─────────────────────────────────────────────────────

function SystemHealthSection({ token }: { token: string | null }) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch("/api/admin/system-health", { headers: authHeader(token) })
      .then(r => r.json() as Promise<SystemHealth>)
      .then(data => { setHealth(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const StatusDot = ({ status }: { status: "ok" | "error" }) => (
    <span className={`inline-block w-2 h-2 rounded-full ${status === "ok" ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-red-400 shadow-sm shadow-red-400/50"}`} />
  );

  return (
    <div>
      <SectionHeader
        title="Systemhelse"
        sub={health ? `Sist sjekket: ${new Date(health.timestamp).toLocaleTimeString("nb-NO")}` : "Laster..."}
        action={
          <Button size="sm" variant="outline" className="h-8 text-xs text-white/60 border-white/10 hover:bg-white/5 gap-1.5" onClick={load}>
            <RefreshCw className="w-3 h-3" />
            Oppdater
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-32 text-white/30 text-sm">Sjekker systemhelse...</div>
      ) : health ? (
        <div className="space-y-4">
          {/* Status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "API Server",
                status: health.api.status,
                icon: Wifi,
                detail: `${health.api.latencyMs}ms`,
                sub: "Responstid",
              },
              {
                label: "Database (PostgreSQL)",
                status: health.database.status,
                icon: Database,
                detail: `${health.database.latencyMs}ms`,
                sub: "Spørringstid",
              },
              {
                label: "Node.js Runtime",
                status: "ok" as const,
                icon: Server,
                detail: health.nodeVersion,
                sub: `Oppe i ${formatUptime(health.uptime)}`,
              },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-white/6 bg-white/2 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-white/40" />
                    <p className="text-xs font-medium text-white/60">{item.label}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={item.status} />
                    <span className={`text-[10px] font-medium ${item.status === "ok" ? "text-emerald-400" : "text-red-400"}`}>
                      {item.status === "ok" ? "OK" : "FEIL"}
                    </span>
                  </div>
                </div>
                <p className="text-xl font-bold text-white">{item.detail}</p>
                <p className="text-[11px] text-white/30 mt-0.5">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Memory usage */}
          <div className="rounded-xl border border-white/6 bg-white/2 p-5">
            <p className="text-sm font-semibold text-white mb-4">Minnebruk</p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-white/50">Heap brukt</span>
                  <span className="text-xs font-semibold text-white">{health.memory.heapUsedMb} MB / {health.memory.heapTotalMb} MB</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (health.memory.heapUsedMb / health.memory.heapTotalMb) * 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      (health.memory.heapUsedMb / health.memory.heapTotalMb) > 0.8
                        ? "bg-red-500"
                        : (health.memory.heapUsedMb / health.memory.heapTotalMb) > 0.6
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DB stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Brukere", value: health.stats.users, icon: Users },
              { label: "Kjøretøy", value: health.stats.vehicles, icon: Car },
              { label: "Klubber", value: health.stats.clubs, icon: Building2 },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-white/6 bg-white/2 p-4 flex items-center gap-3">
                <item.icon className="w-5 h-5 text-white/30 shrink-0" />
                <div>
                  <p className="text-[11px] text-white/40">{item.label} i DB</p>
                  <p className="text-xl font-bold text-white">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-white/30 text-sm">Kunne ikke hente systemhelse</div>
      )}
    </div>
  );
}

// ─── Audit section ────────────────────────────────────────────────────────────

function AuditSection({ token }: { token: string | null }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/audit-log", { headers: authHeader(token) })
      .then(r => r.json() as Promise<AuditLog[]>)
      .then(data => { setLogs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <SectionHeader title="Audit-logg" sub="Siste 200 handlinger på plattformen" />
      {loading ? (
        <div className="flex items-center justify-center h-32 text-white/30 text-sm">Laster logg...</div>
      ) : (
        <div className="rounded-xl border border-white/6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-white/3 border-b border-white/6">
                  {["Tidspunkt", "Aktør", "Handling", "Mål", ""].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3 text-[11px] text-white/30 font-mono whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("nb-NO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-3 text-xs text-white/70">{log.actorName}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 border-indigo-500/20">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-white/50">
                      {log.targetType && <span className="text-white/30 mr-1">{log.targetType}:</span>}
                      {log.targetName ?? log.targetId ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-[11px] text-white/25 max-w-xs truncate">{log.metadata ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <div className="text-center py-12 text-white/30 text-sm">Ingen audit-logger ennå</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Finance Insight section ───────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "Hva er vår nåværende MRR?",
  "Er det churn-risiko?",
  "Hvilke problemer har vi?",
  "Hva er konverteringsraten?",
  "Hvilket abonnement er mest populært?",
];

function InsightCard({
  title, icon: Icon, items, color,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
  color: "cyan" | "red" | "amber" | "emerald";
}) {
  const [open, setOpen] = useState(true);
  const cfg = {
    cyan:    { border: "border-cyan-500/20",    bg: "bg-cyan-500/5",    text: "text-cyan-300",    dot: "bg-cyan-500",    icon: "text-cyan-400"    },
    red:     { border: "border-red-500/20",     bg: "bg-red-500/5",     text: "text-red-300",     dot: "bg-red-500",     icon: "text-red-400"     },
    amber:   { border: "border-amber-500/20",   bg: "bg-amber-500/5",   text: "text-amber-300",   dot: "bg-amber-500",   icon: "text-amber-400"   },
    emerald: { border: "border-emerald-500/20", bg: "bg-emerald-500/5", text: "text-emerald-300", dot: "bg-emerald-500", icon: "text-emerald-400" },
  }[color];

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-3.5 h-3.5 ${cfg.icon}`} />
          <span className={`text-xs font-semibold ${cfg.text}`}>{title}</span>
          <span className="text-[10px] text-white/30 bg-white/5 rounded-full px-1.5 py-0.5">{items.length}</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} opacity-70 shrink-0 mt-1.5`} />
              <p className="text-xs text-white/65 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatMessage({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";

  const renderContent = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>
    );
  };

  const lines = content.split("\n").filter(Boolean);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5 mr-2">
          <Bot className="w-3 h-3 text-indigo-400" />
        </div>
      )}
      <div className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed space-y-1 ${
        isUser
          ? "bg-indigo-600/80 text-white/90"
          : "bg-white/5 border border-white/8 text-white/75"
      }`}>
        {lines.map((line, i) => {
          if (line.startsWith("• ")) {
            return (
              <div key={i} className="flex items-start gap-1.5">
                <span className="opacity-50 shrink-0 mt-0.5">•</span>
                <span>{renderContent(line.slice(2))}</span>
              </div>
            );
          }
          return <p key={i}>{renderContent(line)}</p>;
        })}
      </div>
    </div>
  );
}

function FinanceInsightSection({ token }: { token: string | null }) {
  const [insight, setInsight] = useState<FinanceInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/finance-insight", { headers: authHeader(token) })
      .then(r => r.json())
      .then((data: FinanceInsight) => setInsight(data))
      .catch(() => {/* ignore */})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  async function sendMessage(text?: string) {
    const question = (text ?? chatInput).trim();
    if (!question || !insight) return;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: question }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/admin/finance-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify({ question, metrics: insight.metrics }),
      });
      const data = await res.json() as { answer: string };
      setChatMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Kunne ikke hente svar. Prøv igjen." }]);
    } finally {
      setChatLoading(false);
    }
  }

  const m = insight?.metrics;

  return (
    <div>
      <SectionHeader
        title="Økonomi AI"
        sub="Automatisk analyse av inntekter, abonnementer og brukervekst"
        action={
          <button
            onClick={() => { setLoading(true); setInsight(null); if (token) { fetch("/api/admin/finance-insight", { headers: authHeader(token) }).then(r => r.json()).then((d: FinanceInsight) => setInsight(d)).finally(() => setLoading(false)); } }}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Oppdater
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="flex items-center gap-2 text-white/40 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyserer økonomidata...
          </div>
        </div>
      ) : insight ? (
        <div className="space-y-5">
          {/* Summary banner */}
          <div className="rounded-xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/8 to-violet-500/5 p-5">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider mb-2">Analyseoversikt</p>
                <p className="text-sm text-white/70 leading-relaxed">{insight.summary}</p>
                <p className="text-[10px] text-white/25 mt-2.5">
                  Generert {new Date(insight.generatedAt).toLocaleString("nb-NO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  {" · "}Basert på {insight.metrics.totalUsers} brukere og {insight.metrics.activeSubscriptions} Stripe-abonnementer
                </p>
              </div>
            </div>
          </div>

          {/* Mini KPI row */}
          {m && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "MRR", value: `kr ${m.mrr.toLocaleString("nb-NO")}`, sub: `ARR ${(m.arr/1000).toFixed(0)}k`, color: "from-indigo-500/30 to-indigo-600/20", border: "border-indigo-500/20" },
                { label: "Betalende brukere", value: m.payingUsers, sub: `av ${m.totalUsers} totalt`, color: "from-cyan-500/20 to-cyan-600/10", border: "border-cyan-500/15" },
                { label: "Aktive abonnement", value: m.activeSubscriptions, sub: m.cancelingSubscriptions > 0 ? `${m.cancelingSubscriptions} avslutter` : "ingen avslutter", color: "from-violet-500/20 to-violet-600/10", border: "border-violet-500/15" },
                { label: "Problematisk", value: m.openInvoices + m.failedInvoices, sub: "fakturaer å følge opp", color: m.openInvoices + m.failedInvoices > 0 ? "from-red-500/20 to-red-600/10" : "from-emerald-500/20 to-emerald-600/10", border: m.openInvoices + m.failedInvoices > 0 ? "border-red-500/20" : "border-emerald-500/15" },
              ].map(kpi => (
                <div key={kpi.label} className={`rounded-xl border ${kpi.border} bg-gradient-to-br ${kpi.color} p-4`}>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{kpi.label}</p>
                  <p className="text-xl font-bold text-white">{kpi.value}</p>
                  <p className="text-[10px] text-white/35 mt-0.5">{kpi.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Four insight cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InsightCard title="Nøkkeltall" icon={BarChart3}      items={insight.insights}     color="cyan"    />
            <InsightCard title="Risikoer"   icon={AlertCircle}    items={insight.risks}        color="red"     />
            <InsightCard title="Muligheter" icon={Lightbulb}      items={insight.opportunities} color="amber"  />
            <InsightCard title="Neste steg" icon={CheckCircle2}   items={insight.nextSteps}    color="emerald" />
          </div>

          {/* Chat section */}
          <div className="rounded-xl border border-white/8 bg-black/20 overflow-hidden">
            <div className="border-b border-white/6 px-5 py-3 flex items-center gap-2.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <p className="text-xs font-semibold text-white">Spør økonomiassistenten</p>
              <span className="text-[10px] text-white/25 ml-auto">Regel-basert analyse på dine data</span>
            </div>

            {/* Suggested questions — shown when chat is empty */}
            {chatMessages.length === 0 && (
              <div className="px-5 pt-4 pb-2">
                <p className="text-[10px] text-white/30 mb-2 uppercase tracking-wider">Foreslåtte spørsmål</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => void sendMessage(q)}
                      className="text-[11px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-1.5 hover:bg-indigo-500/20 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="px-5 py-4 space-y-3 max-h-[400px] overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <ChatMessage key={i} role={msg.role} content={msg.content} />
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-white/30 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <Bot className="w-3 h-3 text-indigo-400" />
                  </div>
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-indigo-400/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-indigo-400/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-indigo-400/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-white/6 px-4 py-3 flex gap-2">
              <Input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                placeholder="Still et spørsmål om økonomi, vekst, churn..."
                className="flex-1 h-9 bg-white/5 border-white/10 text-white placeholder:text-white/25 text-sm"
                disabled={chatLoading}
              />
              <Button
                onClick={() => void sendMessage()}
                disabled={chatLoading || !chatInput.trim()}
                size="sm"
                className="h-9 px-3 bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-white/30 text-sm">
          Kunne ikke laste økonomidata. Prøv å oppdatere.
        </div>
      )}
    </div>
  );
}

// ─── Main admin page ──────────────────────────────────────────────────────────

export default function Admin() {
  const [, navigate] = useLocation();
  const { isSuperAdmin, token, isAuthenticated, isAuthLoading } = useUserAuth();

  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [users, setUsers] = useState<DetailedUser[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [billingStats, setBillingStats] = useState<BillingStats | null>(null);
  const [mrrHistory, setMrrHistory] = useState<MrrPoint[]>([]);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [suggestions, setSuggestions] = useState<AdminSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const h = authHeader(token);
    const [usersRes, clubsRes, statsRes, billingRes, mrrRes, ticketsRes, suggestionsRes] = await Promise.all([
      fetch("/api/admin/users-detailed", { headers: h }),
      fetch("/api/admin/clubs", { headers: h }),
      fetch("/api/admin/stats", { headers: h }),
      fetch("/api/admin/billing-stats", { headers: h }),
      fetch("/api/admin/mrr-history", { headers: h }),
      fetch("/api/admin/support/tickets", { headers: h }),
      fetch("/api/admin/suggestions", { headers: h }),
    ]);
    if (usersRes.ok) setUsers(await usersRes.json() as DetailedUser[]);
    if (clubsRes.ok) setClubs(await clubsRes.json() as Club[]);
    if (statsRes.ok) setStats(await statsRes.json() as Stats);
    if (billingRes.ok) setBillingStats(await billingRes.json() as BillingStats);
    if (mrrRes.ok) setMrrHistory(await mrrRes.json() as MrrPoint[]);
    if (ticketsRes.ok) setTickets(await ticketsRes.json() as AdminTicket[]);
    if (suggestionsRes.ok) setSuggestions(await suggestionsRes.json() as AdminSuggestion[]);
    setLastRefresh(new Date());
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) { navigate("/login"); return; }
    if (!isSuperAdmin) { navigate("/"); return; }
    void load();
  }, [isAuthenticated, isAuthLoading, isSuperAdmin, load, navigate]);

  const openTickets = tickets.filter(t => t.status === "open").length;

  const navWithBadges = NAV_ITEMS.map(item =>
    item.id === "support" && openTickets > 0
      ? { ...item, badge: String(openTickets) }
      : item
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mx-auto animate-pulse">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <p className="text-sm text-white/40">Laster Super Admin Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-0 min-h-[calc(100vh-4rem)] -mx-6 -mt-6">
      {/* Left admin nav */}
      <aside className="w-52 shrink-0 border-r border-white/6 bg-black/20 flex flex-col pt-4 pb-6 sticky top-0 h-screen overflow-y-auto">
        {/* Admin header */}
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
              <Crown className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-sm font-bold text-white">Super Admin</p>
          </div>
          <p className="text-[10px] text-white/30 pl-9">DriveGarage Platform</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 space-y-0.5">
          {navWithBadges.map(item => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-white/40 group-hover:text-white/70"}`} />
                <span className="flex-1 text-left text-xs">{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 min-w-[16px] text-center shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 pt-4 border-t border-white/6 space-y-2">
          <button
            onClick={() => void load()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Oppdater data
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Tilbake til app
          </button>
          {lastRefresh && (
            <p className="text-[9px] text-white/20 px-3">
              Oppdatert {lastRefresh.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 p-8 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeSection === "overview" && (
              <OverviewSection stats={stats} billingStats={billingStats} mrrHistory={mrrHistory} />
            )}
            {activeSection === "ai" && (
              <FinanceInsightSection token={token} />
            )}
            {activeSection === "crm" && (
              <CrmSection users={users} token={token} onUpdate={load} />
            )}
            {activeSection === "payments" && (
              <PaymentsSection token={token} />
            )}
            {activeSection === "subscriptions" && (
              <SubscriptionsSection token={token} />
            )}
            {activeSection === "support" && (
              <SupportSection
                tickets={tickets}
                suggestions={suggestions}
                token={token}
                onUpdate={load}
              />
            )}
            {activeSection === "clubs" && (
              <ClubsSection clubs={clubs} token={token} onUpdate={load} />
            )}
            {activeSection === "system" && (
              <SystemHealthSection token={token} />
            )}
            {activeSection === "audit" && (
              <AuditSection token={token} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
