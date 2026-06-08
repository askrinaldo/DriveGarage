import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, ExternalLink, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { getUserToken } from "@/hooks/use-user-auth";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "vg-chat-history";
const MAX_MESSAGES = 20;

const WELCOME: Message = {
  role: "assistant",
  content: "Hei! Jeg er GaragePilot-assistenten 🔧 Jeg kan hjelpe deg med kjøretøy, servicelogg, klubber og mer. Hva lurer du på?",
};

function loadLocalHistory(): Message[] | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Message[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveLocalHistory(messages: Message[]) {
  try {
    const trimmed = messages.slice(-MAX_MESSAGES);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // sessionStorage unavailable
  }
}

function clearLocalHistory() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function messageKey(m: Message) {
  return `${m.role}:${m.content}`;
}

function authHeaders(): Record<string, string> {
  const token = getUserToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["x-user-token"] = token;
  return headers;
}

async function fetchServerHistory(): Promise<Message[] | null> {
  const token = getUserToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/chat-history", {
      headers: { "x-user-token": token },
    });
    if (!res.ok) return null;
    const data = await res.json() as { messages: Message[] };
    return data.messages;
  } catch {
    return null;
  }
}

async function backfillMessageToServer(msg: Message): Promise<void> {
  try {
    await fetch("/api/chat-history", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ role: msg.role, content: msg.content }),
    });
  } catch {
    // best-effort
  }
}

async function deleteServerHistory(): Promise<void> {
  const token = getUserToken();
  if (!token) return;
  try {
    await fetch("/api/chat-history", {
      method: "DELETE",
      headers: { "x-user-token": token },
    });
  } catch {
    // ignore
  }
}

/**
 * Merges local sessionStorage history with server history.
 * Server is the source of truth; any messages present locally but
 * absent from the server (e.g. due to a previous network failure)
 * are appended and backfilled to the server.
 * Returns the merged list trimmed to MAX_MESSAGES.
 */
async function mergeAndSync(serverHistory: Message[], localHistory: Message[]): Promise<Message[]> {
  const serverKeys = new Set(serverHistory.map(messageKey));

  // Identify local messages the server doesn't have (unsynced)
  const localOnly = localHistory.filter((m) => !serverKeys.has(messageKey(m)));

  if (localOnly.length === 0) {
    return serverHistory;
  }

  // Append unsynced local messages and trim to cap
  const merged = [...serverHistory, ...localOnly].slice(-MAX_MESSAGES);

  // Backfill unsynced messages to server so it becomes the source of truth
  for (const msg of localOnly) {
    await backfillMessageToServer(msg);
  }

  return merged;
}

function renderContent(content: string, navigate: (path: string) => void) {
  const parts = content.split(/(\[.+?\]\(\/[^)]+\))/g);
  return parts.map((part, i) => {
    const match = /^\[(.+?)\]\((\/[^)]+)\)$/.exec(part);
    if (match) {
      return (
        <button
          key={i}
          onClick={() => navigate(match[2])}
          className="inline-flex items-center gap-1 text-primary underline hover:opacity-80 transition-opacity"
        >
          {match[1]}
          <ExternalLink className="w-3 h-3" />
        </button>
      );
    }
    return (
      <span key={i} className="whitespace-pre-wrap">
        {part.replace(/\*\*(.+?)\*\*/g, "$1")}
      </span>
    );
  });
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!open || historyLoaded) return;

    async function loadHistory() {
      const local = loadLocalHistory();
      const serverHistory = await fetchServerHistory();

      if (!serverHistory) {
        // Unauthenticated or server error — use local cache only
        if (local) setMessages(local);
        setHistoryLoaded(true);
        return;
      }

      // Server responded — merge with local state to capture any unsynced messages
      const welcomeOnlyServer =
        serverHistory.length === 1 && serverHistory[0]?.role === "assistant";
      const hasLocalContent = local && local.length > 0 && !(local.length === 1 && local[0]?.role === "assistant");

      let final: Message[];
      if (hasLocalContent && !welcomeOnlyServer) {
        // Both sides have real content — merge and backfill
        final = await mergeAndSync(serverHistory, local!);
      } else if (hasLocalContent && welcomeOnlyServer) {
        // Server only has welcome (fresh account) — backfill local messages
        final = await mergeAndSync(serverHistory, local!);
      } else {
        // No meaningful local content — server is source of truth
        final = serverHistory;
      }

      setMessages(final);
      saveLocalHistory(final);
      setHistoryLoaded(true);
    }

    void loadHistory();
  }, [open, historyLoaded]);

  useEffect(() => {
    if (historyLoaded) {
      saveLocalHistory(messages);
    }
  }, [messages, historyLoaded]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const clearHistory = useCallback(async () => {
    setMessages([WELCOME]);
    clearLocalHistory();
    await deleteServerHistory();
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.ok) {
        const data = await res.json() as { reply: string };
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Beklager, noe gikk galt. Prøv igjen eller [opprett en supportsak](/help).",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Klarte ikke å koble til. Sjekk nettverksforbindelsen eller [opprett en supportsak](/help).",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Chat window */}
      {open && (
        <div className="w-80 sm:w-96 flex flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          style={{ height: "460px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Garage-assistenten</p>
                <p className="text-[10px] text-muted-foreground">AI-hjelp for GaragePilot</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Popover open={confirmClear} onOpenChange={setConfirmClear}>
                <PopoverTrigger asChild>
                  <button
                    className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    title="Ny samtale"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-56 p-3">
                  <p className="text-sm font-medium mb-1">Slette samtalen?</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Hele chathistorikken slettes permanent.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setConfirmClear(false)}
                    >
                      Avbryt
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setConfirmClear(false);
                        void clearHistory();
                      }}
                    >
                      Slett
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!historyLoaded && (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {historyLoaded && messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2 items-start",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    msg.role === "user"
                      ? "bg-primary/20"
                      : "bg-muted"
                  )}
                >
                  {msg.role === "user" ? (
                    <User className="w-3 h-3 text-primary" />
                  ) : (
                    <Bot className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[76%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {renderContent(msg.content, navigate)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Bot className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-border flex gap-2 items-center">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Still et spørsmål..."
              disabled={loading}
              className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground disabled:opacity-50"
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => void send()}
              disabled={!input.trim() || loading}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-13 h-13 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95",
          open && "rotate-0"
        )}
        style={{ width: "52px", height: "52px" }}
        title="Åpne chat-assistent"
      >
        {open ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageCircle className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
