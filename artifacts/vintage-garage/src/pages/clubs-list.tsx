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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, Users, MapPin, Car, Bike, Lock, Search, Globe,
  Crown, UserPlus, Loader2, ArrowRight, Shield, User,
  ChevronRight, Compass,
} from "lucide-react";

const bannerGradients: Record<string, string> = {
  car: "from-blue-950 via-blue-900/60 to-blue-800/20",
  motorcycle: "from-amber-950 via-amber-900/60 to-amber-800/20",
  both: "from-emerald-950 via-emerald-900/60 to-emerald-800/20",
};

const typeColor: Record<string, string> = {
  car: "bg-blue-500/20 text-blue-300",
  motorcycle: "bg-amber-500/20 text-amber-300",
  both: "bg-emerald-500/20 text-emerald-300",
};

const typeLabel: Record<string, string> = {
  car: "Bil",
  motorcycle: "Motorsykkel",
  both: "Bil & MC",
};

const TypeIcon = ({ type, size = "default" }: { type: string; size?: "sm" | "default" | "lg" }) => {
  const cls = size === "lg" ? "w-8 h-8" : size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  if (type === "car") return <Car className={cls} />;
  if (type === "motorcycle") return <Bike className={cls} />;
  return (
    <span className="flex gap-0.5">
      <Car className={cls} />
      <Bike className={cls} />
    </span>
  );
};

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

function MembershipRoleBadge({ role }: { role: "owner" | "admin" | "member" | null }) {
  if (role === "owner") return (
    <Badge className="text-xs bg-yellow-500/15 text-yellow-300 border-yellow-500/25 gap-1">
      <Crown className="w-2.5 h-2.5" /> Eier
    </Badge>
  );
  if (role === "admin") return (
    <Badge className="text-xs bg-blue-500/15 text-blue-300 border-blue-500/25 gap-1">
      <Shield className="w-2.5 h-2.5" /> Admin
    </Badge>
  );
  if (role === "member") return (
    <Badge className="text-xs bg-emerald-500/15 text-emerald-300 border-emerald-500/25 gap-1">
      <User className="w-2.5 h-2.5" /> Medlem
    </Badge>
  );
  return null;
}

function ClubCardSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <div className="h-32 bg-muted animate-pulse" />
      <CardContent className="pt-0 px-4 pb-4 flex flex-col flex-1">
        <div className="flex items-end gap-3 -mt-5 mb-3">
          <div className="w-10 h-10 rounded-xl bg-muted border-2 border-background animate-pulse shrink-0" />
          <div className="flex-1 pb-0.5 space-y-1.5">
            <div className="h-3 bg-muted rounded animate-pulse w-16" />
          </div>
        </div>
        <div className="h-4 bg-muted rounded animate-pulse w-3/4 mb-2" />
        <div className="h-3 bg-muted rounded animate-pulse w-full mb-1.5" />
        <div className="h-3 bg-muted rounded animate-pulse w-4/5 mb-4" />
        <div className="h-8 bg-muted rounded-lg animate-pulse mt-auto" />
      </CardContent>
    </Card>
  );
}

interface ClubCardProps {
  club: ClubLike;
  membershipRole?: "owner" | "admin" | "member" | null;
  action?: React.ReactNode;
}

