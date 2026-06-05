import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetClub,
  useDeleteClub,
  useJoinClub,
  useLeaveClub,
  useUpdateClubMember,
  useListClubInvitations,
  useCreateClubInvitation,
  useRevokeClubInvitation,
  getGetClubQueryKey,
  getListClubInvitationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LoadingState, ErrorState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Edit, Trash2, Users, MapPin, Car, Bike,
  Crown, Shield, UserCheck, User, UserPlus, Loader2,
  Mail, Link2, Copy, Check, Clock, XCircle, RotateCcw, Warehouse, MessageSquare, ClipboardList, LayoutDashboard, Calendar, ShoppingBag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Params { id: string }

const typeLabel: Record<string, string> = {
  car: "Bil",
  motorcycle: "Motorsykkel",
  both: "Bil og motorsykkel",
};

const typeColor: Record<string, string> = {
  car: "bg-blue-500/20 text-blue-300",
  motorcycle: "bg-amber-500/20 text-amber-300",
  both: "bg-emerald-500/20 text-emerald-300",
};

const roleLabel: Record<string, string> = {
  owner: "Eier",
  admin: "Administrator",
  moderator: "Moderator",
  member: "Medlem",
};

const roleOrder: Record<string, number> = { owner: 0, admin: 1, moderator: 2, member: 3 };

const RoleIcon = ({ role }: { role: string }) => {
  if (role === "owner") return <Crown className="w-3.5 h-3.5 text-yellow-400" />;
  if (role === "admin") return <Shield className="w-3.5 h-3.5 text-blue-400" />;
  if (role === "moderator") return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
  return <User className="w-3.5 h-3.5 text-muted-foreground" />;
};

const roleBadgeClass: Record<string, string> = {
  owner: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  admin: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  moderator: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  member: "bg-muted text-muted-foreground border-border",
};

const TypeIcon = ({ type }: { type: string }) => {
  if (type === "car") return <Car className="w-6 h-6" />;
  if (type === "motorcycle") return <Bike className="w-6 h-6" />;
  return <span className="flex gap-1"><Car className="w-5 h-5" /><Bike className="w-5 h-5" /></span>;
};

const inviteStatusLabel: Record<string, string> = {
  pending: "Venter",
  accepted: "Godtatt",
  declined: "Avslått",
  revoked: "Tilbakekalt",
  expired: "Utløpt",
};

const inviteStatusClass: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  accepted: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  declined: "bg-muted text-muted-foreground border-border",
  revoked: "bg-destructive/15 text-destructive border-destructive/30",
  expired: "bg-muted text-muted-foreground border-border",
};

