import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Building2 } from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";

export default function TenantNew() {
  const [, navigate] = useLocation();
  const { token, switchTenant } = useUserAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-token": token ?? "" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (res.ok) {
      const tenant = await res.json() as { id: number; name: string };
      await switchTenant(tenant.id);
      navigate("/vehicles");
    } else {
      const err = await res.json() as { error: string };
      setError(err.error ?? "Noe gikk galt");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Opprett organisasjon</CardTitle>
          <CardDescription>
            En organisasjon lar deg dele garasjen med andre brukere. Alle medlemmer kan se og redigere de samme kjøretøyene.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Navn på organisasjon</Label>
            <Input
              placeholder="F.eks. «Klassebil AS» eller «Norsk Veteranbilklubb»"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? "Oppretter..." : "Opprett organisasjon"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
