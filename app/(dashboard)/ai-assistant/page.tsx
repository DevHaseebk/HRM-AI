"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  ClipboardCopy,
  Database,
  Info,
  Loader2,
  SendHorizonal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { PageWrapper } from "@/components/shared/page-wrapper";
import { AiAssistantTabs } from "@/components/shared/ai-assistant-tabs";
import { useAuthUser } from "@/components/shared/auth-provider";
import { getClientAuthHeaders } from "@/lib/company-scope";
import { useToast } from "@/components/shared/toast-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  matchedEmployee?: string | null;
  createdAt: string;
}

interface ChatApiResponse {
  reply?: string;
  suggestions?: string[];
  matchedEmployee?: string | null;
  error?: string;
}

interface HistoryRow {
  id: string;
  role: "user" | "model";
  message: string;
  created_at: string;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Assalam-o-Alaikum! I'm your HRFlow AI Assistant. I'm connected to your company database, so I can answer questions about your employees, attendance, leaves, payroll, hiring and more.\n\nTry one of the quick prompts on the right, or ask me anything in English or Roman Urdu.",
  suggestions: [
    "Aaj kaun absent hai?",
    "Pending leaves dikhao",
    "Kitne open positions hain?",
  ],
  createdAt: new Date().toISOString(),
};

