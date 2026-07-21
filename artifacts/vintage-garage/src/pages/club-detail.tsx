import { useState, useMemo, useEffect } from "react";
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
  getErrorMessage,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LoadingState, ErrorState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
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
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Edit, Trash2, Users, MapPin, Car, Bike,
  Crown, Shield, UserCheck, User, UserPlus, Loader2,
  Mail, Link2, Copy, Check, Clock, XCircle,
  Warehouse, MessageSquare, LayoutDashboard, Calendar, ShoppingBag,
  Lock, Globe, MoreHorizontal, UserMinus, ChevronRight,
  ClipboardList, Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClubAuth } from "@/hooks/use-club-auth";
import { useUserAuth } from "@/hooks/use-user-auth";

interface Params { id: string }

/* ─── Static maps ──────────────────────────────────────────────── */

const typeLabel: Record<string, string> = {
  car: "Bil",
  motorcycle: "Motorsykkel",
  both: "Bil & MC",
};

const typePillColor: Record<string, string> = {
  car:        "bg-blue-500/20 text-blue-300 border border-blue-500/20",
  motorcycle: "bg-amber-500/20 text-amber-300 border border-amber-500/20",
  both:       "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20",
};

const bannerGradients: Record<string, string> = {
  car:        "from-blue-950 via-blue-900/70 to-blue-800/30",
  motorcycle: "from-amber-950 via-amber-900/70 to-amber-800/30",
  both:       "from-emerald-950 via-emerald-900/70 to-emerald-800/30",
};

const roleLabel: Record<string, string> = {
  owner:     "Eier",
  admin:     "Administrator",
  moderator: "Moderator",
  member:    "Medlem",
};

const rolePillColor: Record<string, string> = {
  owner:     "bg-yellow-500/15 text-yellow-300 border border-yellow-500/25",
  admin:     "bg-blue-500/15 text-blue-300 border border-blue-500/25",
  moderator: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
  member:    "bg-muted/60 text-muted-foreground border border-border",
};

const roleOrder: Record<string, number> = { owner: 0, admin: 1, moderator: 2, member: 3 };

const inviteStatusLabel: Record<string, string> = {
  pending:  "Venter",
  accepted: "Godtatt",
  declined: "Avslått",
  revoked:  "Tilbakekalt",
  expired:  "Utløpt",
};

const inviteStatusColor: Record<string, string> = {
  pending:  "bg-amber-500/15 text-amber-300 border border-amber-500/25",
  accepted: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
  declined: "bg-muted/60 text-muted-foreground border border-border",
  revoked:  "bg-destructive/15 text-destructive border border-destructive/25",
  expired:  "bg-muted/60 text-muted-foreground border border-border",
};

/* ─── Avatar color hash ─────────────────────────────────────────── */

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

/* ─── Small helpers ─────────────────────────────────────────────── */

const TypeIcon = ({ type, size = "md" }: { type: string; size?: "sm" | "md" | "lg" }) => {
  const cls = size === "lg" ? "w-8 h-8" : size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  if (type === "car") return <Car className={cls} />;
  if (type === "motorcycle") return <Bike className={cls} />;
  return <span className="flex gap-1"><Car className={cls} /><Bike className={cls} /></span>;
};

const RoleIcon = ({ role }: { role: string }) => {
  if (role === "owner")     return <Crown className="w-3 h-3 text-yellow-400" />;
  if (role === "admin")     return <Shield className="w-3 h-3 text-blue-400" />;
  if (role === "moderator") return <UserCheck className="w-3 h-3 text-emerald-400" />;
  return <User className="w-3 h-3 text-muted-foreground" />;
};

