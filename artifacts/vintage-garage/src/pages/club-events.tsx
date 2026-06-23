import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/ui-states";
import {
  ArrowLeft, Calendar, MapPin, Users, Clock, Plus,
  ChevronLeft, ChevronRight, List, CalendarDays, Lock,
} from "lucide-react";
import { useClubAuth } from "@/hooks/use-club-auth";
import { useGetClub, getGetClubQueryKey } from "@workspace/api-client-react";

interface Params { id: string }

interface RsvpCounts { going: number; maybe: number; not_going: number }

interface ClubEvent {
  id: number;
  clubId: number;
  title: string;
  description: string | null;
  location: string | null;
  latitude: string | null;
  longitude: string | null;
  startAt: string;
  endAt: string | null;
  createdBy: string;
  maxAttendees: number | null;
  status: "upcoming" | "ongoing" | "cancelled" | "past";
  imageUrl: string | null;
  createdAt: string;
  rsvpCounts: RsvpCounts;
}

const STATUS_LABEL: Record<string, string> = {
  upcoming: "Kommende",
  ongoing: "Pågående",
  cancelled: "Avlyst",
  past: "Avholdt",
};

const STATUS_COLOR: Record<string, string> = {
  upcoming: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  ongoing: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  past: "bg-muted text-muted-foreground border-border",
};

const DAYS_NO = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
const MONTHS_NO = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
];

