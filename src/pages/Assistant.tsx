import { useState, useRef, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Send, Loader2, Bot, User, Trash2, Plus, MessageSquare, Menu,
  MapPin, Briefcase, Banknote,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow } from "date-fns";

type Msg = { role: "user" | "assistant"; content: string; sender_role?: string | null };
type Convo = { id: string; title: string; updated_at: string };
type Request = {
  id: string;
  trade_category: string;
  description: string;
  location_state: string | null;
  location_lga: string | null;
  budget_min: number | null;
  budget_max: number | null;
  status: string;
  agreed_price: number | null;
  agreed_timeline: string | null;
  admin_note: string | null;
  created_at: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot`;

const QUICK_REPLIES = [
  "I need a plumber in Lekki, Lagos",
  "I need an electrician and a painter",
  "What's the status of my requests?",
  "How does escrow work?",
];

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  new: { label: "Received", className: "bg-muted text-muted-foreground border-border" },
  admin_review: { label: "With Jobman team", className: "bg-warning/10 text-warning border-warning/30" },
  matched: { label: "Artisan matched", className: "bg-info/10 text-info border-info/30" },
  assigned: { label: "Assigned", className: "bg-primary/10 text-primary border-primary/30" },
  completed: { label: "Completed", className: "bg-primary/10 text-primary border-primary/30" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border" },
};

const Assistant = () => {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Convo[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const booted = useRef(false);

  const loadRequests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("artisan_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRequests((data ?? []) as Request[]);
  }, [user]);

  const loadMessages = useCallback(async (convoId: string) => {
    setLoadingHistory(true);
    setConversationId(convoId);
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content, sender_role")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true });
    setMessages(
      (data ?? []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        sender_role: m.sender_role,
      })),
    );
    setLoadingHistory(false);
    setShowSidebar(false);
  }, []);

  useEffect(() => {
    if (!user || booted.current) return;
    booted.current = true;
    (async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id, title, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      setConversations(data ?? []);
      if (data?.length) await loadMessages(data[0].id);
      loadRequests();
    })();
  }, [user, loadMessages, loadRequests]);

  // Live updates on admin replies + request status changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("assistant-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "artisan_requests", filter: `user_id=eq.${user.id}` },
        () => loadRequests(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as { conversation_id: string; role: string; content: string; sender_role: string | null };
          if (row.conversation_id !== conversationId) return;
          if (row.sender_role !== "admin") return;
          setMessages((prev) => [...prev, { role: "assistant", content: row.content, sender_role: "admin" }]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, conversationId, loadRequests]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!loadingHistory && !isLoading) inputRef.current?.focus();
  }, [loadingHistory, isLoading, conversationId]);

  const createConversation = useCallback(async (title = "New chat") => {
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ user_id: user!.id, title })
      .select("id, title, updated_at")
      .single();
    if (error) throw error;
    setConversations((prev) => [data, ...prev]);
    setConversationId(data.id);
    setMessages([]);
    return data.id;
  }, [user]);

  const handleNewChat = useCallback(async () => {
    setConversationId(null);
    setMessages([]);
    setShowSidebar(false);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await supabase.from("chat_messages").delete().eq("conversation_id", id);
    await supabase.from("chat_conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (conversationId === id) { setConversationId(null); setMessages([]); }
  }, [conversationId]);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || isLoading) return;
    const userMsg: Msg = { role: "user", content };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setIsLoading(true);

    let convoId: string;
    try {
      convoId = conversationId ?? await createConversation(content.length > 40 ? content.slice(0, 40) + "…" : content);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Failed to start the conversation." }]);
      setIsLoading(false);
      return;
    }

    await supabase.from("chat_messages").insert({
      conversation_id: convoId, role: "user", content, sender_role: "user",
    });
    await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convoId);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          conversationId: convoId,
        }),
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(body.error || "Assistant is unavailable right now.");

      const reply = body.content as string;
      setMessages((prev) => [...prev, { role: "assistant", content: reply, sender_role: "assistant" }]);
      await supabase.from("chat_messages").insert({
        conversation_id: convoId, role: "assistant", content: reply, sender_role: "assistant",
      });
      if (body.createdRequestIds?.length) loadRequests();
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `⚠️ ${err instanceof Error ? err.message : "Something went wrong."}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, conversationId, createConversation, loadRequests]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login?redirect=/assistant" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="grid lg:grid-cols-[220px_1fr_300px] gap-4 h-[calc(100vh-8rem)]">
          {/* Conversations */}
          <aside className={cn(
            "bg-card border border-border rounded-2xl overflow-hidden flex-col",
            showSidebar ? "flex" : "hidden lg:flex",
          )}>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chats</span>
              <button onClick={handleNewChat} className="p-1 rounded hover:bg-muted" title="New chat">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1.5 space-y-0.5">
                {conversations.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6 px-2">No chats yet.</p>
                ) : conversations.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "group flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-colors",
                      c.id === conversationId ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground",
                    )}
                  >
                    <button onClick={() => loadMessages(c.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{c.title}</span>
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10">
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </aside>

          {/* Chat */}
          <section className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden min-h-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-primary/5">
              <button onClick={() => setShowSidebar((s) => !s)} className="lg:hidden p-1 rounded hover:bg-muted">
                <Menu className="w-4 h-4 text-muted-foreground" />
              </button>
              <Bot className="w-5 h-5 text-primary" />
              <div className="min-w-0">
                <p className="font-display font-semibold text-sm text-foreground">Jobman Concierge</p>
                <p className="text-[11px] text-muted-foreground">Tell us what you need — we find the artisans</p>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {loadingHistory ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Bot className="w-12 h-12 text-primary mx-auto mb-3" />
                    <p className="font-display font-semibold text-foreground mb-1">What do you need done?</p>
                    <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
                      Describe the work and your location. You can request several artisans across different
                      trades — the Jobman team matches each one and comes back to you here.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {QUICK_REPLIES.map((q) => (
                        <button key={q} onClick={() => send(q)}
                          className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {messages.map((m, i) => (
                  <div key={i} className={cn("flex gap-2 max-w-[85%]", m.role === "user" ? "ml-auto flex-row-reverse" : "")}>
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      m.role === "user" ? "bg-primary" : m.sender_role === "admin" ? "bg-warning/20" : "bg-muted",
                    )}>
                      {m.role === "user"
                        ? <User className="w-4 h-4 text-primary-foreground" />
                        : <Bot className={cn("w-4 h-4", m.sender_role === "admin" ? "text-warning" : "text-muted-foreground")} />}
                    </div>
                    <div className={cn(
                      "text-sm rounded-2xl",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground px-3 py-2 rounded-br-md"
                        : "text-foreground",
                    )}>
                      {m.sender_role === "admin" && (
                        <span className="text-[11px] font-semibold text-warning">Jobman Team</span>
                      )}
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1.5 [&_ul]:my-1.5">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : m.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Bot className="w-4 h-4" />
                    <span className="animate-pulse">Thinking…</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="border-t border-border p-3 flex items-end gap-2"
            >
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
                }}
                placeholder="e.g. I need a plumber in Surulere, Lagos to fix a burst pipe"
                rows={1}
                className="resize-none min-h-[42px] max-h-32"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="shrink-0">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </section>

          {/* Requests */}
          <aside className="bg-card border border-border rounded-2xl overflow-hidden hidden lg:flex flex-col">
            <div className="px-3 py-2.5 border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My requests</span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {requests.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Requests you make in chat show up here with their status.
                  </p>
                ) : requests.map((r) => {
                  const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.new;
                  return (
                    <div key={r.id} className="rounded-xl border border-border p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm text-foreground flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-primary" />
                          {r.trade_category}
                        </span>
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", s.className)}>
                          {s.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                      {(r.location_state || r.location_lga) && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[r.location_lga, r.location_state].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {r.agreed_price && (
                        <p className="text-[11px] text-foreground flex items-center gap-1">
                          <Banknote className="w-3 h-3 text-primary" />
                          ₦{Number(r.agreed_price).toLocaleString()}
                          {r.agreed_timeline ? ` · ${r.agreed_timeline}` : ""}
                        </p>
                      )}
                      {r.admin_note && (
                        <p className="text-[11px] text-muted-foreground italic">{r.admin_note}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default Assistant;