function getInviteUrl(code: string): string {
  return `${window.location.origin}/clubs/invite/${code}`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

function isExpiredDate(d: string) { return new Date(d) < new Date(); }

/* ─── Club sub-navigation ───────────────────────────────────────── */

function ClubNav({ clubId, accessible }: { clubId: number; accessible: boolean }) {
  if (!accessible) return null;
  const links = [
    { href: `/clubs/${clubId}/dashboard`,   icon: LayoutDashboard, label: "Dashboard" },
    { href: `/clubs/${clubId}/forum`,       icon: MessageSquare,   label: "Forum" },
    { href: `/clubs/${clubId}/events`,      icon: Calendar,        label: "Arrangementer" },
    { href: `/clubs/${clubId}/garage`,      icon: Warehouse,       label: "Garasje" },
    { href: `/clubs/${clubId}/marketplace`, icon: ShoppingBag,     label: "Markedsplass" },
  ];
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
      {links.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href}>
          <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border/40 hover:border-border/70 hover:bg-muted/20 text-muted-foreground/60 hover:text-foreground/80 transition-all duration-200 text-[12px] font-semibold uppercase tracking-wide shrink-0 whitespace-nowrap">
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        </Link>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */

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

  // Join request state (for non-members)
  const [joinReqStatus, setJoinReqStatus] = useState<"none" | "pending" | "accepted" | "declined">("none");
  const [joinReqOpen, setJoinReqOpen] = useState(false);
  const [joinReqMessage, setJoinReqMessage] = useState("");
  const [joinReqSending, setJoinReqSending] = useState(false);

  // Admin join requests
  type JoinReqItem = { id: number; memberName: string; message: string | null; status: string; createdAt: string };
  const [joinRequests, setJoinRequests] = useState<JoinReqItem[]>([]);
  const [joinReqLoading, setJoinReqLoading] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const { session } = useClubAuth(clubId);
  const { name: myUserName, email: myUserEmail, isAuthLoading, getAuthHeaders } = useUserAuth();

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

  // Fetch my join request status for invite_only clubs
  useEffect(() => {
    if (!club || isMember || club.joinMode !== "invite_only") return;
    void (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/clubs/${clubId}/my-join-request`, { headers });
        if (!res.ok) return;
        const data = await res.json() as { status: string } | null;
        if (data) setJoinReqStatus(data.status as "pending" | "accepted" | "declined");
      } catch { /* silent */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.id, isMember]);

  // Fetch admin join requests
  useEffect(() => {
    if (!canAdmin) return;
    setJoinReqLoading(true);
    void (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/clubs/${clubId}/join-requests`, { headers });
        if (!res.ok) return;
        const data = await res.json() as JoinReqItem[];
        setJoinRequests(data);
      } catch { /* silent */ } finally {
        setJoinReqLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAdmin, clubId]);

  const invalidateClub = () => queryClient.invalidateQueries({ queryKey: getGetClubQueryKey(clubId) });

  async function handleDelete() {
    await deleteMutation.mutateAsync({ id: clubId });
    await queryClient.invalidateQueries({ queryKey: getListClubsQueryKey() });
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
      toast({ title: getErrorMessage(err), variant: "destructive" });
    }
  }

  async function handleLeave(memberId: number, name: string) {
    try {
      await leaveMutation.mutateAsync({ clubId, memberId });
      toast({ title: `${name} har forlatt klubben` });
      invalidateClub();
      queryClient.invalidateQueries({ queryKey: getListClubsQueryKey({ scope: "mine" }) });
    } catch (err: unknown) {
      toast({ title: getErrorMessage(err), variant: "destructive" });
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
      toast({ title: getErrorMessage(err), variant: "destructive" });
    }
  }

  async function handleRevoke(invitationId: number) {
    await revokeInviteMutation.mutateAsync({ clubId, invitationId });
    toast({ title: "Invitasjon tilbakekalt" });
    refetchInvitations();
  }

  async function handleSendJoinRequest() {
    setJoinReqSending(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/clubs/${clubId}/join-request`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ message: joinReqMessage.trim() || null }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        if (res.status === 409) setJoinReqStatus("pending");
        throw new Error(data.error ?? "Noe gikk galt");
      }
      setJoinReqStatus("pending");
      setJoinReqOpen(false);
      setJoinReqMessage("");
      toast({
        title: "Forespørsel sendt! ✉️",
        description: "Administratorene vil behandle forespørselen din.",
      });
    } catch (err: unknown) {
      toast({ title: getErrorMessage(err), variant: "destructive" });
    } finally {
      setJoinReqSending(false);
    }
  }

  async function handleReviewJoinRequest(requestId: number, action: "accept" | "decline") {
    setReviewingId(requestId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/clubs/${clubId}/join-requests/${requestId}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Noe gikk galt");
      setJoinRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: action === "accept" ? "accepted" : "declined" } : r
        )
      );
      toast({
        title: action === "accept" ? "Forespørsel godkjent" : "Forespørsel avslått",
        description:
          action === "accept"
            ? "Personen er nå lagt til som medlem."
            : "Forespørselen ble avslått.",
      });
      if (action === "accept") invalidateClub();
    } catch (err: unknown) {
      toast({ title: getErrorMessage(err), variant: "destructive" });
    } finally {
      setReviewingId(null);
    }
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

  /* ── Private club gate ──────────────────────────────────────── */
  if (club.isPrivate && !isMember) {
    const gradient = bannerGradients[club.clubType] ?? "from-primary/60 via-primary/30 to-primary/10";
    return (
      <div className="pb-8">
        <button
          onClick={() => navigate("/clubs")}
          className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground/50 hover:text-foreground/70 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Klubber
        </button>

        <div className={`relative w-full h-56 rounded-2xl bg-gradient-to-br ${gradient} overflow-hidden`}>
          {club.bannerUrl && (
            <img src={club.bannerUrl} alt="" className="w-full h-full object-cover opacity-20 blur-sm scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center">
              <Lock className="w-7 h-7 text-white/50" />
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-sm mx-auto -mt-8 relative z-10"
        >
          <div className="rounded-2xl border border-border/40 bg-card shadow-2xl shadow-black/40 overflow-hidden">
            <div className="px-8 py-8 text-center space-y-5">
              <div className="flex flex-col items-center gap-3">
                {club.logoUrl ? (
                  <img src={club.logoUrl} alt={club.name} className="w-14 h-14 rounded-2xl border-2 border-border/40 object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-center">
                    <TypeIcon type={club.clubType} />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-foreground">{club.name}</h2>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", typePillColor[club.clubType])}>
                      {typeLabel[club.clubType]}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide bg-muted/60 text-muted-foreground border border-border/40">
                      <Lock className="w-2 h-2 inline mr-1" />Privat
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[13px] text-muted-foreground/55 leading-relaxed">
                Denne klubben er privat. Du trenger en invitasjon fra en administrator for å få tilgang.
              </p>

              <div className="flex items-center justify-center gap-4 text-[12px] text-muted-foreground/45 py-4 border-y border-border/30">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {club.memberCount} {club.memberCount === 1 ? "medlem" : "medlemmer"}
                </span>
                {club.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {club.location}
                  </span>
                )}
              </div>

              <button
                onClick={() => { setJoinReqMessage(""); setJoinReqOpen(true); }}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-[12px] font-black uppercase tracking-wider shadow-lg shadow-primary/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Be om medlemskap
              </button>
              <button
                onClick={() => navigate("/clubs")}
                className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl border border-border/50 hover:border-border hover:bg-muted/20 transition-all text-[12px] font-bold uppercase tracking-wide text-foreground/60"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Tilbake til klubber
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── Derived data ─────────────────────────────────────────────── */
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
  const accessible = isMember;

  /* ── Main render ─────────────────────────────────────────────── */
  return (
    <div className="pb-10">

      {/* ── Top bar: back + admin controls ── */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate("/clubs")}
          className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-muted-foreground/50 hover:text-foreground/70 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Klubber
        </button>

        <div className="flex items-center gap-2">
          {canAdmin && (
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border/50 hover:border-border hover:bg-muted/20 transition-all text-[11px] font-bold uppercase tracking-wide text-foreground/60"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Inviter</span>
            </button>
          )}
          {canAdmin && (
            <Link href={`/clubs/${clubId}/edit`}>
              <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border/50 hover:border-border hover:bg-muted/20 transition-all text-[11px] font-bold uppercase tracking-wide text-foreground/60">
                <Edit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rediger</span>
              </button>
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-9 h-9 rounded-xl border border-border/50 hover:border-border hover:bg-muted/20 flex items-center justify-center transition-all text-foreground/60">
                <MoreHorizontal className="w-4 h-4" />
              </button>
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
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                      <UserMinus className="w-4 h-4 mr-2" /> Forlat klubb
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Forlat {club.name}?</AlertDialogTitle>
                      <AlertDialogDescription>Du vil miste tilgang og må inviteres igjen for å bli med på nytt.</AlertDialogDescription>
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
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
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
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

      {/* ── Hero banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full rounded-2xl overflow-hidden mb-0"
        style={{ height: "280px" }}
      >
        {club.bannerUrl ? (
          <img src={club.bannerUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient}`} />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

        {/* Bottom: logo + name + badges */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-end gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              {club.logoUrl ? (
                <img
                  src={club.logoUrl}
                  alt={club.name}
                  className="w-20 h-20 rounded-2xl border-4 border-white/15 object-cover bg-black/40 shadow-2xl"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl border-4 border-white/15 bg-black/40 backdrop-blur-sm flex items-center justify-center shadow-2xl text-white/50">
                  <TypeIcon type={club.clubType} size="lg" />
                </div>
              )}
            </motion.div>

            <div className="min-w-0 flex-1 pb-1">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight uppercase truncate drop-shadow-lg">
                {club.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide backdrop-blur-sm", typePillColor[club.clubType])}>
                  {typeLabel[club.clubType] ?? club.clubType}
                </span>
                {club.isPrivate ? (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide bg-black/50 backdrop-blur-sm text-white/70 border border-white/10">
                    <Lock className="w-2 h-2 inline mr-1" />Privat
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide bg-black/50 backdrop-blur-sm text-white/70 border border-white/10">
                    <Globe className="w-2 h-2 inline mr-1" />Offentlig
                  </span>
                )}
                {myRole && (
                  <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide flex items-center gap-1 backdrop-blur-sm", rolePillColor[myRole])}>
                    <RoleIcon role={myRole} />
                    {roleLabel[myRole] ?? myRole}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Info strip ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 border-b border-border/30 mb-5"
      >
        <div className="flex items-center gap-5 text-[13px] text-muted-foreground/55 flex-wrap">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <strong className="text-foreground/80 font-bold">{club.memberCount.toLocaleString("nb-NO")}</strong>
            {" "}{club.memberCount === 1 ? "medlem" : "medlemmer"}
          </span>
          {club.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {club.location}
            </span>
          )}
        </div>

        {/* Join for non-members */}
        {!isMember && !club.isPrivate && (
          club.joinMode === "invite_only" ? (
            joinReqStatus === "pending" ? (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground/50 font-bold uppercase tracking-wide">
                <Clock className="w-3.5 h-3.5" />
                Forespørsel sendt
              </div>
            ) : joinReqStatus === "declined" ? (
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground/50 font-bold uppercase tracking-wide">
                <XCircle className="w-3.5 h-3.5 text-destructive/60" />
                Forespørsel avslått
              </div>
            ) : (
              <button
                onClick={() => { setJoinReqMessage(""); setJoinReqOpen(true); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-[12px] font-black uppercase tracking-wider shadow-lg shadow-primary/20 shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Be om medlemskap
              </button>
            )
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  disabled={joinMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-[12px] font-black uppercase tracking-wider shadow-lg shadow-primary/20 disabled:opacity-50 shrink-0"
                >
                  {joinMutation.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <UserPlus className="w-3.5 h-3.5" />}
                  Bli med i klubben
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bli med i {club.name}?</AlertDialogTitle>
                  <AlertDialogDescription>Du blir registrert som medlem og kan forlate klubben igjen når som helst.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={handleJoin}>Bli med</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )
        )}
      </motion.div>

      {/* ── Sub-page navigation ── */}
      {accessible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="mb-5"
        >
          <ClubNav clubId={clubId} accessible={accessible} />
        </motion.div>
      )}

      {/* ── Description ── */}
      {club.description && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="mb-6 px-5 py-4 rounded-2xl border border-border/30 bg-card/30"
        >
          <p className="text-[13.5px] text-muted-foreground/65 leading-relaxed">{club.description}</p>
        </motion.div>
      )}

      {/* ── Tabs: Members | Invitations ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.4 }}
      >
        <Tabs defaultValue="members">
          <TabsList className="mb-6 h-10 bg-muted/30 rounded-xl border border-border/30">
            <TabsTrigger value="members" className="gap-2 rounded-lg text-[12px] font-bold uppercase tracking-wide">
              <Users className="w-3.5 h-3.5" />
              Medlemmer
              <span className="text-[10px] font-bold opacity-50 tabular-nums">{sortedMembers.length}</span>
            </TabsTrigger>
            {canAdmin && (
              <TabsTrigger value="invitations" className="gap-2 rounded-lg text-[12px] font-bold uppercase tracking-wide">
                <Mail className="w-3.5 h-3.5" />
                Invitasjoner
                {activeInvitations.length > 0 && (
                  <span className="text-[10px] font-bold bg-amber-500/25 text-amber-300 rounded-full px-1.5 py-0.5 leading-none">
                    {activeInvitations.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            {canAdmin && (
              <TabsTrigger value="join-requests" className="gap-2 rounded-lg text-[12px] font-bold uppercase tracking-wide">
                <UserCheck className="w-3.5 h-3.5" />
                Forespørsler
                {joinRequests.filter((r) => r.status === "pending").length > 0 && (
                  <span className="text-[10px] font-bold bg-primary/25 text-primary rounded-full px-1.5 py-0.5 leading-none">
                    {joinRequests.filter((r) => r.status === "pending").length}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ═══ Members tab ═══ */}
          <TabsContent value="members" className="space-y-4">
            {/* Search + invite row */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/35 pointer-events-none" />
                <Input
                  placeholder="Søk etter navn..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-10 h-10 rounded-xl border-border/40 bg-card text-[13px] focus:border-primary/30 placeholder:text-muted-foreground/30"
                />
              </div>
              {canAdmin && (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border/50 hover:border-border hover:bg-muted/20 transition-all text-[11px] font-bold uppercase tracking-wide text-foreground/60 shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Inviter</span>
                </button>
              )}
            </div>

            {/* Members list */}
            {filteredMembers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/40 py-14 text-center">
                <div className="w-12 h-12 bg-muted/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-muted-foreground/30" />
                </div>
                <p className="text-[13px] text-muted-foreground/50">
                  {memberSearch ? `Ingen treff for «${memberSearch}»` : "Ingen medlemmer ennå."}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                <ul className="divide-y divide-border/25">
                  {filteredMembers.map((member, i) => {
                    const avatarColor = getAvatarColor(member.memberName);
                    const isMe = myMemberName && member.memberName === myMemberName;
                    const canManage = canAdmin && !isMe && member.role !== "owner";
                    const myRank = ROLE_RANK[myRole ?? ""] ?? 0;
                    const memberRank = ROLE_RANK[member.role] ?? 0;
                    const canPromote = canManage && myRank > memberRank;

                    return (
                      <motion.li
                        key={member.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.3 }}
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/10 transition-colors group"
                      >
                        {/* Avatar + info */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0", avatarColor)}>
                            {member.memberName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13.5px] font-semibold leading-tight truncate">
                                {member.memberName}
                              </span>
                              {isMe && (
                                <span className="text-[10px] text-muted-foreground/40 font-medium">(deg)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", rolePillColor[member.role])}>
                                <RoleIcon role={member.role} />
                                {roleLabel[member.role] ?? member.role}
                              </span>
                              {member.joinedAt && (
                                <span className="text-[10px] text-muted-foreground/35 hidden sm:inline">
                                  ble med {formatDate(member.joinedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions (hover reveal) */}
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isMe && member.role !== "owner" && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/40 hover:text-destructive transition-colors px-2 py-1">
                                  Forlat
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Forlat {club.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>Du vil miste tilgang og må inviteres igjen for å bli med på nytt.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleLeave(member.id, member.memberName)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Forlat klubb
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {canManage && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="w-8 h-8 rounded-lg hover:bg-muted/40 flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-all">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {canPromote && (
                                  <>
                                    <DropdownMenuItem onClick={() => {
                                      setEditRoleMember({ id: member.id, name: member.memberName, role: member.role });
                                      setNewRole(member.role);
                                    }}>
                                      <Shield className="w-3.5 h-3.5 mr-2" />
                                      Endre rolle
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                      <UserMinus className="w-3.5 h-3.5 mr-2" />
                                      Fjern fra klubb
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Fjern {member.memberName}?</AlertDialogTitle>
                                      <AlertDialogDescription>{member.memberName} mister tilgang til klubben.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleLeave(member.id, member.memberName)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Fjern
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>
            )}
          </TabsContent>

          {/* ═══ Invitations tab (admin+) ═══ */}
          {canAdmin && (
            <TabsContent value="invitations" className="space-y-5">
              {/* Create invite form */}
              <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
                    <UserPlus className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-[12px] font-black uppercase tracking-wide text-foreground/70">Inviter nytt medlem</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground/60">Ditt navn *</Label>
                    <Input
                      placeholder="Ola Nordmann"
                      value={inviteCreatedBy}
                      onChange={(e) => setInviteCreatedBy(e.target.value)}
                      className="h-10 rounded-xl border-border/40 bg-muted/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground/60">E-post (valgfritt)</Label>
                    <Input
                      placeholder="invitert@eksempel.no"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="h-10 rounded-xl border-border/40 bg-muted/20"
                    />
                  </div>
                </div>

                {createdInviteUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-[12.5px] text-emerald-300 font-semibold">Invitasjon opprettet — gyldig i 7 dager</span>
                    </div>
                    <div className="flex gap-2">
                      <Input value={createdInviteUrl} readOnly className="font-mono text-xs h-10 rounded-xl border-border/40 bg-muted/20" />
                      <button
                        onClick={() => copyToClipboard(createdInviteUrl, "new")}
                        className="w-10 h-10 rounded-xl border border-border/50 hover:border-border hover:bg-muted/30 flex items-center justify-center shrink-0 transition-all"
                      >
                        {copiedCode === "new" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground/60" />}
                      </button>
                    </div>
                    <button
                      onClick={() => { setCreatedInviteUrl(null); setInviteEmail(""); }}
                      className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/50 hover:text-foreground/70 transition-colors"
                    >
                      Lag ny invitasjon
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCreateInvite}
                    disabled={createInviteMutation.isPending || !inviteCreatedBy.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-[12px] font-bold uppercase tracking-wide disabled:opacity-50 shadow-md shadow-primary/15"
                  >
                    {createInviteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                    Generer invitasjonslenke
                  </button>
                )}
              </div>

              {/* Active invitations */}
              <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-[12px] font-black uppercase tracking-wide text-foreground/70">Aktive invitasjoner</span>
                  {activeInvitations.length > 0 && (
                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded-full px-2 py-0.5">
                      {activeInvitations.length}
                    </span>
                  )}
                </div>
                {activeInvitations.length === 0 ? (
                  <div className="py-10 text-center text-[12.5px] text-muted-foreground/40">
                    Ingen aktive invitasjoner.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/25">
                    {activeInvitations.map((inv) => {
                      const url = getInviteUrl(inv.code);
                      const copied = copiedCode === inv.code;
                      return (
                        <li key={inv.id} className="px-5 py-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              {inv.email && (
                                <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                                  <Mail className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                                  <span className="truncate">{inv.email}</span>
                                </div>
                              )}
                              <div className="text-[11px] text-muted-foreground/40 flex items-center gap-1.5">
                                <Clock className="w-3 h-3 shrink-0" />
                                Utløper {formatDate(inv.expiresAt)}
                                {" · "}Av <strong className="text-muted-foreground/60 ml-1">{inv.createdBy}</strong>
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                onClick={() => copyToClipboard(url, inv.code)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 hover:border-border hover:bg-muted/20 text-[11px] font-bold uppercase tracking-wide text-foreground/60 transition-all"
                              >
                                {copied ? <><Check className="w-3 h-3 text-emerald-400" /> Kopiert</> : <><Copy className="w-3 h-3" /> Kopier</>}
                              </button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="w-8 h-8 rounded-lg border border-border/40 hover:border-destructive/40 hover:bg-destructive/10 flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-all">
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Trekk tilbake invitasjon?</AlertDialogTitle>
                                    <AlertDialogDescription>Lenken vil slutte å fungere umiddelbart.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleRevoke(inv.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Trekk tilbake
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2.5 bg-muted/25 rounded-xl text-[11px] font-mono text-muted-foreground/40">
                            <Link2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{url}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Invitation history */}
              {pastInvitations.length > 0 && (
                <div className="rounded-2xl border border-border/30 bg-card/30 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border/20">
                    <span className="text-[11px] font-black uppercase tracking-wide text-muted-foreground/40">Historikk</span>
                  </div>
                  <ul className="divide-y divide-border/20">
                    {pastInvitations.map((inv) => {
                      const effectiveStatus =
                        inv.status === "pending" && isExpiredDate(inv.expiresAt) ? "expired" : inv.status;
                      return (
                        <li key={inv.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                          <div className="min-w-0 space-y-0.5">
                            {inv.email && (
                              <div className="text-[12.5px] truncate flex items-center gap-1.5 text-foreground/60">
                                <Mail className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                                {inv.email}
                              </div>
                            )}
                            <div className="text-[11px] text-muted-foreground/35">
                              {inv.usedBy
                                ? <span>Brukt av <strong className="text-muted-foreground/50">{inv.usedBy}</strong></span>
                                : <span>Av <strong className="text-muted-foreground/50">{inv.createdBy}</strong> · {formatDate(inv.createdAt)}</span>
                              }
                            </div>
                          </div>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0", inviteStatusColor[effectiveStatus])}>
                            {inviteStatusLabel[effectiveStatus] ?? effectiveStatus}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </TabsContent>
          )}

          {/* ═══ Join requests tab (admin+) ═══ */}
          {canAdmin && (
            <TabsContent value="join-requests" className="space-y-4">
              {joinReqLoading ? (
                <div className="rounded-2xl border border-border/40 bg-card py-14 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
                </div>
              ) : joinRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/40 py-14 text-center">
                  <div className="w-12 h-12 bg-muted/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <UserCheck className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                  <p className="text-[13px] text-muted-foreground/50">Ingen innmeldingsforespørsler ennå.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                  <ul className="divide-y divide-border/25">
                    {joinRequests.map((req) => {
                      const avatarColor = getAvatarColor(req.memberName);
                      const isPending = req.status === "pending";
                      return (
                        <motion.li
                          key={req.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="px-5 py-4 flex items-start justify-between gap-4"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5", avatarColor)}>
                              {req.memberName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13.5px] font-semibold leading-tight">{req.memberName}</p>
                              {req.message && (
                                <p className="text-[12px] text-muted-foreground/55 mt-1 leading-relaxed line-clamp-3">
                                  {req.message}
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground/35 mt-1.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(req.createdAt)}
                                {" · "}
                                <span className={cn(
                                  "font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full",
                                  req.status === "pending"  ? "bg-amber-500/15 text-amber-300" :
                                  req.status === "accepted" ? "bg-emerald-500/15 text-emerald-300" :
                                  "bg-muted/60 text-muted-foreground"
                                )}>
                                  {req.status === "pending" ? "Venter" : req.status === "accepted" ? "Godkjent" : "Avslått"}
                                </span>
                              </p>
                            </div>
                          </div>
                          {isPending && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => void handleReviewJoinRequest(req.id, "decline")}
                                disabled={reviewingId === req.id}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border/50 hover:border-destructive/50 hover:bg-destructive/10 text-[11px] font-bold uppercase tracking-wide text-muted-foreground/60 hover:text-destructive transition-all disabled:opacity-50"
                              >
                                {reviewingId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                                Avslå
                              </button>
                              <button
                                onClick={() => void handleReviewJoinRequest(req.id, "accept")}
                                disabled={reviewingId === req.id}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-bold uppercase tracking-wide transition-all disabled:opacity-50 shadow-sm shadow-primary/15"
                              >
                                {reviewingId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Godkjenn
                              </button>
                            </div>
                          )}
                        </motion.li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </motion.div>

      {/* ── Edit role dialog ── */}
      <Dialog open={!!editRoleMember} onOpenChange={(o) => !o && setEditRoleMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Endre rolle for {editRoleMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <div className="space-y-1.5">
              <Label>Nåværende rolle</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-xl text-sm text-muted-foreground">
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
                    <div className="flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-blue-400" /> Administrator</div>
                  </SelectItem>
                  <SelectItem value="moderator">
                    <div className="flex items-center gap-2"><UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Moderator</div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-muted-foreground" /> Medlem</div>
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

      {/* ── Send join request dialog ── */}
      <Dialog open={joinReqOpen} onOpenChange={(o) => !o && setJoinReqOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Be om medlemskap i {club.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-[13px] text-muted-foreground/60 leading-relaxed">
              Send en forespørsel til klubbens administratorer. De vil godkjenne eller avslå søknaden din.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wide">
                Melding (valgfritt)
              </Label>
              <textarea
                placeholder="Fortell litt om deg selv eller din interesse for klubben..."
                value={joinReqMessage}
                onChange={(e) => setJoinReqMessage(e.target.value)}
                maxLength={300}
                rows={3}
                className="w-full resize-none rounded-xl border border-border/50 bg-muted/20 px-3.5 py-2.5 text-[13px] placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10"
              />
              <p className="text-[10px] text-muted-foreground/30 text-right">{joinReqMessage.length}/300</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Avbryt</Button>
            </DialogClose>
            <Button onClick={() => void handleSendJoinRequest()} disabled={joinReqSending}>
              {joinReqSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send forespørsel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create invitation dialog ── */}
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
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-post til inviterte (valgfritt)</Label>
              <Input
                placeholder="venn@eksempel.no"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground/50">La stå tom for å generere en lenke du kan dele selv.</p>
            </div>
            {createdInviteUrl && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[12.5px] text-emerald-300 font-semibold">Invitasjon opprettet!</span>
                </div>
                <div className="space-y-1.5">
                  <Label>Invitasjonslenke (gyldig 7 dager)</Label>
                  <div className="flex gap-2">
                    <Input value={createdInviteUrl} readOnly className="font-mono text-xs rounded-xl" />
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(createdInviteUrl, "modal")} className="shrink-0 rounded-xl">
                      {copiedCode === "modal" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
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
                <DialogClose asChild><Button variant="outline">Avbryt</Button></DialogClose>
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
