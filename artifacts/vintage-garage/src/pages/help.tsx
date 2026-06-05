import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUserAuth } from "@/hooks/use-user-auth";
import {
  HelpCircle, MessageSquare, Lightbulb, Plus, ChevronDown, ChevronUp,
  AlertCircle, Clock, CheckCircle2, XCircle, Loader2,
} from "lucide-react";

interface SupportTicket {
  id: number;
  title: string;
  description: string;
  category: "feil" | "spørsmål" | "annet";
  status: "open" | "answered" | "closed";
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

interface Suggestion {
  id: number;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "reviewed" | "implemented" | "declined";
  adminNote: string | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  feil: "Feil/Bug",
  spørsmål: "Spørsmål",
  annet: "Annet",
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "Lav", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  medium: { label: "Medium", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
  high: { label: "Høy", color: "text-red-400 bg-red-500/15 border-red-500/30" },
};

const TICKET_STATUS: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  open: { label: "Åpen", icon: Clock, color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  answered: { label: "Besvart", icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
  closed: { label: "Lukket", icon: XCircle, color: "text-muted-foreground bg-muted/20 border-border" },
};

const SUGGESTION_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Venter", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  reviewed: { label: "Vurdert", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
  implemented: { label: "Implementert", color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
  declined: { label: "Avslått", color: "text-muted-foreground bg-muted/20 border-border" },
};

export default function Help() {
  const [, navigate] = useLocation();
  const { isAuthenticated, token } = useUserAuth();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<number | null>(null);

  // New ticket form
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketCategory, setTicketCategory] = useState("annet");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // New suggestion form
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [sugTitle, setSugTitle] = useState("");
  const [sugDesc, setSugDesc] = useState("");
  const [sugPriority, setSugPriority] = useState("medium");
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  function authHeaders(): Record<string, string> {
    return token ? { "x-user-token": token } : {};
  }

  const loadTickets = useCallback(async () => {
    if (!token) return;
    setLoadingTickets(true);
    const res = await fetch("/api/support/tickets", { headers: authHeaders() });
    if (res.ok) setTickets(await res.json() as SupportTicket[]);
    setLoadingTickets(false);
  }, [token]);

  const loadSuggestions = useCallback(async () => {
    if (!token) return;
    setLoadingSuggestions(true);
    const res = await fetch("/api/suggestions", { headers: authHeaders() });
    if (res.ok) setSuggestions(await res.json() as Suggestion[]);
    setLoadingSuggestions(false);
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadTickets();
      void loadSuggestions();
    }
  }, [isAuthenticated, loadTickets, loadSuggestions]);

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingTicket(true);
    const res = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ title: ticketTitle, description: ticketDesc, category: ticketCategory }),
    });
    setSubmittingTicket(false);
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      toast({ title: "Feil", description: data.error ?? "Kunne ikke opprette sak", variant: "destructive" });
      return;
    }
    toast({ title: "Sak sendt!", description: "Vi svarer så snart vi kan." });
    setShowTicketForm(false);
    setTicketTitle(""); setTicketDesc(""); setTicketCategory("annet");
    void loadTickets();
  }

  async function submitSuggestion(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingSuggestion(true);
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ title: sugTitle, description: sugDesc, priority: sugPriority }),
    });
    setSubmittingSuggestion(false);
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      toast({ title: "Feil", description: data.error ?? "Kunne ikke sende forslag", variant: "destructive" });
      return;
    }
    toast({ title: "Forslag sendt!", description: "Takk for tilbakemeldingen din." });
    setShowSuggestionForm(false);
    setSugTitle(""); setSugDesc(""); setSugPriority("medium");
    void loadSuggestions();
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/20 p-2.5 rounded-lg">
          <HelpCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hjelp og støtte</h1>
          <p className="text-sm text-muted-foreground">Send inn supportsaker eller forbedringsforslag</p>
        </div>
      </div>

      {!isAuthenticated && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Innlogging kreves</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Du må{" "}
                <button onClick={() => navigate("/login")} className="text-primary hover:underline">
                  logge inn
                </button>{" "}
                for å sende inn saker og forslag.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            Supportsaker
            {tickets.filter(t => t.status !== "closed").length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">
                {tickets.filter(t => t.status !== "closed").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="suggestions">
            <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
            Forbedringsforslag
            {suggestions.length > 0 && (
              <span className="ml-1.5 bg-muted text-muted-foreground text-[10px] rounded-full px-1.5 py-0.5">
                {suggestions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Support tickets tab ─── */}
        <TabsContent value="tickets" className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {tickets.length === 0
                ? "Du har ingen åpne supportsaker"
                : `${tickets.length} sak${tickets.length !== 1 ? "er" : ""} totalt`}
            </p>
            {isAuthenticated && (
              <Button
                size="sm"
                onClick={() => setShowTicketForm(!showTicketForm)}
                variant={showTicketForm ? "outline" : "default"}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Ny sak
              </Button>
            )}
          </div>

          {showTicketForm && (
            <Card className="border-primary/30">
              <CardContent className="pt-5">
                <form onSubmit={submitTicket} className="space-y-4">
                  <h3 className="font-semibold text-sm">Ny supportsak</h3>
                  <div className="space-y-1.5">
                    <Label htmlFor="ticket-title">Tittel</Label>
                    <Input
                      id="ticket-title"
                      placeholder="Kort beskrivelse av problemet"
                      value={ticketTitle}
                      onChange={(e) => setTicketTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ticket-cat">Kategori</Label>
                    <Select value={ticketCategory} onValueChange={setTicketCategory}>
                      <SelectTrigger id="ticket-cat">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feil">Feil/Bug</SelectItem>
                        <SelectItem value="spørsmål">Spørsmål</SelectItem>
                        <SelectItem value="annet">Annet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ticket-desc">Beskrivelse</Label>
                    <Textarea
                      id="ticket-desc"
                      placeholder="Beskriv problemet i detalj..."
                      value={ticketDesc}
                      onChange={(e) => setTicketDesc(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={submittingTicket} size="sm">
                      {submittingTicket && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                      Send sak
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowTicketForm(false)}>
                      Avbryt
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {loadingTickets && (
            <div className="text-center py-8 text-muted-foreground text-sm">Laster saker...</div>
          )}

          {!loadingTickets && tickets.length === 0 && isAuthenticated && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ingen supportsaker ennå</p>
              <p className="text-xs mt-1">Trykk «Ny sak» for å komme i gang</p>
            </div>
          )}

          <div className="space-y-3">
            {tickets.map((ticket) => {
              const status = TICKET_STATUS[ticket.status]!;
              const StatusIcon = status.icon;
              const isExpanded = expandedTicket === ticket.id;

              return (
                <Card key={ticket.id} className={ticket.status === "closed" ? "opacity-70" : ""}>
                  <CardContent className="pt-4 pb-3">
                    <button
                      className="w-full text-left"
                      onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{ticket.title}</span>
                            <Badge variant="outline" className={`text-[10px] ${status.color}`}>
                              <StatusIcon className="w-2.5 h-2.5 mr-1" />
                              {status.label}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(ticket.createdAt).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 border-t border-border pt-3">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>

                        {ticket.adminReply && (
                          <div className="bg-primary/8 border border-primary/20 rounded-lg p-3">
                            <p className="text-xs font-semibold text-primary mb-1.5">Svar fra support</p>
                            <p className="text-sm whitespace-pre-wrap">{ticket.adminReply}</p>
                            {ticket.repliedAt && (
                              <p className="text-xs text-muted-foreground mt-1.5">
                                {new Date(ticket.repliedAt).toLocaleDateString("nb-NO")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── Suggestions tab ─── */}
        <TabsContent value="suggestions" className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {suggestions.length === 0
                ? "Du har ingen forbedringsforslag"
                : `${suggestions.length} forslag totalt`}
            </p>
            {isAuthenticated && (
              <Button
                size="sm"
                onClick={() => setShowSuggestionForm(!showSuggestionForm)}
                variant={showSuggestionForm ? "outline" : "default"}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Nytt forslag
              </Button>
            )}
          </div>

          {showSuggestionForm && (
            <Card className="border-primary/30">
              <CardContent className="pt-5">
                <form onSubmit={submitSuggestion} className="space-y-4">
                  <h3 className="font-semibold text-sm">Nytt forbedringsforslag</h3>
                  <div className="space-y-1.5">
                    <Label htmlFor="sug-title">Tittel</Label>
                    <Input
                      id="sug-title"
                      placeholder="Hva ønsker du å forbedre?"
                      value={sugTitle}
                      onChange={(e) => setSugTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sug-priority">Prioritet</Label>
                    <Select value={sugPriority} onValueChange={setSugPriority}>
                      <SelectTrigger id="sug-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Lav</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">Høy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sug-desc">Beskrivelse</Label>
                    <Textarea
                      id="sug-desc"
                      placeholder="Beskriv forbedringen du ønsker..."
                      value={sugDesc}
                      onChange={(e) => setSugDesc(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={submittingSuggestion} size="sm">
                      {submittingSuggestion && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                      Send forslag
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowSuggestionForm(false)}>
                      Avbryt
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {loadingSuggestions && (
            <div className="text-center py-8 text-muted-foreground text-sm">Laster forslag...</div>
          )}

          {!loadingSuggestions && suggestions.length === 0 && isAuthenticated && (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ingen forbedringsforslag ennå</p>
              <p className="text-xs mt-1">Trykk «Nytt forslag» for å komme i gang</p>
            </div>
          )}

          <div className="space-y-3">
            {suggestions.map((sug) => {
              const prio = PRIORITY_LABELS[sug.priority]!;
              const status = SUGGESTION_STATUS[sug.status]!;

              return (
                <Card key={sug.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-sm">{sug.title}</span>
                          <Badge variant="outline" className={`text-[10px] ${prio.color}`}>
                            {prio.label} prioritet
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] ${status.color}`}>
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{sug.description}</p>
                        {sug.adminNote && (
                          <div className="mt-2 bg-primary/8 border border-primary/20 rounded p-2">
                            <p className="text-xs font-semibold text-primary mb-0.5">Admin-notat</p>
                            <p className="text-xs text-muted-foreground">{sug.adminNote}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {new Date(sug.createdAt).toLocaleDateString("nb-NO")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
