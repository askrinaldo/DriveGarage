import { Link } from "wouter";
import { 
  Car, 
  Wrench, 
  Banknote, 
  ExternalLink, 
  Activity,
  ArrowRight,
  Route
} from "lucide-react";
import { 
  useGetDashboardStats, 
  useGetRecentActivity,
  getGetDashboardStatsQueryKey,
  getGetRecentActivityQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";

const categoryTranslations: Record<string, string> = {
  "oil-change": "Oljeskift",
  "brakes": "Bremser",
  "tires": "Dekk",
  "engine": "Motor",
  "electrical": "Elektro",
  "bodywork": "Karosseri",
  "other": "Annet"
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });

  const { data: activity, isLoading: activityLoading, isError: activityError, refetch: refetchActivity } = useGetRecentActivity({
    query: { queryKey: getGetRecentActivityQueryKey() }
  });

  const isLoading = statsLoading || activityLoading;
  const isError = statsError || activityError;

  if (isLoading) return <LoadingState message="Laster oversikt..." />;
  if (isError) return <ErrorState onRetry={() => { refetchStats(); refetchActivity(); }} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Oversikt</h1>
          <p className="text-muted-foreground mt-1">Oversikt over dine kjøretøy og vedlikeholdshistorikk.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/vehicles/new">
            <Button>Legg til kjøretøy</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt antall kjøretøy</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVehicles || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.vehiclesWithFinnUrl || 0} med Finn.no-lenke
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviceposter</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalServiceRecords || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">På tvers av alle kjøretøy</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt brukt</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              kr {(stats?.totalSpent || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Livstidsvedlikehold</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt kjørt</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {(stats?.totalTripKm || 0).toLocaleString()} km
            </div>
            <p className="text-xs text-muted-foreground mt-1">Logget i kjørebok</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Tjenester etter kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.servicesByCategory && stats.servicesByCategory.length > 0 ? (
              <div className="space-y-4">
                {stats.servicesByCategory.map(cat => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary/70" />
                      <span className="text-sm capitalize">{categoryTranslations[cat.category] || cat.category}</span>
                    </div>
                    <span className="text-sm font-medium">{cat.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Ingen serviceposter ennå.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Siste aktivitet</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {!activity || activity.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Ingen nylig aktivitet.
              </div>
            ) : (
              <div className="space-y-4">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <Wrench className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.vehicleName} • {new Date(item.serviceDate).toLocaleDateString("no-NO")}
                      </p>
                    </div>
                    <div className="text-sm font-mono text-muted-foreground">
                      {item.cost ? `kr ${item.cost.toLocaleString()}` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Made by Evolvit */}
      <div className="flex items-center justify-center gap-2 pt-6 pb-2 opacity-40 hover:opacity-70 transition-opacity">
        <span className="text-[10px] text-muted-foreground">Made by</span>
        <img src="/evolvit-logo.webp" alt="Evolvit Solution Norge" className="h-3.5 object-contain" style={{ filter: "grayscale(1) brightness(1.5)" }} />
        <span className="text-[10px] text-muted-foreground">Solution Norge</span>
      </div>
    </div>
  );
}
