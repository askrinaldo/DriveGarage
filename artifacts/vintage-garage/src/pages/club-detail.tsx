import { useState, useMemo } from "react";
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
  getListClubsQueryKey,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Mail, Link2, Copy, Check, Clock, XCircle,
  Warehouse, MessageSquare, LayoutDashboard, Calendar, ShoppingBag,
  Lock, Globe, MoreHorizontal, UserMinus, ChevronRight,
  ClipboardList,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClubAuth } from "@/hooks/use-club-auth";
import { useUserAuth } from "@/hooks/use-user-auth";

interface Params { id: string }

const typeLabel: Record<string, string> = {
  car: "Bil",
  motorcycle: "Motorsykkel",
  both: "Bil & MC",
};

const typeColor: Record<string, string> = {
  car: "bg-blue-500/20 text-blue-300 border-blue-500/25",
  motorcycle: "bg-amber-500/20 text-amber-300 border-amber-500/25",
  both: "bg-emerald-500/20 text-emerald-300 border-emerald-500/25",
};

const bannerGradients: Record<string, string> = {
  car: "from-blue-950 via-blue-900/70 to-blue-800/30",
  motorcycle: "from-amber-950 via-amber-900/70 to-amber-800/30",
  both: "from-emerald-950 via-emerald-900/70 to-emerald-800/30",
};

const roleLabel: Record<string, string> = {
  owner: "Eier",
  admin: "Administrator",
  moderator: "Moderator",
  member: "Medlem",
};

const roleBadgeClass: Record<string, string> = {
  owner: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  admin: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  moderator: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  member: "bg-muted/60 text-muted-foreground border-border",
};

const roleOrder: Record<string, number> = { owner: 0, admin: 1, moderator: 2, member: 3 };

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

// Avatar color derived from name
const AVATAR_COLORS = [
  "bg-red-500/25 text-red-200",
  "bg-orange-500/25 text-orange-200",
  "bg-amber-500/25 text-amber-200",
  "bg-lime-500/25 text-lime-200",
  "bg-emerald-500/25 text-emerald-200",
  "bg-teal-500/25 text-teal-200",
  "bg-cyan-500/25 text-cyan-200",
  "bg-sky-500/25 text-sky-200",
  "bg-blue-500/25 text-blue-200",
  "bg-indigo-500/25 text-indigo-200",
  "bg-violet-500/25 text-violet-200",
  "bg-pink-500/25 text-pink-200",
];

function getAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h] ?? AVATAR_COLORS[0]!;
}

const TypeIcon = ({ type }: { type: string }) => {
  if (type === "car") return <Car className="w-6 h-6" />;
  if (type === "motorcycle") return <Bike className="w-6 h-6" />;
  return <span className="flex gap-1"><Car className="w-5 h-5" /><Bike className="w-5 h-5" /></span>;
};

const RoleIcon = ({ role }: { role: string }) => {
  if (role === "owner") return <Crown className="w-3.5 h-3.5 text-yellow-400" />;
  if (role === "admin") return <Shield className="w-3.5 h-3.5 text-blue-400" />;
  if (role === "moderator") return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
  return <User className="w-3.5 h-3.5 text-muted-foreground" />;
};

