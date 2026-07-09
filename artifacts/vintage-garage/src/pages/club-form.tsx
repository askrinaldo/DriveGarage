import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  useCreateClub,
  useGetClub,
  useUpdateClub,
  getGetClubQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Lock, Globe, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/ui-states";

interface Params {
  id?: string;
}

export default function ClubForm() {
  const params = useParams<Params>();
  const clubId = params.id ? parseInt(params.id, 10) : undefined;
  const isEdit = !!clubId;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: existingClub, isLoading: loadingClub } = useGetClub(clubId!, {
    query: {
      queryKey: getGetClubQueryKey(clubId!),
      enabled: isEdit,
    },
  });

  const [form, setForm] = useState({
    name: "",
    description: "",
    logoUrl: "",
    bannerUrl: "",
    location: "",
    clubType: "both" as "car" | "motorcycle" | "both",
    ownerName: "",
    isPrivate: false,
    joinMode: "open" as "open" | "invite_only",
  });

  useEffect(() => {
    if (existingClub) {
      setForm({
        name: existingClub.name,
        description: existingClub.description ?? "",
        logoUrl: existingClub.logoUrl ?? "",
        bannerUrl: existingClub.bannerUrl ?? "",
        location: existingClub.location ?? "",
        clubType: existingClub.clubType as "car" | "motorcycle" | "both",
        ownerName: existingClub.ownerName,
        isPrivate: (existingClub as { isPrivate?: boolean }).isPrivate ?? false,
        joinMode: ((existingClub as { joinMode?: string }).joinMode ?? "open") as "open" | "invite_only",
      });
    }
  }, [existingClub]);

  const createMutation = useCreateClub();
  const updateMutation = useUpdateClub();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Krav mangler", description: "Klubbnavn er påkrevd.", variant: "destructive" });
      return;
    }
    if (!isEdit && !form.ownerName.trim()) {
      toast({ title: "Krav mangler", description: "Ditt navn er påkrevd.", variant: "destructive" });
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
      bannerUrl: form.bannerUrl.trim() || null,
      location: form.location.trim() || null,
      clubType: form.clubType,
      isPrivate: form.isPrivate,
      joinMode: form.joinMode,
      ...(isEdit ? {} : { ownerName: form.ownerName.trim() }),
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: clubId!, data: payload });
        toast({ title: "Klubb oppdatert" });
        navigate(`/clubs/${clubId}`);
      } else {
        const created = await createMutation.mutateAsync({ data: { ...payload, ownerName: form.ownerName.trim() } });
        toast({ title: "Klubb opprettet", description: "Du er nå registrert som eier." });
        navigate(`/clubs/${created.id}`);
      }
    } catch {
      toast({ title: "Noe gikk galt", variant: "destructive" });
    }
  }

  if (isEdit && loadingClub) return <LoadingState message="Laster klubb..." />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(isEdit ? `/clubs/${clubId}` : "/clubs")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Rediger klubb" : "Opprett ny klubb"}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isEdit
              ? "Oppdater klubbinformasjonen nedenfor."
              : "Fyll inn informasjon om din veteranklubb."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grunnleggende informasjon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Klubbnavn *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Oslo Veteranklubben"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Beskrivelse</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Fortell om klubben, hva dere driver med og hvem som er velkomne..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="clubType">Klubbtype *</Label>
                <Select
                  value={form.clubType}
                  onValueChange={(v) => handleChange("clubType", v)}
                >
                  <SelectTrigger id="clubType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Bil</SelectItem>
                    <SelectItem value="motorcycle">Motorsykkel</SelectItem>
                    <SelectItem value="both">Bil og motorsykkel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Lokasjon</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  placeholder="Oslo, Norge"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Personvern og tilgang
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isPrivate: false }))}
                className={`relative text-left rounded-lg border p-4 transition-colors ${
                  !form.isPrivate
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-muted-foreground/40"
                }`}
              >
                {!form.isPrivate && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1.5">
                  <Globe className="w-4 h-4 text-sky-400" />
                  <span className="font-medium text-sm">Offentlig</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Klubben vises i «Utforsk»-listen, og hvem som helst kan melde seg inn.
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, isPrivate: true, joinMode: "invite_only" }))
                }
                className={`relative text-left rounded-lg border p-4 transition-colors ${
                  form.isPrivate
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-muted-foreground/40"
                }`}
              >
                {form.isPrivate && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1.5">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-sm">Privat</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Skjult fra «Utforsk». Nye medlemmer kan kun bli med via invitasjon.
                </p>
              </button>
            </div>

            {!form.isPrivate && (
              <div className="space-y-1.5">
                <Label htmlFor="joinMode">Innmeldingsmodus</Label>
                <Select
                  value={form.joinMode}
                  onValueChange={(v) => setForm((f) => ({ ...f, joinMode: v as "open" | "invite_only" }))}
                >
                  <SelectTrigger id="joinMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Åpen — hvem som helst kan melde seg inn</SelectItem>
                    <SelectItem value="invite_only">Kun invitasjon — admin godkjenner nye medlemmer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.isPrivate && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Lock className="w-3 h-3 shrink-0" />
                Private klubber krever alltid invitasjon — innmeldingsmodus settes automatisk.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bilder (valgfritt)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="logoUrl">Logo-URL</Label>
              <Input
                id="logoUrl"
                value={form.logoUrl}
                onChange={(e) => handleChange("logoUrl", e.target.value)}
                placeholder="https://eksempel.no/logo.png"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bannerUrl">Banner-URL</Label>
              <Input
                id="bannerUrl"
                value={form.bannerUrl}
                onChange={(e) => handleChange("bannerUrl", e.target.value)}
                placeholder="https://eksempel.no/banner.jpg"
              />
            </div>
          </CardContent>
        </Card>

        {!isEdit && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Din informasjon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <Label htmlFor="ownerName">Ditt navn *</Label>
                <Input
                  id="ownerName"
                  value={form.ownerName}
                  onChange={(e) => handleChange("ownerName", e.target.value)}
                  placeholder="Ola Nordmann"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Du blir automatisk registrert som eier av klubben.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEdit ? `/clubs/${clubId}` : "/clubs")}
          >
            Avbryt
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Lagre endringer" : "Opprett klubb"}
          </Button>
        </div>
      </form>
    </div>
  );
}
