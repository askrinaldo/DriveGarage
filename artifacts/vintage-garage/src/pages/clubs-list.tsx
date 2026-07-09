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
import { LoadingState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, Users, MapPin, Car, Bike, Lock, Search, Globe, BookUser,
  Crown, UserPlus, Loader2, ArrowRight,
} from "lucide-react";

const typeColor: Record<string, string> = {
  car: "bg-blue-500/20 text-blue-300",
  motorcycle: "bg-amber-500/20 text-amber-300",
  both: "bg-emerald-500/20 text-emerald-300",
};

const typeLabel: Record<string, string> = {
  car: "Bil",
  motorcycle: "Motorsykkel",
  both: "Bil og motorsykkel",
};

const TypeIcon = ({ type }: { type: string }) => {
  if (type === "car") return <Car className="w-5 h-5" />;
  if (type === "motorcycle") return <Bike className="w-5 h-5" />;
  return (
    <span className="flex gap-1">
      <Car className="w-4 h-4" />
      <Bike className="w-4 h-4" />
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

interface ClubCardProps {
  club: ClubLike;
  /** "owner" | "member" | null — shown as a role badge on the card */
  membershipRole?: "owner" | "member" | null;
  /** Footer action rendered at the bottom of the card */
  action?: React.ReactNode;
}

function ClubCard({ club, membershipRole, action }: ClubCardProps) {
  return (
    <Link href={`/clubs/${club.id}`}>
      <Card className="hover-elevate cursor-pointer transition-all bg-card border-border overflow-hidden group h-full flex flex-col">
        {club.bannerUrl ? (
          <div
            className="h-24 w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${club.bannerUrl})` }}
          />
        ) : (
          <div className="h-24 w-full bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center">
            <TypeIcon type={club.clubType} />
          </div>
        )}
        <CardContent className="p-5 flex-1 flex flex-col">
          <div className="flex items-start gap-3 mb-3">
            {club.logoUrl ? (
              <img
                src={club.logoUrl}
                alt={club.name}
                className="w-12 h-12 rounded-md object-cover border border-border shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                <TypeIcon type={club.clubType} />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-base leading-tight truncate group-hover:text-primary transition-colors">
                {club.name}
              </h3>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge className={`text-xs ${typeColor[club.clubType] ?? ""} border-0`}>
                  {typeLabel[club.clubType] ?? club.clubType}
                </Badge>
                {club.isPrivate ? (
                  <Badge className="text-xs bg-slate-500/20 text-slate-300 border-0 gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Privat
                  </Badge>
                ) : (
                  <Badge className="text-xs bg-sky-500/15 text-sky-300 border-0 gap-1">
                    <Globe className="w-2.5 h-2.5" />
                    Offentlig
                  </Badge>
                )}
                {membershipRole === "owner" && (
                  <Badge className="text-xs bg-yellow-500/15 text-yellow-300 border-0 gap-1">
                    <Crown className="w-2.5 h-2.5" />
                    Eier
                  </Badge>
                )}
                {membershipRole === "member" && (
                  <Badge className="text-xs bg-emerald-500/15 text-emerald-300 border-0 gap-1">
                    <Users className="w-2.5 h-2.5" />
                    Medlem
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {club.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {club.description}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>
                {club.memberCount}{" "}
                {club.memberCount === 1 ? "Medlem" : "Medlemmer"}
              </span>
            </div>
            {club.location && (
              <div className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{club.location}</span>
              </div>
            )}
          </div>

          {action && <div className="mt-4">{action}</div>}
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

  const { data: publicClubs, isLoading: publicLoading, isError, refetch } = useListClubs(
    discoverParams,
    { query: { queryKey: getListClubsQueryKey(discoverParams) } }
  );

  const joinMutation = useJoinClub();

  const myClubIds = new Set((myClubs ?? []).map((c) => c.id));

  function myRoleFor(club: ClubLike): "owner" | "member" {
    const candidates = [myName, myEmail]
      .filter((c): c is string => !!c)
      .map((c) => c.toLowerCase());
    return club.ownerName && candidates.includes(club.ownerName.toLowerCase())
      ? "owner"
      : "member";
  }

  async function handleJoin(club: ClubLike) {
    setJoiningId(club.id);
    try {
      await joinMutation.mutateAsync({ clubId: club.id, data: { memberName: "join" } });
      toast({ title: "Du er nå medlem", description: `Velkommen til ${club.name}!` });
      queryClient.invalidateQueries({ queryKey: getListClubsQueryKey({ scope: "mine" }) });
      navigate(`/clubs/${club.id}`);
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error;
      toast({ title: msg ?? "Kunne ikke bli med i klubben", variant: "destructive" });
    } finally {
      setJoiningId(null);
    }
  }

  const filteredPublic = (publicClubs ?? []).filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.location ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Klubber</h1>
          <p className="text-muted-foreground mt-1">
            Finn og bli med i veteranklubber for biler og motorsykler.
          </p>
        </div>
        <Link href="/clubs/new">
          <Button className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Opprett klubb
          </Button>
        </Link>
      </div>

      {/* Mine klubber */}
      {isSignedIn && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BookUser className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Mine klubber</h2>
          </div>

          {myLoading ? (
            <div className="text-sm text-muted-foreground py-4 pl-1">Laster dine klubber...</div>
          ) : !myClubs || myClubs.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl py-10 text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm font-medium">Du er ikke med i noen klubber ennå.</p>
              <p className="text-muted-foreground text-xs mt-1">
                Utforsk offentlige klubber nedenfor, eller opprett din egen.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myClubs.map((club) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  membershipRole={myRoleFor(club)}
                  action={
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/clubs/${club.id}`);
                      }}
                    >
                      Åpne klubb
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Divider */}
      {isSignedIn && <div className="border-t border-border" />}

      {/* Utforsk offentlige klubber */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Utforsk offentlige klubber</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-7">
            Offentlige klubber er åpne — alle kan melde seg inn.
            Private klubber er kun tilgjengelige via invitasjon og vises ikke her.
          </p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Søk etter navn eller sted..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {TYPE_FILTERS.map((f) => (
              <Button
                key={f.value}
                variant={typeFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {publicLoading ? (
          <LoadingState message="Laster klubber..." />
        ) : isError ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm mb-3">Kunne ikke laste klubber.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Prøv igjen</Button>
          </div>
        ) : filteredPublic.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Globe className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              {search ? `Ingen klubber matcher "${search}".` : "Ingen offentlige klubber ennå."}
            </p>
            {search && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearch("")}>
                Nullstill søk
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPublic.map((club) => {
              const isMember = myClubIds.has(club.id);
              return (
                <ClubCard
                  key={club.id}
                  club={club}
                  membershipRole={isMember ? myRoleFor(club) : null}
                  action={
                    isMember ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/clubs/${club.id}`);
                        }}
                      >
                        Åpne klubb
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    ) : club.joinMode === "invite_only" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-muted-foreground"
                        disabled
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <Lock className="w-3.5 h-3.5 mr-1.5" />
                        Krever invitasjon
                      </Button>
                    ) : isSignedIn ? (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={joiningId === club.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void handleJoin(club);
                        }}
                      >
                        {joiningId === club.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Bli med
                      </Button>
                    ) : null
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
