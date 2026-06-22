import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Calendar, MapPin, Users, Clock, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClubAuth } from "@/hooks/use-club-auth";

interface Params { id: string; eventId?: string }

interface EventData {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  latitude: string | null;
  longitude: string | null;
  startAt: string;
  endAt: string | null;
  maxAttendees: number | null;
  imageUrl: string | null;
  status: string;
}

function toLocalDateTimeString(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ClubEventForm() {
  const params = useParams<Params>();
  const clubId = parseInt(params.id, 10);
  const eventId = params.eventId ? parseInt(params.eventId, 10) : undefined;
  const isEdit = !!eventId;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { getToken, memberName, isAuthenticated } = useClubAuth(clubId);
  const token = getToken();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || !eventId) return;
    fetch(`/api/clubs/${clubId}/events/${eventId}`)
      .then((r) => r.json() as Promise<EventData>)
      .then((e) => {
        setTitle(e.title);
        setDescription(e.description ?? "");
        setLocation(e.location ?? "");
        setStartAt(toLocalDateTimeString(e.startAt));
        setEndAt(e.endAt ? toLocalDateTimeString(e.endAt) : "");
        setMaxAttendees(e.maxAttendees != null ? String(e.maxAttendees) : "");
        setImageUrl(e.imageUrl ?? "");
        setLoadingEvent(false);
      })
      .catch(() => setLoadingEvent(false));
  }, [isEdit, eventId, clubId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Tittel er påkrevd", variant: "destructive" });
      return;
    }
    if (!startAt) {
      toast({ title: "Startdato er påkrevd", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : null,
        maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : null,
        imageUrl: imageUrl.trim() || null,
      };

      const url = isEdit
        ? `/api/clubs/${clubId}/events/${eventId}`
        : `/api/clubs/${clubId}/events`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Noe gikk galt");
      }

      const event = (await res.json()) as { id: number };
      toast({ title: isEdit ? "Arrangement oppdatert" : "Arrangement opprettet" });
      navigate(`/clubs/${clubId}/events/${event.id}`);
    } catch (err: unknown) {
      toast({
        title: (err as Error).message ?? "Noe gikk galt",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto">
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="font-medium mb-1">Innlogging kreves</p>
            <p className="text-sm text-muted-foreground">
              Du må logge inn i klubben for å opprette arrangementer.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => navigate(`/clubs/${clubId}/forum`)}
            >
              Logg inn
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingEvent) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/clubs/${clubId}/events`)}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Rediger arrangement" : "Nytt arrangement"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {memberName && `Som ${memberName}`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Grunninfo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Tittel *</Label>
              <Input
                id="title"
                placeholder="f.eks. Sommermøte på Ekebergsletta"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Beskrivelse</Label>
              <Textarea
                id="description"
                placeholder="Hva skjer, hva tar man med, parkering..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="imageUrl">Bildekoblenke (valgfritt)</Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Date & time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Dato og tid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startAt">Starter *</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endAt">Slutter (valgfritt)</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Sted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="location">Adresse / stedsnavn</Label>
              <Input
                id="location"
                placeholder="f.eks. Ekebergsletta, Oslo"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Medlemmene vil se adressen og få en lenke til kart.
            </p>
          </CardContent>
        </Card>

        {/* Capacity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Deltakere
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="maxAttendees">Maks antall (valgfritt)</Label>
              <Input
                id="maxAttendees"
                type="number"
                min="1"
                placeholder="Ubegrenset"
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(e.target.value)}
                className="w-40"
              />
              <p className="text-xs text-muted-foreground">La stå tomt for ubegrenset antall.</p>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3 justify-end pb-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(`/clubs/${clubId}/events`)}
          >
            Avbryt
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            {isEdit ? "Lagre endringer" : "Opprett arrangement"}
          </Button>
        </div>
      </form>
    </div>
  );
}
