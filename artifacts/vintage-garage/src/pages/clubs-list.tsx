import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListClubs,
  useJoinClub,
  getListClubsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Users, MapPin, Car, Bike, Lock, Search, Globe,
  Crown, UserPlus, Loader2, ArrowRight, Shield, User,
  Compass, X, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Static maps ──────────────────────────────────────────────── */

const bannerGradients: Record<string, string> = {
  car:        "from-blue-950 via-blue-900/70 to-blue-800/30",
  motorcycle: "from-amber-950 via-amber-900/70 to-amber-800/30",
  both:       "from-emerald-950 via-emerald-900/70 to-emerald-800/30",
};

const typePillColor: Record<string, string> = {
  car:        "bg-blue-500/20 text-blue-300 border border-blue-500/20",
  motorcycle: "bg-amber-500/20 text-amber-300 border border-amber-500/20",
  both:       "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20",
};

const typeLabel: Record<string, string> = {
  car:        "Bil",
  motorcycle: "Motorsykkel",
  both:       "Bil & MC",
};

const TypeIcon = ({ type, size = "default" }: { type: string; size?: "sm" | "default" | "lg" }) => {
  const cls = size === "lg" ? "w-7 h-7" : size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  if (type === "car") return <Car className={cls} />;
  if (type === "motorcycle") return <Bike className={cls} />;
  return (
    <span className="flex gap-0.5">
      <Car className={cls} />
      <Bike className={cls} />
    </span>
  );
};

/* ─── Data type ─────────────────────────────────────────────────── */

interface ClubLike {
  id: number;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  location?: string | null;
  clubType: string;
  memberCount: number;
  isPrivate: boolean;
  ownerName?: string;
  joinMode?: string;
}

/* ─── Role badge ────────────────────────────────────────────────── */

function RolePill({ role }: { role: "owner" | "admin" | "member" | null }) {
  if (role === "owner")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/20">
        <Crown className="w-2.5 h-2.5" /> Eier
      </span>
    );
  if (role === "admin")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
        <Shield className="w-2.5 h-2.5" /> Admin
      </span>
    );
  if (role === "member")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
        <User className="w-2.5 h-2.5" /> Medlem
      </span>
    );
  return null;
}

/* ─── Skeleton ──────────────────────────────────────────────────── */

function ClubCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden flex flex-col animate-pulse">
      <div className="h-44 bg-muted/60 light:bg-muted" />
      <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
        <div className="flex items-center gap-3 -mt-9">
          <div className="w-14 h-14 rounded-2xl bg-muted border-4 border-card shrink-0" />
          <div className="flex gap-1.5 mt-5">
            <div className="h-5 w-14 bg-muted rounded-full" />
          </div>
        </div>
        <div className="h-4 bg-muted rounded w-3/5" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-4/5" />
        <div className="h-9 bg-muted rounded-xl mt-1" />
      </div>
    </div>
  );
}

/* ─── Club card ─────────────────────────────────────────────────── */

interface ClubCardProps {
  club: ClubLike;
  membershipRole?: "owner" | "admin" | "member" | null;
  action?: React.ReactNode;
  index?: number;
}

