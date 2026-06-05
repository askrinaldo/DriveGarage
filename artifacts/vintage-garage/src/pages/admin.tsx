import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/ui-states";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Car, Building2, BarChart3, Search, Shield, ShieldOff,
  TrendingUp, MessageSquare, ArrowLeft, Crown, Ban, CircleCheck,
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const headers = authHeader(token);
    const [usersRes, clubsRes, statsRes] = await Promise.all([
      fetch("/api/admin/users", { headers }),
      fetch("/api/admin/clubs", { headers }),
      fetch("/api/admin/stats", { headers }),
    ]);
    if (usersRes.ok) setUsers(await usersRes.json() as User[]);
    if (clubsRes.ok) setClubs(await clubsRes.json() as Club[]);
    if (statsRes.ok) setStats(await statsRes.json() as Stats);
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
        <TabsList>
          <TabsTrigger value="users">
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Brukere ({users.length})
          </TabsTrigger>
          <TabsTrigger value="clubs">
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            Klubber ({clubs.length})
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
      </Tabs>
    </div>
  );
}
