import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState, ErrorState } from "@/components/ui-states";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Plus, Tag, MapPin, Phone, Package, Search,
  Trash2, Edit, CheckCircle2, Loader2, ShoppingBag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClubAuth } from "@/hooks/use-club-auth";

interface Params { id: string }

interface Listing {
  id: number;
  clubId: number;
  sellerName: string;
  title: string;
  description: string | null;
  price: string | null;
  currency: string;
  condition: "new" | "excellent" | "good" | "fair" | "parts_only";
  category: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  imageUrl: string | null;
  status: "active" | "sold" | "reserved" | "removed";
  contactInfo: string | null;
  location: string | null;
  isFree: boolean;
  createdAt: string;
}

const CONDITION_LABEL: Record<string, string> = {
  new: "Ny",
  excellent: "Meget god",
  good: "God",
  fair: "Brukbar",
  parts_only: "Kun deler",
};

const CONDITION_COLOR: Record<string, string> = {
  new: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  excellent: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  good: "bg-primary/15 text-primary border-primary/30",
  fair: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  parts_only: "bg-muted text-muted-foreground border-border",
};

const CATEGORIES = [
  "Motor", "Girkasse", "Bremser", "Dekk og felger", "Karosseri",
  "Interiør", "Elektro", "Tennsystem", "Avgassystem", "Forgasser",
  "Belysning", "Kjølesystem", "Drivverk", "Diverse",
];