function getInviteUrl(code: string): string {
  return `${window.location.origin}/clubs/invite/${code}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

function isExpiredDate(d: string) { return new Date(d) < new Date(); }

// Club sub-page navigation links
function ClubNav({ clubId, accessible }: { clubId: number; accessible: boolean }) {
  if (!accessible) return null;
  const links = [
    { href: `/clubs/${clubId}/dashboard`, icon: LayoutDashboard, label: "Dashboard" },
    { href: `/clubs/${clubId}/forum`, icon: MessageSquare, label: "Forum" },
    { href: `/clubs/${clubId}/events`, icon: Calendar, label: "Arrangementer" },
    { href: `/clubs/${clubId}/garage`, icon: Warehouse, label: "Garasje" },
    { href: `/clubs/${clubId}/marketplace`, icon: ShoppingBag, label: "Markedsplass" },
  ];
  return (
    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
      {links.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href}>
          <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground h-8 px-3">
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs">{label}</span>
          </Button>
        </Link>
      ))}
    </div>
  );
}

export default function ClubDetail() {
  const params = useParams<Params>();
  const clubId = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editRoleMember, setEditRoleMember] = useState<{ id: number; name: string; role: string } | null>(null);
  const [newRole, setNewRole] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCreatedBy, setInviteCreatedBy] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  const { session } = useClubAuth(clubId);
  const { name: myUserName, email: myUserEmail, isAuthLoading } = useUserAuth();

  const { data: club, isLoading, isError, refetch } = useGetClub(clubId, {
    query: { queryKey: getGetClubQueryKey(clubId) },
  });

  const myMembership = useMemo(() => {
    const members = club?.members ?? [];
    const candidates = [session?.memberName, myUserName, myUserEmail]
      .filter((c): c is string => !!c)
      .map((c) => c.toLowerCase());
    if (candidates.length === 0) return null;
    return members.find((m) => candidates.includes(m.memberName.toLowerCase())) ?? null;
  }, [club?.members, session?.memberName, myUserName, myUserEmail]);

  const ROLE_RANK: Record<string, number> = { owner: 4, admin: 3, moderator: 2, member: 1 };
  const myRole = myMembership?.role ?? session?.role ?? null;
  const myMemberName = myMembership?.memberName ?? session?.memberName ?? null;
  const isMember = !!myMembership || !!session;
  const canAdmin = (ROLE_RANK[myRole ?? ""] ?? 0) >= ROLE_RANK.admin!;
  const isOwner = (ROLE_RANK[myRole ?? ""] ?? 0) >= ROLE_RANK.owner!;

  const { data: invitations, refetch: refetchInvitations } = useListClubInvitations(clubId, {
    query: { queryKey: getListClubInvitationsQueryKey(clubId), enabled: canAdmin },
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
    try {
      await joinMutation.mutateAsync({ clubId, data: { memberName: myUserName ?? myUserEmail ?? "Gjest" } });
      toast({ title: "Du er nå medlem! 🎉", description: `Velkommen til ${club?.name}!` });
      invalidateClub();
      queryClient.invalidateQueries({ queryKey: getListClubsQueryKey({ scope: "mine" }) });
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error;
      toast({ title: msg ?? "Noe gikk galt", variant: "destructive" });
    }
  }

  async function handleLeave(memberId: number, name: string) {
    try {
      await leaveMutation.mutateAsync({ clubId, memberId });
      toast({ title: `${name} har forlatt klubben` });
      invalidateClub();
      queryClient.invalidateQueries({ queryKey: getListClubsQueryKey({ scope: "mine" }) });
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error;
      toast({ title: msg ?? "Noe gikk galt", variant: "destructive" });
    }
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
        data: { email: inviteEmail.trim() || null, createdBy: inviteCreatedBy.trim() },
      });
      const url = getInviteUrl((result as { code: string }).code ?? "");
      setCreatedInviteUrl(url);
      setInviteEmail("");
      refetchInvitations();
      if ((result as { emailSent?: boolean }).emailSent) {
        toast({ title: "Invitasjon sendt", description: `E-post sendt til ${inviteEmail}` });
      }
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error;
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

  if (isLoading || (isAuthLoading && !isMember)) return <LoadingState message="Laster klubb..." />;
  if (isError || !club) return <ErrorState onRetry={refetch} />;

  // ── Private club, non-member ──────────────────────────────────────────────
  if (club.isPrivate && !isMember) {
    const gradient = bannerGradients[club.clubType] ?? "from-primary/60 via-primary/30 to-primary/10";
    return (
      <div className="space-y-0">
        <Button variant="ghost" size="sm" className="gap-2 mb-4 text-muted-foreground -ml-2" onClick={() => navigate("/clubs")}>
          <ArrowLeft className="w-4 h-4" />
          Tilbake til klubber
        </Button>

        {/* Blurred banner */}
        <div className={`relative w-full h-40 rounded-xl bg-gradient-to-br ${gradient} overflow-hidden mb-0`}>
          {club.bannerUrl && (
            <img src={club.bannerUrl} alt="" className="w-full h-full object-cover opacity-30 blur-sm scale-105" />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-white/70" />
            </div>
          </div>
        </div>

        {/* Locked card */}
        <div className="max-w-md mx-auto -mt-6 relative z-10">
          <Card className="shadow-xl border-border/60">
            <CardContent className="pt-8 pb-8 text-center space-y-5">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {club.logoUrl ? (
                    <img src={club.logoUrl} alt={club.name} className="w-10 h-10 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <TypeIcon type={club.clubType} />
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold">{club.name}</h2>
                <div className="flex items-center justify-center gap-2">
                  <Badge className="bg-slate-500/20 text-slate-300 border-0 gap-1 text-xs">
                    <Lock className="w-2.5 h-2.5" /> Privat klubb
                  </Badge>
                  <Badge className={`text-xs border-0 ${typeColor[club.clubType] ?? ""}`}>
                    {typeLabel[club.clubType]}
                  </Badge>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Denne klubben er privat. Du trenger en invitasjon fra en administrator for å få tilgang.
              </p>

              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground py-2 border-y border-border/50">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {club.memberCount} {club.memberCount === 1 ? "medlem" : "medlemmer"}
                </span>
                {club.location && (
                  <>
                    <span className="text-border">·</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {club.location}
                    </span>
                  </>
                )}
              </div>

              <Button variant="outline" onClick={() => navigate("/clubs")} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Tilbake til klubber
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Compute derived data ───────────────────────────────────────────────────
  const sortedMembers = [...(club.members ?? [])].sort(
    (a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9)
  );

  const filteredMembers = memberSearch
    ? sortedMembers.filter((m) => m.memberName.toLowerCase().includes(memberSearch.toLowerCase()))
    : sortedMembers;

  const activeInvitations = (invitations ?? []).filter(
    (i) => i.status === "pending" && !isExpiredDate(i.expiresAt)
  );
  const pastInvitations = (invitations ?? []).filter(
    (i) => i.status !== "pending" || isExpiredDate(i.expiresAt)
  );

  const gradient = bannerGradients[club.clubType] ?? "from-primary/60 via-primary/30 to-primary/10";
  const accessible = !club.isPrivate || isMember;

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-0 pb-8">
      {/* Top action bar */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground -ml-2" onClick={() => navigate("/clubs")}>
          <ArrowLeft className="w-4 h-4" />
          Klubber
        </Button>
        <div className="flex items-center gap-2">
          {canAdmin && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Inviter</span>
            </Button>
          )}
          {canAdmin && (
            <Link href={`/clubs/${clubId}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Edit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rediger</span>
              </Button>
            </Link>
          )}
          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="w-9 h-9">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {accessible && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/clubs/${clubId}/dashboard`}>
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/clubs/${clubId}/audit-log`}>
                      <ClipboardList className="w-4 h-4 mr-2" /> Revisjonslogg
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {isMember && myMemberName && myRole !== "owner" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <UserMinus className="w-4 h-4 mr-2" /> Forlat klubb
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Forlat {club.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Du vil miste tilgang og må inviteres igjen for å bli med på nytt.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          const m = sortedMembers.find((x) => x.memberName === myMemberName);
                          if (m) void handleLeave(m.id, m.memberName);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Forlat klubb
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Slett klubb
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Slett klubb?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Dette vil permanent slette <strong>{club.name}</strong> og alle tilknyttede data. Kan ikke angres.
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
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Hero banner */}
      <div className="relative w-full h-52 rounded-xl overflow-hidden mb-0">
        {club.bannerUrl ? (
          <img src={club.bannerUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <div className="text-white/10">
              <TypeIcon type={club.clubType} />
            </div>
          </div>
        )}
        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {/* Club info overlaid on banner */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-end gap-4">
            {/* Logo */}
            {club.logoUrl ? (
              <img
                src={club.logoUrl}
                alt={club.name}
                className="w-14 h-14 rounded-xl border-2 border-white/20 object-cover shrink-0 bg-black/50"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl border-2 border-white/20 bg-black/50 flex items-center justify-center shrink-0 text-white/60">
                <TypeIcon type={club.clubType} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-white tracking-tight leading-tight truncate">
                {club.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge className={`text-xs border ${typeColor[club.clubType] ?? ""} bg-black/30`}>
                  {typeLabel[club.clubType] ?? club.clubType}
                </Badge>
                {club.isPrivate ? (
                  <Badge className="text-xs bg-black/40 text-white/70 border-white/15 gap-1">
                    <Lock className="w-2.5 h-2.5" /> Privat
                  </Badge>
                ) : (
                  <Badge className="text-xs bg-black/40 text-white/70 border-white/15 gap-1">
                    <Globe className="w-2.5 h-2.5" /> Offentlig
                  </Badge>
                )}
                {myRole && (
                  <Badge className={`text-xs border gap-1 ${roleBadgeClass[myRole] ?? ""}`}>
                    <RoleIcon role={myRole} />
                    {roleLabel[myRole] ?? myRole}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats + join bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border/50 mb-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <strong className="text-foreground">{club.memberCount.toLocaleString("nb-NO")}</strong>
            {" "}{club.memberCount === 1 ? "medlem" : "medlemmer"}
          </span>
          {club.location && (
            <>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {club.location}
              </span>
            </>
          )}
        </div>

        {/* Join button for non-members */}
        {!isMember && !club.isPrivate && (
          club.joinMode === "invite_only" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              Krever invitasjon
            </div>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="gap-2 shrink-0" disabled={joinMutation.isPending}>
                  {joinMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <UserPlus className="w-4 h-4" />
                  }
                  Bli med i klubben
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bli med i {club.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Du blir registrert som medlem og kan forlate klubben igjen når som helst.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={handleJoin}>Bli med</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )
        )}
      </div>

      {/* Sub-page navigation */}
      <div className="mb-4 -mx-1 px-1 border-b border-border/40 pb-2">
        <ClubNav clubId={clubId} accessible={accessible} />
      </div>

      {/* Description */}
      {club.description && (
        <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-2xl">
          {club.description}
        </p>
      )}

      {/* Tabs: Members | Invitations */}
      <Tabs defaultValue="members">
        <TabsList className="mb-5 h-10">
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" />
            Medlemmer
            <span className="text-xs opacity-60 tabular-nums">{sortedMembers.length}</span>
          </TabsTrigger>
          {canAdmin && (
            <TabsTrigger value="invitations" className="gap-2">
              <Mail className="w-4 h-4" />
              Invitasjoner
              {activeInvitations.length > 0 && (
                <span className="ml-0.5 text-[10px] font-bold bg-amber-500/25 text-amber-300 rounded-full px-1.5 py-0.5 leading-none">
                  {activeInvitations.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Members tab ── */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative flex-1 max-w-xs">
                  <Input
                    placeholder="Søk etter navn..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="h-8 text-sm pl-3"
                  />
                </div>
                {memberSearch && (
                  <button
                    onClick={() => setMemberSearch("")}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Nullstill
                  </button>
                )}
              </div>
              {canAdmin && (
                <Button size="sm" variant="outline" className="gap-1.5 h-8 shrink-0" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Inviter</span>
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-0">
              {filteredMembers.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {memberSearch ? `Ingen medlemmer matcher «${memberSearch}»` : "Ingen medlemmer ennå."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {filteredMembers.map((member) => {
                    const avatarColor = getAvatarColor(member.memberName);
                    const isMe = myMemberName && member.memberName === myMemberName;
                    const canManage = canAdmin && !isMe && member.role !== "owner";
                    const myRank = ROLE_RANK[myRole ?? ""] ?? 0;
                    const memberRank = ROLE_RANK[member.role] ?? 0;
                    const canPromote = canManage && myRank > memberRank;

                    return (
                      <li
                        key={member.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors group"
                      >
                        {/* Avatar + info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-sm font-semibold shrink-0`}>
                            {member.memberName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium leading-tight">
                                {member.memberName}
                              </span>
                              {isMe && (
                                <span className="text-[10px] text-muted-foreground">(deg)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <RoleIcon role={member.role} />
                              <span className={`text-xs px-1.5 py-0.5 rounded border ${roleBadgeClass[member.role] ?? ""}`}>
                                {roleLabel[member.role] ?? member.role}
                              </span>
                              {member.joinedAt && (
                                <span className="text-xs text-muted-foreground/60 hidden sm:inline">
                                  · ble med {formatDate(member.joinedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isMe && member.role !== "owner" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive">
                                  Forlat
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Forlat {club.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Du vil miste tilgang og må inviteres igjen for å bli med på nytt.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleLeave(member.id, member.memberName)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Forlat klubb
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {canPromote && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditRoleMember({ id: member.id, name: member.memberName, role: member.role });
                                        setNewRole(member.role);
                                      }}
                                    >
                                      <Shield className="w-3.5 h-3.5 mr-2" />
                                      Endre rolle
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      <UserMinus className="w-3.5 h-3.5 mr-2" />
                                      Fjern fra klubb
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Fjern {member.memberName}?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {member.memberName} mister tilgang til klubben.
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
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Invitations tab (admin+) ── */}
        {canAdmin && (
          <TabsContent value="invitations" className="space-y-4">
            {/* Create invite inline form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  Inviter nytt medlem
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Din rolle / navn *</Label>
                    <Input
                      placeholder="Ola Nordmann"
                      value={inviteCreatedBy}
                      onChange={(e) => setInviteCreatedBy(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">E-post (valgfritt)</Label>
                    <Input
                      placeholder="invitert@eksempel.no"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                {createdInviteUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-sm text-emerald-300">Invitasjon opprettet — gyldig i 7 dager</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={createdInviteUrl}
                        readOnly
                        className="font-mono text-xs h-9"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-9 w-9 shrink-0"
                        onClick={() => copyToClipboard(createdInviteUrl, "new")}
                      >
                        {copiedCode === "new"
                          ? <Check className="w-4 h-4 text-emerald-400" />
                          : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCreatedInviteUrl(null); setInviteEmail(""); }}
                    >
                      Lag ny invitasjon
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleCreateInvite}
                    disabled={createInviteMutation.isPending || !inviteCreatedBy.trim()}
                    size="sm"
                    className="gap-2"
                  >
                    {createInviteMutation.isPending
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Link2 className="w-3.5 h-3.5" />}
                    Generer invitasjonslenke
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Active invitations */}
            <Card>
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Aktive invitasjoner
                  {activeInvitations.length > 0 && (
                    <span className="text-xs bg-amber-500/20 text-amber-300 rounded-full px-2 py-0.5">
                      {activeInvitations.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {activeInvitations.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Ingen aktive invitasjoner.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {activeInvitations.map((inv) => {
                      const url = getInviteUrl(inv.code);
                      const copied = copiedCode === inv.code;
                      return (
                        <li key={inv.id} className="px-4 py-3 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              {inv.email && (
                                <div className="flex items-center gap-1.5 text-sm font-medium">
                                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate">{inv.email}</span>
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Clock className="w-3 h-3 shrink-0" />
                                Utløper {formatDate(inv.expiresAt)}
                                <span className="text-border">·</span>
                                Av <strong>{inv.createdBy}</strong>
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => copyToClipboard(url, inv.code)}
                              >
                                {copied
                                  ? <><Check className="w-3 h-3 text-emerald-400" /> Kopiert</>
                                  : <><Copy className="w-3 h-3" /> Kopier</>
                                }
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
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
                          <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md text-xs font-mono text-muted-foreground">
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

            {/* Invitation history */}
            {pastInvitations.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm text-muted-foreground">Historikk</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border/50">
                    {pastInvitations.map((inv) => {
                      const effectiveStatus =
                        inv.status === "pending" && isExpiredDate(inv.expiresAt) ? "expired" : inv.status;
                      return (
                        <li key={inv.id} className="flex items-center justify-between px-4 py-3 gap-3">
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
                                : <span>Av <strong>{inv.createdBy}</strong> · {formatDate(inv.createdAt)}</span>
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
        )}
      </Tabs>

      {/* ── Edit role dialog ── */}
      <Dialog open={!!editRoleMember} onOpenChange={(o) => !o && setEditRoleMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Endre rolle for {editRoleMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="space-y-1.5">
              <Label>Nåværende rolle</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground">
                <RoleIcon role={editRoleMember?.role ?? ""} />
                {roleLabel[editRoleMember?.role ?? ""] ?? editRoleMember?.role}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Ny rolle</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      Administrator
                    </div>
                  </SelectItem>
                  <SelectItem value="moderator">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Moderator
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      Medlem
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleMember(null)}>Avbryt</Button>
            <Button onClick={handleRoleUpdate} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Lagre rolle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create invitation dialog (from sidebar invite button) ── */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(o) => {
          setInviteOpen(o);
          if (!o) { setCreatedInviteUrl(null); setInviteEmail(""); }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Inviter til {club.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Ditt navn *</Label>
              <Input
                placeholder="Ola Nordmann"
                value={inviteCreatedBy}
                onChange={(e) => setInviteCreatedBy(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-post til inviterte (valgfritt)</Label>
              <Input
                placeholder="venn@eksempel.no"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                La stå tom for å generere en lenke du kan dele selv.
              </p>
            </div>

            {createdInviteUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-emerald-300">Invitasjon opprettet!</span>
                </div>
                <div className="space-y-1.5">
                  <Label>Invitasjonslenke (gyldig 7 dager)</Label>
                  <div className="flex gap-2">
                    <Input value={createdInviteUrl} readOnly className="font-mono text-xs" />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(createdInviteUrl, "modal")}
                      className="shrink-0"
                    >
                      {copiedCode === "modal"
                        ? <Check className="w-4 h-4 text-emerald-400" />
                        : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            {createdInviteUrl ? (
              <>
                <Button variant="outline" onClick={() => { setCreatedInviteUrl(null); setInviteEmail(""); }}>
                  Ny invitasjon
                </Button>
                <DialogClose asChild>
                  <Button>Ferdig</Button>
                </DialogClose>
              </>
            ) : (
              <>
                <DialogClose asChild>
                  <Button variant="outline">Avbryt</Button>
                </DialogClose>
                <Button onClick={handleCreateInvite} disabled={createInviteMutation.isPending || !inviteCreatedBy.trim()}>
                  {createInviteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generer lenke
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
