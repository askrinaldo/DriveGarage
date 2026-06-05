import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, Loader2, AlertCircle } from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";
import { useTheme } from "@/contexts/theme";

export default function Register() {
  const [, navigate] = useLocation();
  const { register } = useUserAuth();
  const { applyServerTheme } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    applyServerTheme(result.themePrefs.themeAccent, result.themePrefs.themeMode);
    navigate("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="bg-primary/20 p-3 rounded-xl">
              <Wrench className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Vintage Garage</h1>
          <p className="text-sm text-muted-foreground mt-1">Opprett ny konto</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="name">Navn</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ola Nordmann"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="din@epost.no"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Passord</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minst 6 tegn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Registrer deg
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Har du allerede konto?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Logg inn
          </Link>
        </p>
      </div>
    </div>
  );
}
