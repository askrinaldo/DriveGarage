import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetClubInvitation,
  useAcceptClubInvitation,
  useDeclineClubInvitation,
  getGetClubInvitationQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Bike, Users, Clock, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Params { code: string }

const typeLabel: Record<string, string> = {
  car: "Bilklubb",
  motorcycle: "Motorsykkelklubb",
  both: "Bil- og motorsykkelklubb",
};

const TypeIcon = ({ type }: { type: string }) => {
  if (type === "car") return <Car className="w-5 h-5" />;
  if (type === "motorcycle") return <Bike className="w-5 h-5" />;
  return <Users className="w-5 h-5" />;
};

function formatExpiry(date: string) {
  return new Date(date).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ClubInvite() {
  const params = useParams<Params>();
  const { code } = params;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [memberName, setMemberName] = useState("");
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  const { data: invitation, isLoading, isError } = useGetClubInvitation(code, {
    query: { queryKey: getGetClubInvitationQueryKey(code) },
  });

  const acceptMutation = useAcceptClubInvitation();
  const declineMutation = useDeclineClubInvitation();
  const isSubmitting = acceptMutation.isPending || declineMutation.isPending;

  async function handleAccept() {
    if (!memberName.trim()) {
      toast({ title: "Navn er påkrevd", variant: "destructive" });
      return;
    }
    try {
      await acceptMutation.mutateAsync({ code, data: { memberName: memberName.trim() } });
      setDone("accepted");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast({ title: msg ?? "Noe gikk galt", variant: "destructive" });
    }
  }

  async function handleDecline() {
    try {
      await declineMutation.mutateAsync({ code, data: { memberName: memberName.trim() || "Ukjent" } });
      setDone("declined");
    } catch {
      toast({ title: "Noe gikk galt", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Invitasjon ikke funnet</h2>
            <p className="text-muted-foreground">
              Denne invitasjonslenken er ugyldig eller har blitt slettet.
            </p>
            <Button onClick={() => navigate("/clubs")}>Til klubber</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = invitation.status === "expired";
  const isUsed = invitation.status === "accepted" || invitation.status === "declined";
  const isRevoked = invitation.status === "revoked";
  const isInvalid = isExpired || isUsed || isRevoked;

  if (done === "accepted") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold">Velkommen!</h2>
            <p className="text-muted-foreground">
              Du er nå medlem av <strong>{invitation.clubName}</strong>.
            </p>
            <Button onClick={() => navigate(`/clubs/${invitation.clubId}`)}>
              Gå til klubben
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">Invitasjon avslått</h2>
            <p className="text-muted-foreground">Du takket nei til å bli med i {invitation.clubName}.</p>
            <Button variant="outline" onClick={() => navigate("/clubs")}>Til klubber</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        {/* Club card */}
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center">
            <TypeIcon type={invitation.clubType} />
          </div>
          <CardHeader className="pt-4 pb-2">
            <div className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
              {typeLabel[invitation.clubType] ?? invitation.clubType}
            </div>
            <CardTitle className="text-2xl">{invitation.clubName}</CardTitle>
          </CardHeader>
          <CardContent className="pb-5 space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong>{invitation.createdBy}</strong> har invitert deg til å bli med i denne klubben på DriveGarage.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0" />
              {isExpired
                ? <span className="text-destructive">Utløpt {formatExpiry(invitation.expiresAt)}</span>
                : <span>Gyldig til {formatExpiry(invitation.expiresAt)}</span>
              }
            </div>
          </CardContent>
        </Card>

        {isInvalid ? (
          <Card>
            <CardContent className="py-6 text-center space-y-3">
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <p className="text-sm font-medium">
                {isExpired && "Denne invitasjonen har utløpt."}
                {isRevoked && "Denne invitasjonen er tilbakekalt."}
                {isUsed && "Denne invitasjonen er allerede brukt."}
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/clubs")}>
                Bla gjennom klubber
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bli med nå</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="memberName">Ditt navn</Label>
                <Input
                  id="memberName"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Ola Nordmann"
                  onKeyDown={(e) => e.key === "Enter" && handleAccept()}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={handleAccept}
                  disabled={isSubmitting || !memberName.trim()}
                >
                  {acceptMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Godta invitasjon
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  disabled={isSubmitting}
                >
                  {declineMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Avslå
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
