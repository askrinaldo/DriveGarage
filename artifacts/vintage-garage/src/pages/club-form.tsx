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
import { ArrowLeft, Loader2 } from "lucide-react";
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