function ListingForm({
  onSuccess,
  token,
  clubId,
  existing,
}: {
  onSuccess: () => void;
  token: string | null;
  clubId: number;
  existing?: Listing;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [price, setPrice] = useState(existing?.price ?? "");
  const [isFree, setIsFree] = useState(existing?.isFree ?? false);
  const [condition, setCondition] = useState<string>(existing?.condition ?? "good");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [make, setMake] = useState(existing?.make ?? "");
  const [model, setModel] = useState(existing?.model ?? "");
  const [year, setYear] = useState(existing?.year ? String(existing.year) : "");
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? "");
  const [contactInfo, setContactInfo] = useState(existing?.contactInfo ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const url = existing
        ? `/api/clubs/${clubId}/marketplace/${existing.id}`
        : `/api/clubs/${clubId}/marketplace`;
      const res = await fetch(url, {
        method: existing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          price: isFree || !price ? null : parseFloat(price),
          isFree,
          condition,
          category: category || null,
          make: make.trim() || null,
          model: model.trim() || null,
          year: year ? parseInt(year, 10) : null,
          imageUrl: imageUrl.trim() || null,
          contactInfo: contactInfo.trim() || null,
          location: location.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: existing ? "Annonse oppdatert" : "Annonse publisert!" });
      onSuccess();
    } catch {
      toast({ title: "Noe gikk galt", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="space-y-1.5">
        <Label>Tittel *</Label>
        <Input placeholder="f.eks. Forgasser til BMW R90" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Beskrivelse</Label>
        <Textarea placeholder="Detaljer om delen, tilstand, historikk..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Pris (NOK)</Label>
          <Input type="number" min="0" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} disabled={isFree} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} className="rounded" />
            Gis bort gratis
          </label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tilstand</Label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {Object.entries(CONDITION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Kategori</Label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Velg kategori</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Merke</Label>
          <Input placeholder="BMW" value={make} onChange={(e) => setMake(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Modell</Label>
          <Input placeholder="R90 S" value={model} onChange={(e) => setModel(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Årsmodell</Label>
          <Input type="number" placeholder="1975" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Bildelenke</Label>
        <Input type="url" placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Kontaktinfo</Label>
          <Input placeholder="Telefon / epost" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Sted</Label>
          <Input placeholder="Oslo" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
        {existing ? "Lagre endringer" : "Publiser annonse"}
      </Button>
    </form>
  );
}

export default function ClubMarketplace() {
  const params = useParams<Params>();
  const clubId = parseInt(params.id, 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { getToken, memberName, isAuthenticated } = useClubAuth(clubId);
  const token = getToken();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [editListing, setEditListing] = useState<Listing | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/clubs/${clubId}/marketplace`)
      .then((r) => r.json() as Promise<Listing[]>)
      .then((d) => { setListings(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [clubId]);

  useEffect(() => { load(); }, [load]);

  async function markSold(listing: Listing) {
    if (!token) return;
    await fetch(`/api/clubs/${clubId}/marketplace/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "sold" }),
    });
    toast({ title: "Markert som solgt" });
    load();
  }

  async function deleteListing(id: number) {
    if (!token) return;
    await fetch(`/api/clubs/${clubId}/marketplace/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    toast({ title: "Annonse slettet" });
    load();
  }

  const filtered = listings.filter((l) => {
    const q = search.toLowerCase();
    const matchQ = !q || l.title.toLowerCase().includes(q) || (l.description ?? "").toLowerCase().includes(q) || (l.make ?? "").toLowerCase().includes(q);
    const matchCat = !filterCategory || l.category === filterCategory;
    return matchQ && matchCat;
  });

  if (loading) return <LoadingState message="Laster markedsplass..." />;
  if (error) return <ErrorState onRetry={load} />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/clubs/${clubId}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Markedsplass</h1>
          <p className="text-sm text-muted-foreground">Kjøp og selg deler innad i klubben</p>
        </div>
        {isAuthenticated && (
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Ny annonse
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Ny annonse</DialogTitle>
              </DialogHeader>
              <ListingForm
                onSuccess={() => { setNewOpen(false); load(); }}
                token={token}
                clubId={clubId}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Søk etter deler..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-36"
        >
          <option value="">Alle kategorier</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{filtered.length}</span> annonse{filtered.length !== 1 ? "r" : ""}
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-emerald-400">{listings.filter((l) => l.isFree).length}</span> gratis
        </div>
      </div>

      {/* Listings */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium mb-1">Ingen annonser ennå</p>
          <p className="text-xs mb-4">Vær den første til å legge ut en annonse!</p>
          {isAuthenticated && (
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Publiser annonse
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((listing) => (
            <Card key={listing.id} className="flex flex-col hover:border-primary/30 transition-colors">
              {listing.imageUrl && (
                <div
                  className="h-40 bg-cover bg-center rounded-t-lg border-b border-border"
                  style={{ backgroundImage: `url(${listing.imageUrl})` }}
                />
              )}
              <CardContent className={`flex-1 flex flex-col gap-2 ${listing.imageUrl ? "pt-3" : "pt-4"} pb-4`}>
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm flex-1 leading-snug">{listing.title}</h3>
                  {listing.status === "sold" && (
                    <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground shrink-0">Solgt</Badge>
                  )}
                  {listing.status === "reserved" && (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-300 shrink-0">Reservert</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CONDITION_COLOR[listing.condition]}`}>
                    {CONDITION_LABEL[listing.condition]}
                  </Badge>
                  {listing.category && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {listing.category}
                    </Badge>
                  )}
                  {(listing.make || listing.model) && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                      {[listing.make, listing.model, listing.year].filter(Boolean).join(" ")}
                    </Badge>
                  )}
                </div>

                {listing.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{listing.description}</p>
                )}

                <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                  <div>
                    {listing.isFree ? (
                      <span className="text-sm font-bold text-emerald-400">Gratis</span>
                    ) : listing.price ? (
                      <span className="text-sm font-bold text-primary">
                        {parseInt(listing.price).toLocaleString("nb-NO")} {listing.currency}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Pris ikke oppgitt</span>
                    )}
                    {listing.location && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                        <MapPin className="w-2.5 h-2.5" />{listing.location}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">{listing.sellerName}</p>
                    {listing.contactInfo && (
                      <p className="text-[10px] text-primary/70 flex items-center gap-0.5 justify-end">
                        <Phone className="w-2.5 h-2.5" />{listing.contactInfo}
                      </p>
                    )}
                  </div>
                </div>

                {memberName?.toLowerCase() === listing.sellerName.toLowerCase() && listing.status === "active" && (
                  <div className="flex gap-2 pt-1 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-7"
                      onClick={() => markSold(listing)}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Solgt
                    </Button>
                    <Dialog open={editListing?.id === listing.id} onOpenChange={(o) => !o && setEditListing(null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => setEditListing(listing)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader><DialogTitle>Rediger annonse</DialogTitle></DialogHeader>
                        <ListingForm
                          onSuccess={() => { setEditListing(null); load(); }}
                          token={token}
                          clubId={clubId}
                          existing={listing}
                        />
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="text-xs h-7 px-2">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Slett annonse?</AlertDialogTitle>
                          <AlertDialogDescription>Dette kan ikke angres.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Avbryt</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteListing(listing.id)} className="bg-destructive text-destructive-foreground">Slett</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
