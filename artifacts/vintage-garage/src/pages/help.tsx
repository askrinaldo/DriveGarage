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
import { useTranslation } from "react-i18next";

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

export default function Help() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { isAuthenticated, getAuthHeaders } = useUserAuth();
  const { toast } = useToast();

  const CATEGORY_LABELS: Record<string, string> = {
    feil: t("help.catBug"),
    spørsmål: t("help.catQuestion"),
    annet: t("help.catOther"),
  };

  const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
    low: { label: t("help.prioLow"), color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
    medium: { label: t("help.prioMedium"), color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
    high: { label: t("help.prioHigh"), color: "text-red-400 bg-red-500/15 border-red-500/30" },
  };

  const TICKET_STATUS: Record<string, { label: string; icon: typeof Clock; color: string }> = {
    open: { label: t("help.statusOpen"), icon: Clock, color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
    answered: { label: t("help.statusAnswered"), icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
    closed: { label: t("help.statusClosed"), icon: XCircle, color: "text-muted-foreground bg-muted/20 border-border" },
  };

  const SUGGESTION_STATUS: Record<string, { label: string; color: string }> = {
    pending: { label: t("help.sugPending"), color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
    reviewed: { label: t("help.sugReviewed"), color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
    implemented: { label: t("help.sugImplemented"), color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" },
    declined: { label: t("help.sugDeclined"), color: "text-muted-foreground bg-muted/20 border-border" },
  };

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<number | null>(null);

  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketTitle, setTicketTitle] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketCategory, setTicketCategory] = useState("annet");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [sugTitle, setSugTitle] = useState("");
  const [sugDesc, setSugDesc] = useState("");
  const [sugPriority, setSugPriority] = useState("medium");
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingTickets(true);
    const headers = await getAuthHeaders();
    const res = await fetch("/api/support/tickets", { headers });
    if (res.ok) setTickets(await res.json() as SupportTicket[]);
    setLoadingTickets(false);
  }, [isAuthenticated, getAuthHeaders]);

  const loadSuggestions = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingSuggestions(true);
    const headers = await getAuthHeaders();
    const res = await fetch("/api/suggestions", { headers });
    if (res.ok) setSuggestions(await res.json() as Suggestion[]);
    setLoadingSuggestions(false);
  }, [isAuthenticated, getAuthHeaders]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadTickets();
      void loadSuggestions();
    }
  }, [isAuthenticated, loadTickets, loadSuggestions]);

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingTicket(true);
    const authHeaders = await getAuthHeaders();
    const res = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ title: ticketTitle, description: ticketDesc, category: ticketCategory }),
    });
    setSubmittingTicket(false);
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      toast({ title: t("common.error"), description: data.error ?? t("help.errorTicket"), variant: "destructive" });
      return;
    }
    toast({ title: t("help.ticketSent"), description: t("help.ticketSentDesc") });
    setShowTicketForm(false);
    setTicketTitle(""); setTicketDesc(""); setTicketCategory("annet");
    void loadTickets();
  }

  async function submitSuggestion(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingSuggestion(true);
    const authHeaders = await getAuthHeaders();
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ title: sugTitle, description: sugDesc, priority: sugPriority }),
    });
    setSubmittingSuggestion(false);
    if (!res.ok) {
      const data = await res.json() as { error?: string };
      toast({ title: t("common.error"), description: data.error ?? t("help.errorSuggestion"), variant: "destructive" });
      return;
    }
    toast({ title: t("help.suggestionSent"), description: t("help.suggestionSentDesc") });
    setShowSuggestionForm(false);
    setSugTitle(""); setSugDesc(""); setSugPriority("medium");
    void loadSuggestions();
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <div className="bg-primary/20 p-2.5 rounded-lg">
          <HelpCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("help.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("help.subtitle")}</p>
        </div>
      </div>

      {!isAuthenticated && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">{t("help.loginRequired")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("help.loginRequiredDesc").split("logge inn")[0]}
                <button onClick={() => navigate("/login")} className="text-primary hover:underline">
                  logge inn
                </button>
                {t("help.loginRequiredDesc").split("logge inn")[1]}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="tickets">
        <TabsList>
          <TabsTrigger value="tickets">
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            {t("help.tabTickets")}
            {tickets.filter(t => t.status !== "closed").length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">
                {tickets.filter(tk => tk.status !== "closed").length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="suggestions">
            <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
            {t("help.tabSuggestions")}
            {suggestions.length > 0 && (
              <span className="ml-1.5 bg-muted text-muted-foreground text-[10px] rounded-full px-1.5 py-0.5">
                {suggestions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Support tickets tab */}
        <TabsContent value="tickets" className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {tickets.length === 0
                ? t("help.noTickets")
                : t("help.ticketCount").replace("{{count}}", String(tickets.length))}
            </p>
            {isAuthenticated && (
              <Button
                size="sm"
                onClick={() => setShowTicketForm(!showTicketForm)}
                variant={showTicketForm ? "outline" : "default"}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {t("help.newTicket")}
              </Button>
            )}
          </div>

          {showTicketForm && (
            <Card className="border-primary/30">
              <CardContent className="pt-5">
                <form onSubmit={submitTicket} className="space-y-4">
                  <h3 className="font-semibold text-sm">{t("help.newTicketForm")}</h3>
                  <div className="space-y-1.5">
                    <Label htmlFor="ticket-title">{t("help.ticketTitleLabel")}</Label>
                    <Input
                      id="ticket-title"
                      placeholder={t("help.ticketTitlePlaceholder")}
                      value={ticketTitle}
                      onChange={(e) => setTicketTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ticket-cat">{t("help.categoryLabel")}</Label>
                    <Select value={ticketCategory} onValueChange={setTicketCategory}>
                      <SelectTrigger id="ticket-cat">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feil">{t("help.catBug")}</SelectItem>
                        <SelectItem value="spørsmål">{t("help.catQuestion")}</SelectItem>
                        <SelectItem value="annet">{t("help.catOther")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ticket-desc">{t("help.descLabel")}</Label>
                    <Textarea
                      id="ticket-desc"
                      placeholder={t("help.descPlaceholder")}
                      value={ticketDesc}
                      onChange={(e) => setTicketDesc(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={submittingTicket} size="sm">
                      {submittingTicket && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                      {t("help.sendTicket")}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowTicketForm(false)}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {loadingTickets && (
            <div className="text-center py-8 text-muted-foreground text-sm">{t("help.loadingTickets")}</div>
          )}

          {!loadingTickets && tickets.length === 0 && isAuthenticated && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t("help.noTicketsYet")}</p>
              <p className="text-xs mt-1">{t("help.noTicketsHint")}</p>
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
                            <p className="text-xs font-semibold text-primary mb-1.5">{t("help.adminReply")}</p>
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

        {/* Suggestions tab */}
        <TabsContent value="suggestions" className="mt-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {suggestions.length === 0
                ? t("help.noSuggestions")
                : t("help.suggestionCount").replace("{{count}}", String(suggestions.length))}
            </p>
            {isAuthenticated && (
              <Button
                size="sm"
                onClick={() => setShowSuggestionForm(!showSuggestionForm)}
                variant={showSuggestionForm ? "outline" : "default"}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                {t("help.newSuggestion")}
              </Button>
            )}
          </div>

          {showSuggestionForm && (
            <Card className="border-primary/30">
              <CardContent className="pt-5">
                <form onSubmit={submitSuggestion} className="space-y-4">
                  <h3 className="font-semibold text-sm">{t("help.newSuggestionForm")}</h3>
                  <div className="space-y-1.5">
                    <Label htmlFor="sug-title">{t("help.ticketTitleLabel")}</Label>
                    <Input
                      id="sug-title"
                      placeholder={t("help.sugTitlePlaceholder")}
                      value={sugTitle}
                      onChange={(e) => setSugTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sug-priority">{t("help.priorityLabel")}</Label>
                    <Select value={sugPriority} onValueChange={setSugPriority}>
                      <SelectTrigger id="sug-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">{t("help.prioLow")}</SelectItem>
                        <SelectItem value="medium">{t("help.prioMedium")}</SelectItem>
                        <SelectItem value="high">{t("help.prioHigh")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sug-desc">{t("help.descLabel")}</Label>
                    <Textarea
                      id="sug-desc"
                      placeholder={t("help.sugDescPlaceholder")}
                      value={sugDesc}
                      onChange={(e) => setSugDesc(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={submittingSuggestion} size="sm">
                      {submittingSuggestion && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                      {t("help.sendSuggestion")}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowSuggestionForm(false)}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {loadingSuggestions && (
            <div className="text-center py-8 text-muted-foreground text-sm">{t("help.loadingSuggestions")}</div>
          )}

          {!loadingSuggestions && suggestions.length === 0 && isAuthenticated && (
            <div className="text-center py-12 text-muted-foreground">
              <Lightbulb className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t("help.noSuggestionsYet")}</p>
              <p className="text-xs mt-1">{t("help.noSuggestionsHint")}</p>
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
                            {prio.label} {t("help.prioritySuffix")}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] ${status.color}`}>
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{sug.description}</p>
                        {sug.adminNote && (
                          <div className="mt-2 bg-primary/8 border border-primary/20 rounded p-2">
                            <p className="text-xs font-semibold text-primary mb-0.5">{t("help.adminNote")}</p>
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