function ClubCard({ club, membershipRole, action }: ClubCardProps) {
  const gradient = bannerGradients[club.clubType] ?? "from-primary/60 via-primary/30 to-primary/10";
  return (
    <Link href={`/clubs/${club.id}`}>
      <Card className="group hover-elevate cursor-pointer h-full flex flex-col border-border/60 bg-card">
        {/* Banner */}
        <div className="relative h-32 shrink-0 overflow-hidden rounded-t-lg">
          {club.bannerUrl ? (
            <img
              src={club.bannerUrl}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <div className="text-white/10">
                <TypeIcon type={club.clubType} size="lg" />
              </div>
            </div>
          )}
          {/* Privacy badge */}
          <div className="absolute top-2.5 right-2.5">
            {club.isPrivate ? (
              <span className="flex items-center gap-1 text-[10px] font-medium bg-black/65 backdrop-blur-sm text-white/90 rounded-full px-2 py-0.5 border border-white/10">
                <Lock className="w-2.5 h-2.5" /> Privat
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-medium bg-black/65 backdrop-blur-sm text-white/90 rounded-full px-2 py-0.5 border border-white/10">
                <Globe className="w-2.5 h-2.5" /> Offentlig
              </span>
            )}
          </div>
        </div>

        <CardContent className="flex-1 flex flex-col px-4 pt-0 pb-4">
          {/* Logo + type badge row — floats up into banner */}
          <div className="flex items-end gap-3 -mt-5 mb-3 relative z-10">
            {club.logoUrl ? (
              <img
                src={club.logoUrl}
                alt={club.name}
                className="w-10 h-10 rounded-xl border-2 border-background object-cover shrink-0 bg-muted"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl border-2 border-background bg-muted flex items-center justify-center shrink-0">
                <TypeIcon type={club.clubType} size="sm" />
              </div>
            )}
            <div className="flex flex-wrap gap-1 pb-0.5">
              <Badge className={`text-[10px] px-1.5 py-0 ${typeColor[club.clubType] ?? ""} border-0`}>
                {typeLabel[club.clubType] ?? club.clubType}
              </Badge>
              <MembershipRoleBadge role={membershipRole ?? null} />
            </div>
          </div>

          {/* Name */}
          <h3 className="font-semibold text-[15px] leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
            {club.name}
          </h3>

          {/* Description */}
          {club.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
              {club.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto mb-3">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {club.memberCount.toLocaleString("nb-NO")}{" "}
              {club.memberCount === 1 ? "medlem" : "medlemmer"}
            </span>
            {club.location && (
              <span className="flex items-center gap-1 min-w-0">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{club.location}</span>
              </span>
            )}
          </div>

          {/* Action */}
          {action}
        </CardContent>
      </Card>
    </Link>
  );
}

const TYPE_FILTERS = [
  { value: "all", label: "Alle" },
  { value: "car", label: "Bil" },
  { value: "motorcycle", label: "Motorsykkel" },
  { value: "both", label: "Begge" },
];

export default function ClubsList() {
  const { isSignedIn } = useAuth();
  const { name: myName, email: myEmail } = useUserAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [joiningId, setJoiningId] = useState<number | null>(null);

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

  const filteredPublic = (publicClubs ?? []).filter(
    (c) =>
      !myClubIds.has(c.id) &&
      (!search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.location ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const hasActiveFilter = typeFilter !== "all" || !!search;

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Klubber</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Finn og bli med i veteranklubber for biler og motorsykler.
          </p>
        </div>
        <Link href="/clubs/new">
          <Button className="shrink-0 gap-2">
            <Plus className="w-4 h-4" />
            Opprett klubb
          </Button>
        </Link>
      </div>

      {/* Mine klubber */}
      {isSignedIn && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Mine klubber</h2>
              {!myLoading && myClubs && myClubs.length > 0 && (
                <span className="text-xs bg-primary/15 text-primary rounded-full px-2 py-0.5 font-medium">
                  {myClubs.length}
                </span>
              )}
            </div>
          </div>

          {myLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ClubCardSkeleton />
              <ClubCardSkeleton />
              <ClubCardSkeleton />
            </div>
          ) : !myClubs || myClubs.length === 0 ? (
            <div className="border border-dashed border-border/60 rounded-xl py-12 text-center bg-muted/20">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Du er ikke med i noen klubber ennå.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1.5 max-w-xs mx-auto">
                Utforsk offentlige klubber nedenfor, eller opprett din egen.
              </p>
              <Link href="/clubs/new">
                <Button variant="outline" size="sm" className="mt-5 gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  Opprett din første klubb
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myClubs.map((club) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  membershipRole={myRoleFor(club)}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/clubs/${club.id}`);
                      }}
                    >
                      Åpne klubb
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Divider */}
      {isSignedIn && <div className="border-t border-border/50" />}

      {/* Utforsk */}
      <section className="space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Utforsk klubber</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-7">
            Offentlige klubber er åpne for alle. Private klubber vises ikke her.
          </p>
        </div>

        {/* Search + type filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Søk etter navn, sted..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {TYPE_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={typeFilter === f.value ? "default" : "outline"}
                size="sm"
                className="h-9"
                onClick={() => setTypeFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                }}
              >
                Nullstill
              </Button>
            )}
          </div>
        </div>

        {/* Result count */}
        {!publicLoading && !isError && (
          <p className="text-xs text-muted-foreground">
            {filteredPublic.length === 0
              ? "Ingen resultater"
              : `${filteredPublic.length} ${filteredPublic.length === 1 ? "klubb" : "klubber"} funnet`}
            {hasActiveFilter && " · filtrert"}
          </p>
        )}

        {/* Content */}
        {publicLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ClubCardSkeleton />
            <ClubCardSkeleton />
            <ClubCardSkeleton />
            <ClubCardSkeleton />
            <ClubCardSkeleton />
            <ClubCardSkeleton />
          </div>
        ) : isError ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Kunne ikke laste klubber.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Prøv igjen
            </Button>
          </div>
        ) : filteredPublic.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              {search ? (
                <Search className="w-6 h-6 text-muted-foreground" />
              ) : (
                <Compass className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {search
                ? `Ingen klubber matcher «${search}»`
                : "Ingen offentlige klubber ennå."}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1.5 max-w-xs mx-auto">
              {search
                ? "Prøv et annet søkeord eller fjern filteret."
                : "Bli den første til å opprette en."}
            </p>
            <div className="flex gap-2 justify-center mt-5">
              {search && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("all");
                  }}
                >
                  Fjern filter
                </Button>
              )}
              <Link href="/clubs/new">
                <Button size="sm" variant={search ? "ghost" : "default"} className="gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  Opprett klubb
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPublic.map((club) => (
              <ClubCard
                key={club.id}
                club={club}
                membershipRole={null}
                action={
                  club.joinMode === "invite_only" ? (
                    <div
                      className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground py-2 rounded-lg border border-border/50 bg-muted/30"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <Lock className="w-3 h-3" />
                      Krever invitasjon
                    </div>
                  ) : isSignedIn ? (
                    <Button
                      size="sm"
                      className="w-full gap-2"
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
                    </Button>
                  ) : (
                    <Link
                      href="/sign-in"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button size="sm" variant="outline" className="w-full gap-2">
                        Logg inn for å bli med
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  )
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
