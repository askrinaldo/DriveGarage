import { useState } from "react";
import { Link } from "wouter";
import {
  useListClubs,
  getListClubsQueryKey,
} from "@workspace/api-client-react";
import { LoadingState, ErrorState } from "@/components/ui-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, MapPin, Car, Bike } from "lucide-react";

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

export default function ClubsList() {
  const [filter, setFilter] = useState<string>("all");

  const { data: clubs, isLoading, isError, refetch } = useListClubs(
    filter === "all" ? {} : { type: filter },
    { query: { queryKey: getListClubsQueryKey(filter === "all" ? {} : { type: filter }) } }
  );

  if (isLoading) return <LoadingState message="Laster klubber..." />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <div className="space-y-6">
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

      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: "Alle" },
          { value: "car", label: "Bil" },
          { value: "motorcycle", label: "Motorsykkel" },
          { value: "both", label: "Begge" },
        ].map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {!clubs || clubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Ingen klubber funnet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Vær den første til å opprette en veteranklubb i ditt område.
          </p>
          <Link href="/clubs/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Opprett klubb
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <Link key={club.id} href={`/clubs/${club.id}`}>
              <Card className="hover-elevate cursor-pointer transition-all bg-card border-border overflow-hidden group h-full">
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
                <CardContent className="p-5">
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
                      <Badge
                        className={`text-xs mt-1 ${typeColor[club.clubType] ?? ""} border-0`}
                      >
                        {typeLabel[club.clubType] ?? club.clubType}
                      </Badge>
                    </div>
                  </div>

                  {club.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {club.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{club.memberCount} {club.memberCount === 1 ? "medlem" : "medlemmer"}</span>
                    </div>
                    {club.location && (
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{club.location}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