function getInviteUrl(code: string): string {
  return `${window.location.origin}/clubs/invite/${code}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

function isExpiredDate(d: string) {
  return new Date(d) < new Date();
}

export default function ClubDetail() {
  const params = useParams<Params>();
  const clubId = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinName, setJoinName] = useState("");
  const [editRoleMember, setEditRoleMember] = useState<{ id: number; name: string; role: string } | null>(null);
  const [newRole, setNewRole] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCreatedBy, setInviteCreatedBy] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);

  const { data: club, isLoading, isError, refetch } = useGetClub(clubId, {
    query: { queryKey: getGetClubQueryKey(clubId) },
  });

  const { data: invitations, refetch: refetchInvitations } = useListClubInvitations(clubId, {
    query: { queryKey: getListClubInvitationsQueryKey(clubId) },
  });

  const deleteMutation = useDeleteClub();
  const joinMutation = useJoinClub();
  const leaveMutation = useLeaveClub();
  const updateRoleMutation = useUpdateClubMember();
  const createInviteMutation = useCreateClubInvitation();
  const revokeInviteMutation = useRevokeClubInvitation();

  const invalidateClub = () => queryClient.invalidateQueries({ queryKey: getGetClubQueryKey(clubId) });

  async function handleDelete() {
    await deleteMutation.mutateAsync({ id: clubId });
    toast({ title: "Klubb slettet" });
    navigate("/clubs");
  }

  async function handleJoin() {
    if (!joinName.trim()) return;
    try {
      await joinMutation.mutateAsync({ clubId, data: { memberName: joinName.trim() } });
      toast({ title: "Du er nå medlem", description: `Velkommen til ${club?.name}!` });
      setJoinOpen(false);
      setJoinName("");
      invalidateClub();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast({ title: msg ?? "Noe gikk galt", variant: "destructive" });
    }
  }

  async function handleLeave(memberId: number, name: string) {
    await leaveMutation.mutateAsync({ clubId, memberId });
    toast({ title: `${name} har forlatt klubben` });
    invalidateClub();
  }

  async function handleRoleUpdate() {
    if (!editRoleMember || !newRole) return;
    await updateRoleMutation.mutateAsync({
      clubId,
      memberId: editRoleMember.id,
      data: { role: newRole as "admin" | "moderator" | "member" },
    });
    toast({ title: "Rolle oppdatert" });
    setEditRoleMember(null);
    invalidateClub();
  }

  async function handleCreateInvite() {
    if (!inviteCreatedBy.trim()) {
      toast({ title: "Ditt navn er påkrevd", variant: "destructive" });
      return;
    }
    try {
      const result = await createInviteMutation.mutateAsync({
        clubId,
        data: {
          email: inviteEmail.trim() || null,
          createdBy: inviteCreatedBy.trim(),
        },
      });
      const url = getInviteUrl((result as { code: string }).code ?? "");
      setCreatedInviteUrl(url);
      setInviteEmail("");
      refetchInvitations();
      if ((result as { emailSent?: boolean }).emailSent) {
        toast({ title: "Invitasjon sendt", description: `E-post sendt til ${inviteEmail}` });
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast({ title: msg ?? "Noe gikk galt", variant: "destructive" });
    }
  }

  async function handleRevoke(invitationId: number) {
    await revokeInviteMutation.mutateAsync({ clubId, invitationId });
    toast({ title: "Invitasjon tilbakekalt" });
    refetchInvitations();
  }

  async function copyToClipboard(text: string, code: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast({ title: "Kunne ikke kopiere", variant: "destructive" });
    }
  }

  if (isLoading) return <LoadingState message="Laster klubb..." />;
  if (isError || !club) return <ErrorState onRetry={refetch} />;

  const sortedMembers = [...(club.members ?? [])].sort(
    (a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9)
  );

  const activeInvitations = (invitations ?? []).filter(
    (i) => i.status === "pending" && !isExpiredDate(i.expiresAt)
  );
  const pastInvitations = (invitations ?? []).filter(
    (i) => i.status !== "pending" || isExpiredDate(i.expiresAt)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clubs")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight flex-1 truncate">{club.name}</h1>
        <div className="flex gap-2 shrink-0">
          <Link href={`/clubs/${clubId}/dashboard`}>
            <Button variant="outline" size="sm">
              <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
              Dashboard
            </Button>
          </Link>
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
          <Link href={`/clubs/${clubId}/garage`}>
            <Button variant="outline" size="sm">
              <Warehouse className="w-3.5 h-3.5 mr-1.5" />
              Garasje
            </Button>
          </Link>
          <Link href={`/clubs/${clubId}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="w-3.5 h-3.5 mr-1.5" />
              Rediger
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Slett
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Slett klubb?</AlertDialogTitle>
                <AlertDialogDescription>
                  Dette vil permanent slette <strong>{club.name}</strong> og alle medlemmer. Handlingen kan ikke angres.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Slett klubb
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Banner */}
      {club.bannerUrl ? (
        <div
          className="w-full h-40 rounded-xl bg-cover bg-center border border-border"
          style={{ backgroundImage: `url(${club.bannerUrl})` }}
        />
      ) : (
        <div className="w-full h-40 rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 border border-border flex items-center justify-center">
          <div className="text-primary/40">
            <TypeIcon type={club.clubType} />
          </div>
        </div>
      )}

      {/* Info + stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {club.logoUrl ? (
                <img
                  src={club.logoUrl}
                  alt={club.name}
                  className="w-16 h-16 rounded-lg object-cover border border-border shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <TypeIcon type={club.clubType} />
                </div>
              )}
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge className={`${typeColor[club.clubType] ?? ""} border-0 text-sm`}>
                    {typeLabel[club.clubType] ?? club.clubType}
                  </Badge>
                  {club.location && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      {club.location}
                    </span>
                  )}
                </div>
                {club.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{club.description}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-md">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{club.memberCount}</div>
                <div className="text-xs text-muted-foreground">
                  {club.memberCount === 1 ? "Medlem" : "Medlemmer"}
                </div>
              </div>
            </div>
            <Link href={`/clubs/${clubId}/forum`} className="block">
              <Button variant="secondary" className="w-full">
                <MessageSquare className="w-4 h-4 mr-2" />
                Forum
              </Button>
            </Link>
            <Link href={`/clubs/${clubId}/garage`} className="block">
              <Button variant="secondary" className="w-full">
                <Warehouse className="w-4 h-4 mr-2" />
                Se klubbens garasje
              </Button>
            </Link>
            <Link href={`/clubs/${clubId}/marketplace`} className="block">
              <Button variant="secondary" className="w-full">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Markedsplass for deler
              </Button>
            </Link>
            <Link href={`/clubs/${clubId}/audit-log`} className="block">
              <Button variant="ghost" className="w-full text-muted-foreground">
                <ClipboardList className="w-4 h-4 mr-2" />
                Revisjonslogg
              </Button>
            </Link>
            <Button className="w-full" onClick={() => setJoinOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Bli medlem
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setInviteOpen(true)}>
              <Link2 className="w-4 h-4 mr-2" />
              Inviter noen
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Medlemmer / Invitasjoner */}
      <Tabs defaultValue="members">
        <TabsList className="mb-4">
          <TabsTrigger value="members">
            Medlemmer <span className="ml-1.5 text-xs opacity-60">{sortedMembers.length}</span>
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitasjoner
            {activeInvitations.length > 0 && (
              <span className="ml-1.5 text-xs bg-amber-500/20 text-amber-300 rounded px-1">
                {activeInvitations.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Members tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <CardTitle className="text-base">Medlemmer</CardTitle>
              <span className="text-sm text-muted-foreground">{sortedMembers.length} totalt</span>
            </CardHeader>
            <CardContent className="p-0">
              {sortedMembers.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">Ingen medlemmer ennå.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {sortedMembers.map((member) => (
                    <li key={member.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {member.memberName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-sm font-medium">{member.memberName}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <RoleIcon role={member.role} />
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${roleBadgeClass[member.role] ?? ""}`}>
                              {roleLabel[member.role] ?? member.role}
                            </span>
                          </div>
                        </div>
                      </div>
                      {member.role !== "owner" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7"
                            onClick={() => {
                              setEditRoleMember({ id: member.id, name: member.memberName, role: member.role });
                              setNewRole(member.role);
                            }}
                          >
                            Endre rolle
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive hover:text-destructive">
                                Fjern
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Fjerne {member.memberName}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Dette vil fjerne {member.memberName} fra klubben.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleLeave(member.id, member.memberName)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Fjern
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invitations tab */}
        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader className="py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Aktive invitasjoner</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                Ny invitasjon
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {activeInvitations.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  Ingen aktive invitasjoner. Opprett en ny for å invitere noen.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {activeInvitations.map((inv) => {
                    const url = getInviteUrl(inv.code);
                    const copied = copiedCode === inv.code;
                    return (
                      <li key={inv.id} className="px-6 py-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            {inv.email && (
                              <div className="flex items-center gap-1.5 text-sm">
                                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{inv.email}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>Utløper {formatDate(inv.expiresAt)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Opprettet av <strong>{inv.createdBy}</strong>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => copyToClipboard(url, inv.code)}
                            >
                              {copied ? (
                                <><Check className="w-3 h-3 text-emerald-400" /> Kopiert</>
                              ) : (
                                <><Copy className="w-3 h-3" /> Kopier lenke</>
                              )}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive">
                                  <XCircle className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Trekk tilbake invitasjon?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Lenken vil slutte å fungere umiddelbart.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRevoke(inv.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Trekk tilbake
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-muted/40 rounded text-xs font-mono text-muted-foreground break-all">
                          <Link2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{url}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {pastInvitations.length > 0 && (
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-base text-muted-foreground">Historikk</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {pastInvitations.map((inv) => {
                    const effectiveStatus =
                      inv.status === "pending" && isExpiredDate(inv.expiresAt) ? "expired" : inv.status;
                    return (
                      <li key={inv.id} className="flex items-center justify-between px-6 py-3 gap-3">
                        <div className="min-w-0 space-y-0.5">
                          {inv.email && (
                            <div className="text-sm truncate flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              {inv.email}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {inv.usedBy
                              ? <span>Brukt av <strong>{inv.usedBy}</strong></span>
                              : <span>Opprettet av <strong>{inv.createdBy}</strong> · {formatDate(inv.createdAt)}</span>
                            }
                          </div>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded border shrink-0 ${inviteStatusClass[effectiveStatus] ?? ""}`}>
                          {inviteStatusLabel[effectiveStatus] ?? effectiveStatus}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Join dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bli medlem av {club.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="joinName">Ditt navn</Label>
              <Input
                id="joinName"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                placeholder="Ola Nordmann"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Avbryt</Button>
            </DialogClose>
            <Button onClick={handleJoin} disabled={joinMutation.isPending || !joinName.trim()}>
              {joinMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Bli med
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit role dialog */}
      <Dialog open={!!editRoleMember} onOpenChange={(o) => !o && setEditRoleMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Endre rolle for {editRoleMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label>Ny rolle</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="member">Medlem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleMember(null)}>Avbryt</Button>
            <Button onClick={handleRoleUpdate} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Lagre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create invitation dialog */}
      <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) { setCreatedInviteUrl(null); setInviteEmail(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inviter til {club.name}</DialogTitle>
          </DialogHeader>
          {createdInviteUrl ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm text-emerald-300">Invitasjon opprettet!</span>
              </div>
              <div className="space-y-1.5">
                <Label>Invitasjonslenke (gyldig i 7 dager)</Label>
                <div className="flex gap-2">
                  <Input value={createdInviteUrl} readOnly className="font-mono text-xs" />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(createdInviteUrl, "new")}
                    className="shrink-0"
                  >
                    {copiedCode === "new" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Del denne lenken med den du vil invitere.</p>
              </div>
              <DialogFooter>
                <Button onClick={() => { setCreatedInviteUrl(null); setInviteEmail(""); }}>
                  Lag ny invitasjon
                </Button>
                <DialogClose asChild>
                  <Button variant="outline">Lukk</Button>
                </DialogClose>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="inviteCreatedBy">Ditt navn (eier/admin) *</Label>
                <Input
                  id="inviteCreatedBy"
                  value={inviteCreatedBy}
                  onChange={(e) => setInviteCreatedBy(e.target.value)}
                  placeholder="Ola Nordmann"
                />
                <p className="text-xs text-muted-foreground">Kun eiere og administratorer kan invitere.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inviteEmail">E-post (valgfritt)</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="navn@eksempel.no"
                />
                <p className="text-xs text-muted-foreground">
                  Hvis du legger inn e-post, sendes invitasjonen automatisk (krever e-postkonfigurasjon).
                </p>
              </div>
              <div className="p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground flex gap-2">
                <RotateCcw className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Invitasjonen utløper automatisk etter 7 dager og kan kun brukes én gang.</span>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Avbryt</Button>
                </DialogClose>
                <Button onClick={handleCreateInvite} disabled={createInviteMutation.isPending || !inviteCreatedBy.trim()}>
                  {createInviteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Opprett invitasjon
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