function formatDateTime(dt: string, includeTime = true): string {
  const d = new Date(dt);
  const date = d.toLocaleDateString("nb-NO", { weekday: "short", day: "numeric", month: "long" });
  if (!includeTime) return date;
  const time = d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  return `${date} kl. ${time}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function CalendarView({
  events, clubId, currentMonth, setCurrentMonth,
}: {
  events: ClubEvent[];
  clubId: number;
  currentMonth: Date;
  setCurrentMonth: (d: Date) => void;
}) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;

  const cells: Array<Date | null> = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - startDow + 1;
    if (day < 1 || day > lastDay.getDate()) cells.push(null);
    else cells.push(new Date(year, month, day));
  }

  const today = new Date();

  function eventsOnDay(d: Date): ClubEvent[] {
    return events.filter((e) => isSameDay(new Date(e.startAt), d));
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="flex-1 text-center text-sm font-semibold">
            {MONTHS_NO[month]} {year}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px">
          {DAYS_NO.map((d) => (
            <div key={d} className="text-center text-[11px] text-muted-foreground font-medium py-1">
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="h-16" />;
            const dayEvents = eventsOnDay(d);
            const isToday = isSameDay(d, today);
            return (
              <div
                key={d.toISOString()}
                className={`h-16 p-1 rounded-md border transition-colors ${
                  isToday ? "border-primary/50 bg-primary/5" : "border-transparent hover:border-border/50"
                }`}
              >
                <span
                  className={`text-xs font-medium block text-right mb-1 ${
                    isToday ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {d.getDate()}
                </span>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((e) => (
                    <Link key={e.id} href={`/clubs/${clubId}/events/${e.id}`}>
                      <div
                        className={`text-[9px] font-medium truncate rounded px-1 py-0.5 cursor-pointer hover:opacity-80 ${
                          e.status === "cancelled"
                            ? "bg-destructive/20 text-destructive line-through"
                            : "bg-primary/20 text-primary"
                        }`}
                      >
                        {e.title}
                      </div>
                    </Link>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[9px] text-muted-foreground text-center">
                      +{dayEvents.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClubEvents() {
  const params = useParams<Params>();
  const clubId = parseInt(params.id, 10);
  const [, navigate] = useLocation();

  const { session, getToken } = useClubAuth(clubId);
  const { data: club } = useGetClub(clubId, { query: { queryKey: getGetClubQueryKey(clubId) } });

  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [locked, setLocked] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    setLocked(false);
    const token = getToken();
    fetch(`/api/clubs/${clubId}/events`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (r.status === 403) { setLocked(true); setLoading(false); return null; }
        if (!r.ok) throw new Error();
        return r.json() as Promise<ClubEvent[]>;
      })
      .then((d) => {
        if (d == null) return;
        setEvents(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [clubId, getToken]);

  useEffect(() => { load(); }, [load, session]);

  const now = new Date();
  const filtered = events.filter((e) => {
    if (filter === "upcoming") return new Date(e.startAt) >= now && e.status !== "cancelled";
    if (filter === "past") return new Date(e.startAt) < now || e.status === "cancelled";
    return true;
  });

  if (loading) return <LoadingState message="Laster arrangementer..." />;
  if (error) return <ErrorState onRetry={load} />;
  if (locked) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
        <Lock className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-1">Private arrangementer</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Kun klubbmedlemmer kan se arrangementer. Logg inn via klubbforumet for å få tilgang.
        </p>
      </div>
      <Button variant="outline" onClick={() => navigate(`/clubs/${clubId}`)}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Tilbake til klubben
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/clubs/${clubId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Arrangementer</h1>
          <p className="text-sm text-muted-foreground">Treff og samlinger for klubbens medlemmer</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
          >
            <List className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant={view === "calendar" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("calendar")}
          >
            <CalendarDays className="w-3.5 h-3.5" />
          </Button>
          <Link href={`/clubs/${clubId}/events/new`}>
            <Button size="sm">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nytt arrangement
            </Button>
          </Link>
        </div>
      </div>

      {view === "calendar" ? (
        <CalendarView
          events={events}
          clubId={clubId}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
        />
      ) : (
        <>
          {/* Filter tabs */}
          <div className="flex gap-1 p-1 bg-muted/30 rounded-lg w-fit">
            {(["upcoming", "all", "past"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "upcoming" ? "Kommende" : f === "all" ? "Alle" : "Tidligere"}
              </button>
            ))}
          </div>

          {/* Event list */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-1">Ingen arrangementer</p>
              <p className="text-xs mb-4">
                {filter === "upcoming" ? "Ingen kommende treff er planlagt ennå." : "Ingen arrangementer å vise."}
              </p>
              <Link href={`/clubs/${clubId}/events/new`}>
                <Button size="sm">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Opprett første arrangement
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((event) => (
                <EventCard key={event.id} event={event} clubId={clubId} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({ event, clubId }: { event: ClubEvent; clubId: number }) {
  const start = new Date(event.startAt);
  const isPast = start < new Date() || event.status === "cancelled";

  return (
    <Link href={`/clubs/${clubId}/events/${event.id}`}>
      <Card className={`hover:border-primary/40 transition-colors cursor-pointer ${isPast ? "opacity-70" : ""}`}>
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-4">
            {/* Date block */}
            <div className={`shrink-0 w-14 rounded-lg flex flex-col items-center justify-center py-2 ${
              event.status === "cancelled" ? "bg-destructive/10" : "bg-primary/10"
            }`}>
              <span className={`text-xs font-medium uppercase ${event.status === "cancelled" ? "text-destructive" : "text-primary/70"}`}>
                {start.toLocaleDateString("nb-NO", { month: "short" })}
              </span>
              <span className={`text-2xl font-bold leading-none ${event.status === "cancelled" ? "text-destructive" : "text-primary"}`}>
                {start.getDate()}
              </span>
              <span className={`text-[10px] ${event.status === "cancelled" ? "text-destructive/70" : "text-primary/60"}`}>
                {start.toLocaleDateString("nb-NO", { weekday: "short" })}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap mb-1">
                <h3 className={`font-semibold text-sm ${event.status === "cancelled" ? "line-through text-muted-foreground" : ""}`}>
                  {event.title}
                </h3>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${STATUS_COLOR[event.status]}`}>
                  {STATUS_LABEL[event.status]}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {start.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
                  {event.endAt && (
                    <> – {new Date(event.endAt).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}</>
                  )}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1 truncate max-w-48">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {event.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span className="text-emerald-400 font-medium">{event.rsvpCounts.going}</span>
                  {event.rsvpCounts.maybe > 0 && (
                    <span className="text-amber-400"> +{event.rsvpCounts.maybe}</span>
                  )}
                  {event.maxAttendees && <span> / {event.maxAttendees}</span>}
                  <span className="ml-0.5">kommer</span>
                </span>
              </div>

              {event.description && (
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{event.description}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