function ClubCard({ club, membershipRole, action, index = 0 }: ClubCardProps) {
  const gradient = bannerGradients[club.clubType] ?? "from-primary/60 via-primary/40 to-primary/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <Link href={`/clubs/${club.id}`}>
        <div className="group rounded-2xl border border-border/40 bg-card overflow-hidden flex flex-col cursor-pointer hover:border-border/70 hover:shadow-xl hover:shadow-black/20 transition-all duration-300">
          {/* Banner */}
          <div className="relative h-44 shrink-0 overflow-hidden">
            {club.bannerUrl ? (
              <img
                src={club.bannerUrl}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                <div className="text-white/[0.07]">
                  <TypeIcon type={club.clubType} size="lg" />
                </div>
              </div>
            )}

            {/* Privacy pill — top right */}
            <div className="absolute top-3 right-3">
              {club.isPrivate ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-black/60 backdrop-blur-md text-white/80 rounded-full px-2.5 py-1 border border-white/10">
                  <Lock className="w-2.5 h-2.5" /> Privat
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-semibold bg-black/60 backdrop-blur-md text-white/80 rounded-full px-2.5 py-1 border border-white/10">
                  <Globe className="w-2.5 h-2.5" /> Offentlig
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-5 pt-4 pb-5 flex flex-col flex-1">
            {/* Logo + badges row — overlaps banner */}
            <div className="flex items-end gap-3 -mt-11 mb-3.5 relative z-10">
              {club.logoUrl ? (
                <img
                  src={club.logoUrl}
                  alt={club.name}
                  className="w-14 h-14 rounded-2xl border-4 border-card object-cover shrink-0 bg-muted shadow-md"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl border-4 border-card bg-muted/80 flex items-center justify-center shrink-0 shadow-md">
                  <TypeIcon type={club.clubType} size="sm" />
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 pb-1">
                <span className={cn("inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full", typePillColor[club.clubType])}>
                  {typeLabel[club.clubType] ?? club.clubType}
                </span>
                <RolePill role={membershipRole ?? null} />
              </div>
            </div>

            {/* Name */}
            <h3 className="font-bold text-[15px] leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors duration-200">
              {club.name}
            </h3>

            {/* Description */}
            {club.description && (
              <p className="text-[12.5px] text-muted-foreground/60 line-clamp-2 leading-relaxed mb-3.5">
                {club.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-3 text-[12px] text-muted-foreground/50 mt-auto mb-4">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {club.memberCount.toLocaleString("nb-NO")}{" "}
                {club.memberCount === 1 ? "medlem" : "medlemmer"}
              </span>
              {club.location && (
                <span className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{club.location}</span>
                </span>
              )}
            </div>

            {/* Action */}
            {action}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Type filter pill ──────────────────────────────────────────── */

const TYPE_FILTERS = [
  { value: "all",        label: "Alle" },
  { value: "car",        label: "Bil" },
  { value: "motorcycle", label: "Motorsykkel" },
  { value: "both",       label: "Begge" },
];

/* ─── Action button helpers ─────────────────────────────────────── */

function ActionBtn({
  children,
  variant = "primary",
  onClick,
  disabled,
  href,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "locked";
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  href?: string;
}) {
  const base =
    "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[12px] font-bold uppercase tracking-wide transition-all duration-200 select-none";
  const styles = {
    primary:   "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.98]",
    secondary: "bg-muted/60 text-foreground/80 border border-border/50 hover:bg-muted hover:border-border",
    ghost:     "text-muted-foreground hover:text-foreground hover:bg-muted/40",
    locked:    "bg-muted/30 text-muted-foreground/50 border border-border/30 cursor-default",
  };

  const cls = cn(base, styles[variant], disabled && "opacity-50 pointer-events-none");

  if (href) {
    return (
      <Link href={href} onClick={(e) => e.stopPropagation()}>
        <button className={cls}>{children}</button>
      </Link>
    );
  }
  return (
    <button className={cls} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */

export default function ClubsList() {
  const { isSignedIn } = useAuth();
  const { name: myName, email: myEmail, getAuthHeaders } = useUserAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<number>>(new Set());
  const [requestDialogClub, setRequestDialogClub] = useState<ClubLike | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  /* ── Data fetching ── */
  const { data: myClubs, isLoading: myLoading } = useListClubs(
    { scope: "mine" },
    {
      query: {
        queryKey: getListClubsQueryKey({ scope: "mine" }),
        enabled: !!isSignedIn,
      },
    }
  );

  const discoverParams =
    typeFilter === "all"
      ? { scope: "discover" }
      : { scope: "discover", type: typeFilter };

  const {
    data: publicClubs,
    isLoading: publicLoading,
    isError,
    refetch,
  } = useListClubs(discoverParams, {
    query: { queryKey: getListClubsQueryKey(discoverParams) },
  });

  const joinMutation = useJoinClub();
  const myClubIds = new Set((myClubs ?? []).map((c) => c.id));

  function myRoleFor(club: ClubLike): "owner" | "admin" | "member" {
    const candidates = [myName, myEmail]
      .filter((c): c is string => !!c)
      .map((c) => c.toLowerCase());
    if (club.ownerName && candidates.includes(club.ownerName.toLowerCase()))
      return "owner";
    return "member";
  }

  async function handleJoin(club: ClubLike) {
    setJoiningId(club.id);
    try {
      await joinMutation.mutateAsync({
        clubId: club.id,
        data: { memberName: myName ?? myEmail ?? "Gjest" },
      });
      toast({
        title: "Du er nå medlem! 🎉",
        description: `Velkommen til ${club.name}!`,
      });
      queryClient.invalidateQueries({
        queryKey: getListClubsQueryKey({ scope: "mine" }),
      });
      navigate(`/clubs/${club.id}`);
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error;
      toast({
        title: msg ?? "Kunne ikke bli med i klubben",
        variant: "destructive",
      });
    } finally {
      setJoiningId(null);
    }
  }

  async function handleSendRequest(club: ClubLike) {
    setSendingRequest(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/clubs/${club.id}/join-request`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ message: requestMessage.trim() || null }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        const msg = data.error ?? "Noe gikk galt";
        if (res.status === 409) setRequestedIds((p) => new Set([...p, club.id]));
        throw new Error(msg);
      }
      setRequestedIds((p) => new Set([...p, club.id]));
      setRequestDialogClub(null);
      setRequestMessage("");
      toast({
        title: "Forespørsel sendt! ✉️",
        description: `Administratorene for ${club.name} vil behandle forespørselen din.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Noe gikk galt";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSendingRequest(false);
    }
  }

  const filteredPublic = (publicClubs ?? []).filter(
    (c) =>
      !myClubIds.has(c.id) &&
      (!search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.location ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const hasActiveFilter = typeFilter !== "all" || !!search;

  /* ── Render ── */
  return (
    <div className="space-y-12 pb-12">

      {/* ════════════════════════════
          PAGE HEADER
      ════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-5"
      >
        <div>
          <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-2">
            Fellesskap
          </p>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tight leading-none">
            Klubber
          </h1>
          <p className="text-[13px] text-muted-foreground/55 mt-2">
            Finn og bli med i veteranklubber for biler og motorsykler.
          </p>
        </div>
        <Link href="/clubs/new">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-[12px] font-black uppercase tracking-wider shadow-lg shadow-primary/15 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Opprett klubb
          </motion.button>
        </Link>
      </motion.div>

      {/* ════════════════════════════
          MY CLUBS
      ════════════════════════════ */}
      {isSignedIn && (
        <section className="space-y-5">
          {/* Section header */}
          <div className="flex items-center gap-3">
            <h2 className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-widest">
              Mine klubber
            </h2>
            {!myLoading && myClubs && myClubs.length > 0 && (
              <span className="text-[10px] font-bold bg-primary/10 text-primary rounded-full px-2 py-0.5">
                {myClubs.length}
              </span>
            )}
          </div>

          {/* Loading */}
          {myLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <ClubCardSkeleton />
              <ClubCardSkeleton />
              <ClubCardSkeleton />
            </div>
          ) : !myClubs || myClubs.length === 0 ? (
            /* Empty — no clubs */
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-dashed border-border/50 bg-card/30 px-8 py-12 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-center mx-auto mb-5">
                <Users className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <p className="text-[14px] font-bold text-foreground/60 mb-1.5">
                Du er ikke med i noen klubber ennå
              </p>
              <p className="text-[12.5px] text-muted-foreground/45 max-w-xs mx-auto mb-7 leading-relaxed">
                Utforsk offentlige klubber nedenfor, eller opprett din første og inviter andre entusiaster.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/clubs/new">
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-[12px] font-bold uppercase tracking-wide shadow-md shadow-primary/15">
                    <Plus className="w-3.5 h-3.5" />
                    Opprett en klubb
                  </button>
                </Link>
                <button
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/50 hover:border-border bg-transparent hover:bg-muted/20 transition-colors text-[12px] font-bold uppercase tracking-wide text-foreground/60"
                  onClick={() => document.getElementById("discover-section")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <Compass className="w-3.5 h-3.5" />
                  Utforsk klubber
                </button>
              </div>
            </motion.div>
          ) : (
            /* Club cards */
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {myClubs.map((club, i) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  membershipRole={myRoleFor(club)}
                  index={i}
                  action={
                    <ActionBtn
                      variant="secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/clubs/${club.id}`);
                      }}
                    >
                      Åpne klubb
                      <ArrowRight className="w-3.5 h-3.5" />
                    </ActionBtn>
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Separator */}
      {isSignedIn && <div className="border-t border-border/30" />}

      {/* ════════════════════════════
          DISCOVER CLUBS
      ════════════════════════════ */}
      <section id="discover-section" className="space-y-6">
        {/* Section header */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-[11px] font-black text-muted-foreground/50 uppercase tracking-widest">
              Utforsk klubber
            </h2>
            <p className="text-[11px] text-muted-foreground/35 mt-0.5">
              Offentlige klubber er åpne for alle
            </p>
          </div>
        </div>

        {/* Search + filters */}
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
            <Input
              placeholder="Søk etter klubbnavn, sted eller beskrivelse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 pr-10 h-12 rounded-xl border-border/50 bg-card text-[13px] focus:border-primary/40 focus:ring-primary/10 placeholder:text-muted-foreground/30"
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md bg-muted/60 hover:bg-muted flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-wide border transition-all duration-200",
                  typeFilter === f.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20"
                    : "border-border/50 text-muted-foreground/60 hover:border-border hover:text-foreground bg-transparent"
                )}
              >
                {f.label}
              </button>
            ))}
            {hasActiveFilter && (
              <button
                onClick={() => { setSearch(""); setTypeFilter("all"); }}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                Nullstill
              </button>
            )}
          </div>
        </div>

        {/* Result count */}
        {!publicLoading && !isError && hasActiveFilter && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] text-muted-foreground/40 font-medium"
          >
            {filteredPublic.length === 0
              ? "Ingen treff"
              : `${filteredPublic.length} ${filteredPublic.length === 1 ? "klubb" : "klubber"} funnet`}
          </motion.p>
        )}

        {/* Cards / states */}
        {publicLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ClubCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-border/40 bg-card py-16 text-center">
            <div className="w-12 h-12 bg-muted/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-[13px] text-muted-foreground/60 mb-5">
              Kunne ikke laste klubber
            </p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2 rounded-xl border border-border/50 text-[12px] font-bold uppercase tracking-wide text-foreground/60 hover:border-border hover:bg-muted/20 transition-all"
            >
              Prøv igjen
            </button>
          </div>
        ) : filteredPublic.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-dashed border-border/40 bg-card/20 py-16 text-center"
          >
            <div className="w-12 h-12 bg-muted/60 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {search ? (
                <Search className="w-5 h-5 text-muted-foreground/40" />
              ) : (
                <Compass className="w-5 h-5 text-muted-foreground/40" />
              )}
            </div>
            <p className="text-[14px] font-bold text-foreground/50 mb-1.5">
              {search ? `Ingen treff for «${search}»` : "Ingen offentlige klubber ennå"}
            </p>
            <p className="text-[12px] text-muted-foreground/40 max-w-xs mx-auto mb-7 leading-relaxed">
              {search
                ? "Prøv et annet søkeord, eller endre filteret."
                : "Bli den første til å opprette en klub for entusiaster."}
            </p>
            <div className="flex gap-3 justify-center">
              {search && (
                <button
                  onClick={() => { setSearch(""); setTypeFilter("all"); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 text-[12px] font-bold uppercase tracking-wide text-muted-foreground/60 hover:border-border hover:bg-muted/20 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  Fjern filter
                </button>
              )}
              <Link href="/clubs/new">
                <button className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-[12px] font-bold uppercase tracking-wide shadow-md shadow-primary/15">
                  <Plus className="w-3.5 h-3.5" />
                  Opprett klubb
                </button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPublic.map((club, i) => (
              <ClubCard
                key={club.id}
                club={club}
                membershipRole={null}
                index={i}
                action={
                  club.joinMode === "invite_only" ? (
                    requestedIds.has(club.id) ? (
                      <div
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/30 bg-muted/20 text-[12px] font-bold uppercase tracking-wide text-muted-foreground/40"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Forespørsel sendt
                      </div>
                    ) : isSignedIn ? (
                      <ActionBtn
                        variant="secondary"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setRequestMessage("");
                          setRequestDialogClub(club);
                        }}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Be om medlemskap
                      </ActionBtn>
                    ) : (
                      <ActionBtn
                        variant="secondary"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate("/sign-in"); }}
                      >
                        Logg inn for å søke om medlemskap
                        <ArrowRight className="w-3.5 h-3.5" />
                      </ActionBtn>
                    )
                  ) : isSignedIn ? (
                    <ActionBtn
                      variant="primary"
                      disabled={joiningId === club.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void handleJoin(club);
                      }}
                    >
                      {joiningId === club.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      Bli med
                    </ActionBtn>
                  ) : (
                    <ActionBtn
                      variant="secondary"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate("/sign-in"); }}
                    >
                      Logg inn for å bli med
                      <ArrowRight className="w-3.5 h-3.5" />
                    </ActionBtn>
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Join request dialog ── */}
      <Dialog open={!!requestDialogClub} onOpenChange={(o) => !o && setRequestDialogClub(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Be om medlemskap i {requestDialogClub?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-[13px] text-muted-foreground/60 leading-relaxed">
              Send en forespørsel til klubbens administratorer. De vil godkjenne eller avslå søknaden din.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wide">
                Melding (valgfritt)
              </label>
              <textarea
                placeholder="Fortell litt om deg selv eller din interesse for klubben..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                maxLength={300}
                rows={3}
                className="w-full resize-none rounded-xl border border-border/50 bg-muted/20 px-3.5 py-2.5 text-[13px] placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10"
              />
              <p className="text-[10px] text-muted-foreground/30 text-right">{requestMessage.length}/300</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Avbryt</Button>
            </DialogClose>
            <Button
              onClick={() => requestDialogClub && void handleSendRequest(requestDialogClub)}
              disabled={sendingRequest}
            >
              {sendingRequest && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send forespørsel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
