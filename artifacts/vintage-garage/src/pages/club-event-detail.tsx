import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState, ErrorState } from "@/components/ui-states";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Calendar, MapPin, Users, Clock, Edit, Trash2,
  CheckCircle2, HelpCircle, XCircle, ExternalLink, Loader2,
  Crown, Shield, UserCheck, User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClubAuth } from "@/hooks/use-club-auth";

interface Params { id: string; eventId: string }

interface Rsvp {
  id: number;
  memberName: string;
  status: "going" | "maybe" | "not_going";
  note: string | null;
  createdAt: string;
}

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
  rsvps: Rsvp[];
  rsvpCounts: { going: number; maybe: number; not_going: number };
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

const ROLE_ICON: Record<string, React.ReactNode> = {
  owner: <Crown className="w-3 h-3 text-yellow-400" />,
  admin: <Shield className="w-3 h-3 text-blue-400" />,
  moderator: <UserCheck className="w-3 h-3 text-emerald-400" />,
  member: <User className="w-3 h-3 text-muted-foreground" />,
};

function MapEmbed({ location, lat, lng }: { location: string; lat?: string | null; lng?: string | null }) {
  const query = encodeURIComponent(lat && lng ? `${lat},${lng}` : location);
  const osmUrl = lat && lng
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=14`
    : `https://www.openstreetmap.org/search?query=${query}`;
  const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  const iframeSrc = lat && lng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(lng) - 0.01},${parseFloat(lat) - 0.007},${parseFloat(lng) + 0.01},${parseFloat(lat) + 0.007}&layer=mapnik&marker=${lat},${lng}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=10.64,59.85,10.88,59.97&layer=mapnik`;

  return (
    <div className="space-y-2">
      <div className="rounded-lg overflow-hidden border border-border/50 h-48 bg-muted/20">
        {lat && lng ? (
          <iframe
            src={iframeSrc}
            className="w-full h-full"
            frameBorder="0"
            scrolling="no"
            title="Kart"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm gap-2">
            <MapPin className="w-4 h-4" />
            {location}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button variant="outline" size="sm" className="w-full text-xs">
            <ExternalLink className="w-3 h-3 mr-1.5" />
            Åpne i Google Maps
          </Button>
        </a>
        <a href={osmUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
          <Button variant="outline" size="sm" className="w-full text-xs">
            <ExternalLink className="w-3 h-3 mr-1.5" />
            OpenStreetMap
          </Button>
        </a>
      </div>
    </div>
  );
}

export default function ClubEventDetail() {
  const params = useParams<Params>();
  const clubId = parseInt(params.id, 10);
  const eventId = parseInt(params.eventId, 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { getToken, memberName, role, isAuthenticated } = useClubAuth(clubId);
  const token = getToken();

  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpNote, setRsvpNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<"going" | "maybe" | "not_going" | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/clubs/${clubId}/events/${eventId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json() as Promise<ClubEvent>;
      })
      .then((d) => { setEvent(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [clubId, eventId]);

  useEffect(() => { load(); }, [load]);

  const myRsvp = event?.rsvps.find(
    (r) => r.memberName.toLowerCase() === memberName?.toLowerCase()
  );

  async function handleRsvp(status: "going" | "maybe" | "not_going") {
    if (!isAuthenticated || !token) {
      toast({ title: "Logg inn for å melde deg på", variant: "destructive" });
      return;
    }
    setRsvpLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/events/${eventId}/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, note: rsvpNote.trim() || null }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Noe gikk galt");
      }
      toast({
        title: status === "going"
          ? "Du er påmeldt!"
          : status === "maybe"
          ? "Du er satt som usikker"
          : "Du er avmeldt",
      });
      setRsvpNote("");
      setShowNoteInput(false);
      setPendingStatus(null);
      load();
    } catch (err: unknown) {
      toast({ title: (err as Error).message, variant: "destructive" });
    } finally {
      setRsvpLoading(false);
    }
  }

  async function handleDelete() {
    if (!token) return;
    try {
      await fetch(`/api/clubs/${clubId}/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ title: "Arrangement slettet" });
      navigate(`/clubs/${clubId}/events`);
    } catch {
      toast({ title: "Noe gikk galt", variant: "destructive" });
    }
  }

  async function handleCancel() {
    if (!token) return;
    try {
      await fetch(`/api/clubs/${clubId}/events/${eventId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      });
      toast({ title: "Arrangement avlyst" });
      load();
    } catch {
      toast({ title: "Noe gikk galt", variant: "destructive" });
    }
  }

  if (loading) return <LoadingState message="Laster arrangement..." />;
  if (error || !event) return <ErrorState onRetry={load} />;

  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : null;
  const isMod = ["owner", "admin", "moderator"].includes(role ?? "");
  const canEdit = isAuthenticated && (event.createdBy === memberName || isMod);
  const canRsvp = isAuthenticated && event.status !== "cancelled" && event.status !== "past";
  const isFull = event.maxAttendees != null && event.rsvpCounts.going >= event.maxAttendees;

  const goingList = event.rsvps.filter((r) => r.status === "going");
  const maybeList = event.rsvps.filter((r) => r.status === "maybe");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/clubs/${clubId}/events`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className={`text-xl font-bold tracking-tight truncate ${event.status === "cancelled" ? "line-through text-muted-foreground" : ""}`}>
              {event.title}
            </h1>
            <Badge variant="outline" className={`${STATUS_COLOR[event.status]} text-xs shrink-0`}>
              {STATUS_LABEL[event.status]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Opprettet av {event.createdBy}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2 shrink-0">
            <Link href={`/clubs/${clubId}/events/${eventId}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Rediger
              </Button>
            </Link>
            {event.status !== "cancelled" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-amber-400 border-amber-500/30">
                    Avlys
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Avlys arrangement?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Alle påmeldte vil se at arrangementet er avlyst.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel}>Avlys arrangement</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Slett arrangement?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dette vil slette <strong>{event.title}</strong> og alle påmeldinger permanent.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Slett
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Banner image */}
      {event.imageUrl && (
        <div
          className="w-full h-48 rounded-xl bg-cover bg-center border border-border"
          style={{ backgroundImage: `url(${event.imageUrl})` }}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Date / time / location */}
          <Card>
            <CardContent className="pt-5 pb-5 grid sm:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Dato</p>
                    <p className="text-sm font-medium">
                      {start.toLocaleDateString("nb-NO", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Tid</p>
                    <p className="text-sm font-medium">
                      {start.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
                      {end && (
                        <> – {end.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}</>
                      )}
                    </p>
                    {end && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Math.round((end.getTime() - start.getTime()) / 3600000)} timer
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {event.location && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5">Sted</p>
                    <p className="text-sm font-medium">{event.location}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {event.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Om arrangementet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {event.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Map */}
          {event.location && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Kart
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MapEmbed
                  location={event.location}
                  lat={event.latitude}
                  lng={event.longitude}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: RSVP + attendees */}
        <div className="space-y-4">
          {/* RSVP card */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Påmelding
                </span>
                {event.maxAttendees && (
                  <span className="text-xs text-muted-foreground font-normal">
                    {event.rsvpCounts.going} / {event.maxAttendees}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Counts */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-0.5" />
                  <div className="text-lg font-bold text-emerald-400">{event.rsvpCounts.going}</div>
                  <div className="text-[10px] text-muted-foreground">Kommer</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <HelpCircle className="w-4 h-4 text-amber-400 mx-auto mb-0.5" />
                  <div className="text-lg font-bold text-amber-400">{event.rsvpCounts.maybe}</div>
                  <div className="text-[10px] text-muted-foreground">Kanskje</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/30 border border-border/50">
                  <XCircle className="w-4 h-4 text-muted-foreground mx-auto mb-0.5" />
                  <div className="text-lg font-bold text-muted-foreground">{event.rsvpCounts.not_going}</div>
                  <div className="text-[10px] text-muted-foreground">Kommer ikke</div>
                </div>
              </div>

              {/* Capacity bar */}
              {event.maxAttendees && (
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(100, (event.rsvpCounts.going / event.maxAttendees) * 100)}%` }}
                    />
                  </div>
                  {isFull && (
                    <p className="text-xs text-amber-400 text-center font-medium">Arrangementet er fullt</p>
                  )}
                </div>
              )}

              {/* My RSVP status */}
              {myRsvp && (
                <div className="text-center py-1">
                  <span className="text-xs text-muted-foreground">Din status: </span>
                  <span className={`text-xs font-medium ${
                    myRsvp.status === "going" ? "text-emerald-400"
                    : myRsvp.status === "maybe" ? "text-amber-400"
                    : "text-muted-foreground"
                  }`}>
                    {myRsvp.status === "going" ? "Kommer" : myRsvp.status === "maybe" ? "Kanskje" : "Kommer ikke"}
                  </span>
                </div>
              )}

              {/* RSVP buttons */}
              {canRsvp && !isFull && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant={myRsvp?.status === "going" ? "default" : "outline"}
                      className={`text-xs ${myRsvp?.status === "going" ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0" : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"}`}
                      onClick={() => {
                        setPendingStatus("going");
                        setShowNoteInput(true);
                      }}
                      disabled={rsvpLoading}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Kommer
                    </Button>
                    <Button
                      size="sm"
                      variant={myRsvp?.status === "maybe" ? "default" : "outline"}
                      className={`text-xs ${myRsvp?.status === "maybe" ? "bg-amber-600 hover:bg-amber-700 text-white border-0" : "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"}`}
                      onClick={() => {
                        setPendingStatus("maybe");
                        setShowNoteInput(true);
                      }}
                      disabled={rsvpLoading}
                    >
                      <HelpCircle className="w-3 h-3 mr-1" />
                      Kanskje
                    </Button>
                    <Button
                      size="sm"
                      variant={myRsvp?.status === "not_going" ? "default" : "outline"}
                      className={`text-xs ${myRsvp?.status === "not_going" ? "bg-muted hover:bg-muted text-foreground border-0" : "border-border text-muted-foreground hover:bg-muted/30"}`}
                      onClick={() => {
                        setPendingStatus("not_going");
                        setShowNoteInput(true);
                      }}
                      disabled={rsvpLoading}
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Nei
                    </Button>
                  </div>
                  {showNoteInput && pendingStatus && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Legg til en kommentar (valgfritt)"
                        value={rsvpNote}
                        onChange={(e) => setRsvpNote(e.target.value)}
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 text-xs"
                          onClick={() => handleRsvp(pendingStatus)}
                          disabled={rsvpLoading}
                        >
                          {rsvpLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Bekreft"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => { setShowNoteInput(false); setPendingStatus(null); }}
                        >
                          Avbryt
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isAuthenticated && (
                <p className="text-xs text-muted-foreground text-center">
                  <Link href={`/clubs/${clubId}/forum`} className="text-primary underline">
                    Logg inn
                  </Link>{" "}
                  for å melde deg på
                </p>
              )}

              {event.status === "cancelled" && (
                <p className="text-xs text-destructive text-center font-medium">
                  Dette arrangementet er avlyst.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Attendee list */}
          {(goingList.length > 0 || maybeList.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Deltakere</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {goingList.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide mb-1.5">
                      Kommer ({goingList.length})
                    </p>
                    <div className="space-y-1.5">
                      {goingList.map((r) => (
                        <div key={r.id} className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-emerald-400">
                              {r.memberName[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{r.memberName}</p>
                            {r.note && <p className="text-[10px] text-muted-foreground italic">"{r.note}"</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {maybeList.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide mb-1.5">
                      Kanskje ({maybeList.length})
                    </p>
                    <div className="space-y-1.5">
                      {maybeList.map((r) => (
                        <div key={r.id} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-amber-400">
                              {r.memberName[0]?.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs truncate">{r.memberName}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
