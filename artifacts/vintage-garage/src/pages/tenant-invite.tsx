import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CheckCircle2, XCircle, LogIn } from "lucide-react";
import { useUserAuth } from "@/hooks/use-user-auth";

interface InviteInfo {
  id: number;
  email: string;
  role: string;
  tenantName: string;
  tenantId: number;
  expiresAt: string;
}

export default function TenantInvite() {
  const params = useParams<{ code: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated, token, switchTenant } = useUserAuth();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/tenants/invite/${params.code}`);
      if (res.ok) setInvite(await res.json() as InviteInfo);
      else {
        const err = await res.json() as { error: string };
        setError(err.error ?? "Invitasjonen er ugyldig");
      }
      setLoading(false);
    })();
  }, [params.code]);

  async function handleAccept() {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/tenant-invite/${params.code}`);
      return;
    }
    setAccepting(true);
    const res = await fetch(`/api/tenants/invite/${params.code}/accept`, {
      method: "POST",
      headers: { "x-user-token": token ?? "" },
    });
    if (res.ok) {
      const data = await res.json() as { tenantId: number; role: string };
      await switchTenant(data.tenantId);
      setAccepted(true);
    } else {
      const err = await res.json() as { error: string };
      setError(err.error ?? "Aksept feilet");
    }
    setAccepting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Laster invitasjon...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            {accepted ? <CheckCircle2 className="w-7 h-7 text-green-500" /> :
             error ? <XCircle className="w-7 h-7 text-destructive" /> :
             <Building2 className="w-7 h-7 text-primary" />}
          </div>
          <CardTitle className="text-xl">
            {accepted ? "Velkommen!" :
             error ? "Invitasjon ugyldig" :
             "Du er invitert"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {accepted ? (
            <>
              <p className="text-sm text-muted-foreground">
                Du er nå lagt til i <strong>{invite?.tenantName}</strong> og har blitt byttet til denne garasjen.
              </p>
              <Button className="w-full" onClick={() => navigate("/vehicles")}>
                Gå til garasjen
              </Button>
            </>
          ) : error ? (
            <>
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
                Til dashbordet
              </Button>
            </>
          ) : invite && (
            <>
              <p className="text-sm text-muted-foreground">
                Du er invitert til å bli med i garasjen{" "}
                <strong className="text-foreground">«{invite.tenantName}»</strong>{" "}
                som <strong>{invite.role === "admin" ? "admin" : "medlem"}</strong>.
              </p>
              <p className="text-xs text-muted-foreground">
                Invitasjonen utløper {new Date(invite.expiresAt).toLocaleDateString("nb-NO")}.
              </p>
              {!isAuthenticated ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Du må være innlogget for å akseptere.</p>
                  <Button className="w-full gap-2" onClick={handleAccept}>
                    <LogIn className="w-4 h-4" />
                    Logg inn og aksepter
                  </Button>
                </div>
              ) : (
                <Button className="w-full" onClick={handleAccept} disabled={accepting}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {accepting ? "Aksepterer..." : "Aksepter invitasjon"}
                </Button>
              )}
              <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate("/dashboard")}>
                Avvis
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
