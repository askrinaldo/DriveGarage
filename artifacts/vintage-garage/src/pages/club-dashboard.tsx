import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui-states";
import {
  Users, MessageSquare, Car, Wrench, ArrowLeft,
  TrendingUp, Calendar, Trophy, Activity, Bike,
  Crown, Shield, UserCheck, User,
} from "lucide-react";

interface Params { id: string }

const CATEGORY_LABELS: Record<string, string> = {
  general: "Generelt",
  technical_help: "Teknisk hjelp",
  restoration: "Restaurering",
  meetup: "Treff",
  parts_for_sale: "Deler til salgs",
};

const CATEGORY_COLORS: Record<string, string> = {
  general: "#b87333",
  technical_help: "#60a5fa",
  restoration: "#34d399",
  meetup: "#f59e0b",
  parts_for_sale: "#a78bfa",
};

const ROLE_ICON: Record<string, React.ReactNode> = {
  owner: <Crown className="w-3 h-3 text-yellow-400" />,
  admin: <Shield className="w-3 h-3 text-blue-400" />,
  moderator: <UserCheck className="w-3 h-3 text-emerald-400" />,
  member: <User className="w-3 h-3 text-muted-foreground" />,
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Eier",
  admin: "Administrator",
  moderator: "Moderator",
  member: "Medlem",
};

const ROLE_COLORS = ["#f59e0b", "#60a5fa", "#34d399", "#b87333"];

