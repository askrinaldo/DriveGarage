import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Building2, Users, Plus, Mail, Trash2, Crown, Shield, User, Settings } from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { LoadingState } from "@/components/ui-states";

interface TenantMember {
  userId: number;
  role: "owner" | "admin" | "member";
  name: string;
  email: string;
  joinedAt: string;
}

interface TenantDetails {
  id: number;
  name: string;
  slug: string;
  isPersonal: boolean;
  createdAt: string;
  members: TenantMember[];
  myRole: "owner" | "admin" | "member";
}

const ROLE_CONFIG = {
  owner: { label: "Eier", icon: Crown, color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
  admin: { label: "Admin", icon: Shield, color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  member: { label: "Medlem", icon: User, color: "text-muted-foreground bg-muted/30 border-border" },
};

function authHeader(token: string | null): Record<string, string> {
  if (!token) return {};
  return { "x-user-token": token };
}

export default function TenantSettings() {
  const [, navigate] = useLocation();
  const { isAuthenticated, token, tenantId, tenantRole } = useUserAuth();

  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    const res = await fetch(`/api/tenants/${tenantId}`, { headers: authHeader(token) });
    if (res.ok) {
      const data = await res.json() as TenantDetails;
      setTenant(data);
      setEditName(data.name);
    }
    setLoading(false);
  }, [tenantId, token]);

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login"); return; }
    void load();
  }, [isAuthenticated, load, navigate]);

  async function saveName() {
    if (!tenantId || !editName.trim()) return;
    setSavingName(true);
    await fetch(`/api/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify({ name: editName }),
    });
    setSavingName(false);
    void load();
  }

  async function handleInvite() {
    if (!tenantId || !inviteEmail.trim()) return;
    setInviting(true);
    const res = await fetch(`/api/tenants/${tenantId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader(token) },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    setInviting(false);
    if (res.ok) {
      const data = await res.json() as { inviteUrl: string };
      setInviteLink(`${window.location.origin}${data.inviteUrl}`);
      setInviteEmail("");
    } else {
      const err = await res.json() as { error: string };
      alert(err.error ?? "Feil ved invitasjon");
    }
  }

  async function removeMember(memberId: number) {
    if (!tenantId) return;
    if (!confirm("Fjerne dette medlemmet?")) return;
    await fetch(`/api/tenants/${tenantId}/members/${memberId}`, {
      method: "DELETE",
      headers: authHeader(token),
    });
    void load();
  }

  if (loading) return <LoadingState message="Laster organisasjonsinnstillinger..." />;
  if (!tenant) return null;

  const canEdit = tenantRole === "owner" || tenantRole === "admin";
  const isOwner = tenantRole === "owner";

  return (
    <div className="space-y-6 pb-10 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Organisasjonsinnstillinger</h1>
          </div>
          <p className="text-sm text-muted-foreground">Administrer din garasje-organisasjon</p>
        </div>
      </div>

      {/* Tenant info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{tenant.name}</CardTitle>
              <CardDescription className="text-xs">
                {tenant.isPersonal ? "Personlig garasje" : "Organisasjon"} · {tenant.members.length} {tenant.members.length === 1 ? "medlem" : "medlemmer"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {canEdit && !tenant.isPersonal && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              <Label className="text-sm">Navn på organisasjon</Label>
              <div className="flex gap-2">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                <Button onClick={saveName} disabled={savingName || editName === tenant.name} size="sm">
                  {savingName ? "Lagrer..." : "Lagre"}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Members */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Medlemmer</CardTitle>
            </div>
            {canEdit && (
              <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) setInviteLink(null); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 h-7 text-xs">
                    <Plus className="w-3 h-3" />Inviter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Inviter nytt medlem</DialogTitle>
                  </DialogHeader>
                  {inviteLink ? (
                    <div className="space-y-3 py-2">
                      <p className="text-sm text-muted-foreground">Invitasjonlenke opprettet. Del denne med personen:</p>
                      <div className="rounded-md bg-muted p-3 font-mono text-xs break-all select-all">
                        {inviteLink}
                      </div>
                      <Button className="w-full" onClick={() => { void navigator.clipboard.writeText(inviteLink); }}>
                        Kopier lenke
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 py-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm">E-post</Label>
                        <Input
                          type="email"
                          placeholder="bruker@eksempel.no"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Rolle</Label>
                        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member")}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Medlem</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  {!inviteLink && (
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setInviteOpen(false)}>Avbryt</Button>
                      <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                        <Mail className="w-3.5 h-3.5 mr-1.5" />
                        {inviting ? "Sender..." : "Opprett invitasjon"}
                      </Button>
                    </DialogFooter>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="divide-y divide-border/50">
            {tenant.members.map((member) => {
              const roleConfig = ROLE_CONFIG[member.role];
              return (
                <div key={member.userId} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {member.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${roleConfig.color}`}>
                    <roleConfig.icon className="w-2.5 h-2.5 mr-1" />
                    {roleConfig.label}
                  </Badge>
                  {isOwner && member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => void removeMember(member.userId)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create new org (for non-org tenants) */}
      {tenant.isPersonal && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <Building2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium mb-1">Opprett en organisasjons-garasje</p>
            <p className="text-xs text-muted-foreground mb-4">
              Del garasjen med kolleger, partner eller klubb — alle ser de samme kjøretøyene.
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate("/tenant-new")}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Ny organisasjon
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