const QUICK_PROMPTS = [
  { label: "Employee details", prompt: "Kamal ki full detail batao" },
  { label: "Today's absentees", prompt: "Aaj kaun absent hai?" },
  { label: "Pending leaves", prompt: "Pending leaves dikhao" },
  { label: "Monthly payroll", prompt: "Is month ki payroll summary do" },
  { label: "Open positions", prompt: "Kitne open positions hain?" },
  { label: "Last hired", prompt: "Last hired employee kaun tha?" },
  { label: "Attendance anomalies", prompt: "Show attendance anomalies" },
  { label: "This month's HR report", prompt: "Generate this month's HR report" },
  { label: "Churn risk", prompt: "Who is at churn risk?" },
  { label: "Offer letter", prompt: "Generate an offer letter for a Senior React Developer with PKR 350,000 salary" },
  { label: "Interview kit", prompt: "Create interview questions for a React Developer" },
];

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, yest)) return "Yesterday";
  return d.toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long" });
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function MessageBubble({
  msg,
  onCopy,
  onSuggestion,
  busy,
}: {
  msg: Message;
  onCopy: (text: string) => void;
  onSuggestion: (text: string) => void;
  busy: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const handleCopy = () => {
    onCopy(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("group flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="h-3.5 w-3.5" />
        </div>
      )}
      <div className={cn("max-w-[78%]", isUser ? "items-end" : "items-start", "flex flex-col gap-1.5")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm border bg-muted/70"
          )}
        >
          {msg.content || <span className="text-muted-foreground italic">…</span>}
        </div>

        {!isUser && msg.matchedEmployee && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Database className="h-3 w-3" />
            Looked up <span className="font-medium text-foreground">{msg.matchedEmployee}</span>
          </div>
        )}

        {!isUser && msg.content && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 self-start rounded px-1.5 py-0.5 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
          >
            {copied ? (
              <><Check className="h-3 w-3 text-emerald-500" /> Copied</>
            ) : (
              <><ClipboardCopy className="h-3 w-3" /> Copy</>
            )}
          </button>
        )}

        {!isUser && msg.suggestions && msg.suggestions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {msg.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestion(s)}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary transition-all hover:scale-[1.03] hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="my-2 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="rounded-full bg-muted/70 px-3 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export default function AIAssistantPage() {
  const user = useAuthUser();
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load history from DB on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/ai-chat/history?userId=${encodeURIComponent(user.id)}`,
          { headers: getClientAuthHeaders() }
        );
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(json.messages) && json.messages.length > 0) {
          const restored: Message[] = json.messages.map((row: HistoryRow) => ({
            id: row.id,
            role: row.role === "user" ? "user" : "assistant",
            content: row.message,
            createdAt: row.created_at,
          }));
          setMessages([WELCOME, ...restored]);
        }
      } catch {
        // ignore — keep welcome only
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const persist = useCallback(
    async (role: "user" | "model", message: string) => {
      try {
        await fetch("/api/ai-chat/history", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
          body: JSON.stringify({ userId: user.id, role, message }),
        });
      } catch {
        // best effort — do not block chat on persistence failure
      }
    },
    [user.id]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;

      setInput("");
      setNoKey(false);

      const nowISO = new Date().toISOString();
      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content,
        createdAt: nowISO,
      };
      const assistantId = `a-${Date.now()}`;

      const conversationHistory = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role === "user" ? "user" : ("model" as const),
          parts: [{ text: m.content }],
        }));

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "", createdAt: nowISO },
      ]);
      setBusy(true);

      // Fire & forget — persist user message to DB
      void persist("user", content);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getClientAuthHeaders() },
          body: JSON.stringify({
            message: content,
            conversationHistory,
            userRole: user.role,
            userName: user.name,
          }),
          signal: abortRef.current.signal,
        });

        const data = (await res.json().catch(() => ({}))) as ChatApiResponse;

        if (!res.ok) {
          if (data.error?.includes("GEMINI_API_KEY") || res.status === 500) {
            setNoKey(true);
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      data.error ??
                      "Sorry, I couldn't process that request. Please try again.",
                  }
                : m
            )
          );
          return;
        }

        const replyText = data.reply ?? "(empty response)";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: replyText,
                  suggestions: data.suggestions ?? [],
                  matchedEmployee: data.matchedEmployee ?? null,
                }
              : m
          )
        );
        void persist("model", replyText);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "Connection error. Please try again." }
                : m
            )
          );
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [messages, busy, user.role, user.name, persist]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = async () => {
    if (!confirm("Clear all chat history? This will delete it permanently from the database.")) {
      return;
    }
    abortRef.current?.abort();
    setBusy(false);
    setMessages([WELCOME]);
    setNoKey(false);
    try {
      await fetch(
        `/api/ai-chat/history?userId=${encodeURIComponent(user.id)}`,
        { method: "DELETE" }
      );
      toast.success("Chat history cleared");
    } catch {
      toast.error("Couldn't clear server-side history");
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  // Group messages by day for separators
  const groups: { dayKey: string; label: string; items: Message[] }[] = [];
  for (const m of messages) {
    const key = dayKey(m.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.dayKey === key) last.items.push(m);
    else groups.push({ dayKey: key, label: formatDateLabel(m.createdAt), items: [m] });
  }

  return (
    <PageWrapper>
      <div className="space-y-4">
        <AiAssistantTabs />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* Chat panel */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">HR AI Assistant</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Connected to your HR database · {user.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {busy && (
                  <Badge variant="secondary" className="animate-pulse text-[11px]">
                    AI is thinking…
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear History
                </Button>
              </div>
            </div>

            {noKey && (
              <div className="flex items-center gap-2 border-b bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                <X className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>GEMINI_API_KEY</strong> is missing or invalid. Add it to{" "}
                  <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/40">.env.local</code> and
                  restart the dev server.
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-4">
                {historyLoading ? (
                  <div className="space-y-3">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading history…
                    </p>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={i % 2 === 0 ? "flex flex-row-reverse" : "flex"}>
                        <Skeleton className="h-12 w-2/3 rounded-2xl" />
                      </div>
                    ))}
                  </div>
                ) : (
                  groups.map((group) => (
                    <Fragment key={group.dayKey}>
                      <DateSeparator label={group.label} />
                      <div className="space-y-4">
                        {group.items.map((msg) => (
                          <MessageBubble
                            key={msg.id}
                            msg={msg}
                            onCopy={copyText}
                            onSuggestion={sendMessage}
                            busy={busy}
                          />
                        ))}
                      </div>
                    </Fragment>
                  ))
                )}

                {busy && messages[messages.length - 1]?.content === "" && (
                  <div className="flex gap-2">
                    <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="rounded-2xl rounded-tl-sm border bg-muted/70 px-4 py-3">
                        <span className="flex gap-1">
                          <span className="animate-bounce [animation-delay:0ms]">●</span>
                          <span className="animate-bounce [animation-delay:150ms]">●</span>
                          <span className="animate-bounce [animation-delay:300ms]">●</span>
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Looking up data…</p>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="border-t p-3">
              <div className="flex gap-2">
                <Textarea
                  ref={inputRef}
                  placeholder="Ask anything about your HR data… (Shift+Enter for new line)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  className="min-h-0 resize-none text-sm"
                  disabled={busy}
                />
                <div className="flex flex-col gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => sendMessage(input)}
                    disabled={busy || !input.trim()}
                    loading={busy}
                    className="h-full px-3"
                  >
                    {!busy && <SendHorizonal className="h-4 w-4" />}
                  </Button>
                  {busy && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abortRef.current?.abort()}
                      className="h-7 px-2"
                      title="Stop"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Info className="h-3 w-3" />
                AI responses are based on your company database. Always verify critical decisions.
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-64 shrink-0 space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Quick Prompts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.label}
                    onClick={() => sendMessage(qp.prompt)}
                    disabled={busy}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-left text-xs transition-all hover:scale-[1.01] hover:bg-muted hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronDown className="mr-1.5 inline h-3 w-3 -rotate-90 text-muted-foreground" />
                    {qp.label}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <Database className="h-4 w-4 text-primary" />
                  I can answer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                {[
                  "Employee profiles & details",
                  "Daily / monthly attendance",
                  "Leave requests & status",
                  "Payroll summaries (HR only)",
                  "Open jobs & applicants",
                  "Performance reviews",
                  "Recent hires & announcements",
                ].map((item) => (
                  <p
                    key={item}
                    className="flex items-start gap-1.5 text-xs text-muted-foreground"
                  >
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                    {item}
                  </p>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