const SERVICE_CATEGORY_LABELS: Record<string, string> = {
  oil_change: "Oljeskift",
  brakes: "Bremser",
  tires: "Dekk",
  engine: "Motor",
  electrical: "Elektrisk",
  bodywork: "Karosseri",
  other: "Annet",
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m siden`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}t siden`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d siden`;
  return new Date(date).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

function formatDay(day: string): string {
  return new Date(day).toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

interface DashboardData {
  memberCount: number;
  membersByRole: Array<{ role: string; count: number }>;
  forumPostsCount: number;
  postsByCategory: Array<{ category: string; count: number }>;
  postsLast14Days: Array<{ day: string; count: number }>;
  garageCount: number;
  vehiclesByType: Array<{ type: string; count: number }>;
  recentPosts: Array<{
    id: number;
    memberName: string;
    category: string;
    title: string | null;
    content: string;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
  }>;
  meetupPosts: Array<{
    id: number;
    memberName: string;
    title: string | null;
    content: string;
    createdAt: string;
  }>;
  recentServiceRecords: Array<{
    id: number;
    vehicleId: number;
    title: string;
    category: string;
    serviceDate: string;
    cost: string | null;
    vehicleName: string;
  }>;
  topContributors: Array<{ memberName: string; postCount: number }>;
}

const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="text-muted-foreground mb-1">{label ? formatDay(label) : ""}</p>
      <p className="font-semibold text-primary">{payload[0]?.value ?? 0} innlegg</p>
    </div>
  );
};

const CategoryTooltip = ({
  active, payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{CATEGORY_LABELS[item?.name ?? ""] ?? item?.name}</p>
      <p className="text-primary font-semibold">{item?.value} innlegg</p>
    </div>
  );
};

export default function ClubDashboard() {
  const params = useParams<Params>();
  const clubId = parseInt(params.id, 10);
  const [, navigate] = useLocation();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/clubs/${clubId}/dashboard`)
      .then((r) => {
        if (!r.ok) throw new Error("Feil");
        return r.json() as Promise<DashboardData>;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [clubId]);

  if (loading) return <LoadingState message="Laster dashboard..." />;
  if (error || !data) return <ErrorState onRetry={() => { setError(false); setLoading(true); }} />;

  const maxPosts = Math.max(...data.postsLast14Days.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/clubs/${clubId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Klubbdashboard</h1>
          <p className="text-sm text-muted-foreground">Oversikt og statistikk for klubben</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/clubs/${clubId}/events`}>
            <Button variant="outline" size="sm">
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Arrangementer
            </Button>
          </Link>
          <Link href={`/clubs/${clubId}/forum`}>
            <Button variant="outline" size="sm">
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              Forum
            </Button>
          </Link>
          <Link href={`/clubs/${clubId}`}>
            <Button variant="outline" size="sm">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Medlemmer
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5 text-primary" />}
          label="Medlemmer"
          value={data.memberCount}
          sub={`${data.membersByRole.find((r) => r.role === "owner") ? "1 eier" : "ingen eier"}`}
          color="bg-primary/10"
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5 text-blue-400" />}
          label="Foruminnlegg"
          value={data.forumPostsCount}
          sub={`Siste 14 dager: ${data.postsLast14Days.reduce((s, d) => s + d.count, 0)}`}
          color="bg-blue-500/10"
        />
        <StatCard
          icon={<Car className="w-5 h-5 text-emerald-400" />}
          label="Garasjekjøretøy"
          value={data.garageCount}
          sub={
            data.vehiclesByType.length > 0
              ? data.vehiclesByType.map((v) => `${v.count} ${v.type === "car" ? "bil" : v.type === "motorcycle" ? "mc" : v.type}`).join(", ")
              : "Ingen ennå"
          }
          color="bg-emerald-500/10"
        />
        <StatCard
          icon={<Wrench className="w-5 h-5 text-amber-400" />}
          label="Serviceoppføringer"
          value={data.recentServiceRecords.length > 0 ? data.recentServiceRecords.length : 0}
          sub="Nylige vedlikeholdsrekorder"
          color="bg-amber-500/10"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity area chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Forumaktivitet — siste 14 dager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.postsLast14Days} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b87333" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#b87333" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })
                  }
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  domain={[0, maxPosts + 1]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#b87333"
                  strokeWidth={2}
                  fill="url(#activityGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#b87333", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Innlegg etter kategori
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.postsByCategory.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                Ingen innlegg ennå
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={data.postsByCategory.map((p) => ({
                    name: p.category,
                    count: p.count,
                  }))}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tickFormatter={(v: string) => {
                      const label = CATEGORY_LABELS[v] ?? v;
                      return label.length > 12 ? label.slice(0, 11) + "…" : label;
                    }}
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                    width={84}
                  />
                  <Tooltip content={<CategoryTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {data.postsByCategory.map((entry) => (
                      <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? "#b87333"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: 3 columns */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent posts */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              Nyeste innlegg
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentPosts.length === 0 ? (
              <p className="text-muted-foreground text-sm">Ingen innlegg ennå</p>
            ) : (
              data.recentPosts.map((post) => (
                <Link key={post.id} href={`/clubs/${clubId}/forum/${post.id}`}>
                  <div className="group flex items-start gap-2 rounded-lg p-2 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="text-xs font-medium text-foreground truncate">{post.memberName}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 border-0"
                          style={{ background: `${CATEGORY_COLORS[post.category] ?? "#b87333"}22`, color: CATEGORY_COLORS[post.category] ?? "#b87333" }}
                        >
                          {CATEGORY_LABELS[post.category] ?? post.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {post.title ?? post.content.slice(0, 70)}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0 pt-0.5">{timeAgo(post.createdAt)}</span>
                  </div>
                </Link>
              ))
            )}
            {data.recentPosts.length > 0 && (
              <Link href={`/clubs/${clubId}/forum`}>
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground mt-1">
                  Se alle innlegg →
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Recent maintenance + member roles */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              Nylig vedlikehold
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentServiceRecords.length === 0 ? (
              <p className="text-muted-foreground text-sm">Ingen vedlikeholdsrekorder ennå</p>
            ) : (
              data.recentServiceRecords.map((sr) => (
                <div key={sr.id} className="flex items-start gap-2 rounded-lg p-2 bg-muted/20">
                  <div className="p-1.5 rounded-md bg-amber-500/10 shrink-0 mt-0.5">
                    <Wrench className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{sr.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{sr.vehicleName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{timeAgo(sr.serviceDate)}</span>
                      {sr.cost && (
                        <span className="text-[10px] text-primary font-medium">
                          {parseFloat(sr.cost).toLocaleString("nb-NO")} kr
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            <div className="pt-2 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                Medlemsfordeling
              </p>
              <div className="space-y-1.5">
                {data.membersByRole.length === 0 ? (
                  <p className="text-muted-foreground text-xs">Ingen medlemmer</p>
                ) : (
                  data.membersByRole
                    .sort((a, b) => {
                      const order: Record<string, number> = { owner: 0, admin: 1, moderator: 2, member: 3 };
                      return (order[a.role] ?? 9) - (order[b.role] ?? 9);
                    })
                    .map((r, i) => (
                      <div key={r.role} className="flex items-center gap-2">
                        <span className="shrink-0">{ROLE_ICON[r.role] ?? <User className="w-3 h-3" />}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.round((r.count / data.memberCount) * 100)}%`,
                              background: ROLE_COLORS[i % ROLE_COLORS.length],
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 w-20 truncate">
                          {r.count} {ROLE_LABELS[r.role] ?? r.role}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events + Top contributors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Kommende arrangementer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.meetupPosts.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                <p>Ingen treff annonsert.</p>
                <Link href={`/clubs/${clubId}/forum`}>
                  <Button variant="ghost" size="sm" className="mt-2 w-full text-xs text-emerald-400">
                    + Annonser et treff
                  </Button>
                </Link>
              </div>
            ) : (
              data.meetupPosts.map((post) => (
                <Link key={post.id} href={`/clubs/${clubId}/forum/${post.id}`}>
                  <div className="group flex items-start gap-2 rounded-lg p-2 hover:bg-muted/30 transition-colors cursor-pointer border border-emerald-500/10 bg-emerald-500/5">
                    <div className="p-1.5 rounded-md bg-emerald-500/10 shrink-0 mt-0.5">
                      <Calendar className="w-3 h-3 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-emerald-300 line-clamp-1">
                        {post.title ?? "Treff"}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                        {post.content.slice(0, 80)}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">av {post.memberName} · {timeAgo(post.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}

            <div className="pt-2 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Trophy className="w-3 h-3 text-yellow-400" />
                Mest aktive
              </p>
              {data.topContributors.length === 0 ? (
                <p className="text-muted-foreground text-xs">Ingen aktivitet ennå</p>
              ) : (
                <div className="space-y-1.5">
                  {data.topContributors.map((c, i) => (
                    <div key={c.memberName} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold w-4 text-muted-foreground/60">#{i + 1}</span>
                      <span className="text-xs flex-1 truncate font-medium">{c.memberName}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                        {c.postCount} innlegg
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle type breakdown */}
      {data.vehiclesByType.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Car className="w-4 h-4 text-emerald-400" />
              Kjøretøy i garasjen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <PieChart width={120} height={120}>
                <Pie
                  data={data.vehiclesByType.map((v) => ({ name: v.type, value: v.count }))}
                  cx={60}
                  cy={60}
                  innerRadius={34}
                  outerRadius={54}
                  strokeWidth={0}
                  dataKey="value"
                >
                  {data.vehiclesByType.map((entry, index) => (
                    <Cell
                      key={entry.type}
                      fill={index === 0 ? "#60a5fa" : index === 1 ? "#f59e0b" : "#34d399"}
                    />
                  ))}
                </Pie>
              </PieChart>
              <div className="space-y-3 flex-1">
                {data.vehiclesByType.map((v, i) => {
                  const color = i === 0 ? "#60a5fa" : i === 1 ? "#f59e0b" : "#34d399";
                  return (
                    <div key={v.type} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                      <div className="flex items-center gap-1.5 flex-1">
                        {v.type === "car" ? <Car className="w-3.5 h-3.5 text-muted-foreground" /> : <Bike className="w-3.5 h-3.5 text-muted-foreground" />}
                        <span className="text-sm capitalize">
                          {v.type === "car" ? "Biler" : v.type === "motorcycle" ? "Motorsykler" : v.type}
                        </span>
                      </div>
                      <span className="font-semibold text-sm">{v.count}</span>
                    </div>
                  );
                })}
                <Link href={`/clubs/${clubId}/garage`}>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground w-full mt-1">
                    Se hele garasjen →
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  color: string;
}) {
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${color} shrink-0`}>{icon}</div>
          <div className="min-w-0">
            <div className="text-2xl font-bold tabular-nums">{value.toLocaleString("nb-NO")}</div>
            <div className="text-xs font-medium text-foreground">{label}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
