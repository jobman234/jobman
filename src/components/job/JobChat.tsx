import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Send, Loader2, MessageCircle, Check, CheckCheck, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const SENSITIVE_PATTERNS = [
  /(\+?\d[\d\s\-()]{7,}\d)/g, // phone numbers
  /\b\d{10,}\b/g, // account numbers
  /\b(access\s*bank|gtbank|gt\s*bank|first\s*bank|uba|zenith\s*bank|union\s*bank|stanbic|fcmb|fidelity\s*bank|wema\s*bank|sterling\s*bank|polaris\s*bank|keystone\s*bank|ecobank|jaiz\s*bank|unity\s*bank|heritage\s*bank|providus|globus\s*bank|titan\s*trust|lotus\s*bank|optimus\s*bank|taj\s*bank|kuda|opay|palmpay|moniepoint)\b/gi,
];

const containsSensitiveInfo = (text: string): boolean => {
  return SENSITIVE_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });
};

interface JobChatProps {
  jobId: string;
  customerId: string;
  artisanId: string | null;
  otherPartyName?: string;
}

const JobChat = ({ jobId, customerId, artisanId, otherPartyName }: JobChatProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const lastTypingBroadcast = useRef(0);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["job-messages", jobId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("messages" as any)
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true }) as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!user && !!jobId && !!artisanId,
  });

  // Fetch sender names
  const senderIds = [...new Set(messages?.map((m: any) => m.sender_id) ?? [])];
  const { data: senderMap } = useQuery({
    queryKey: ["message-senders", senderIds.join(",")],
    queryFn: async () => {
      if (!senderIds.length) return {};
      const { data } = await supabase
        .from("public_profiles")
        .select("user_id, full_name")
        .in("user_id", senderIds);
      const map: Record<string, string> = {};
      data?.forEach((p) => { map[p.user_id] = p.full_name; });
      return map;
    },
    enabled: senderIds.length > 0,
  });

  // Typing indicator broadcast channel
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user || !jobId || !artisanId) return;

    const channel = supabase.channel(`typing-${jobId}`);
    
    channel.on("broadcast", { event: "typing" }, (payload) => {
      if (payload.payload?.user_id !== user.id) {
        setIsOtherTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
      }
    }).subscribe();

    typingChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [user, jobId, artisanId]);

  const broadcastTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingBroadcast.current < 2000) return;
    lastTypingBroadcast.current = now;
    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: user?.id },
    });
  }, [user?.id]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!user || !jobId || !artisanId) return;

    const channel = supabase
      .channel(`job-messages-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["job-messages", jobId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, jobId, artisanId, queryClient]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  // Mark unread messages as read
  useEffect(() => {
    if (!user || !messages?.length) return;
    const unread = messages.filter((m: any) => !m.is_read && m.sender_id !== user.id);
    if (unread.length > 0) {
      (supabase
        .from("messages" as any)
        .update({ is_read: true } as any)
        .in("id", unread.map((m: any) => m.id)) as any)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["job-messages", jobId] });
        });
    }
  }, [messages, user, jobId, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!newMessage.trim() || !user) return;
      const { error } = await (supabase
        .from("messages" as any)
        .insert({
          job_id: jobId,
          sender_id: user.id,
          content: newMessage.trim(),
        } as any) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["job-messages", jobId] });
    },
    onError: (err: any) => {
      console.error("Failed to send message:", err.message);
    },
  });

  if (!artisanId) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-display font-semibold text-lg text-foreground mb-2 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          Messages
        </h2>
        <p className="text-sm text-muted-foreground">
          Messaging will be available once an artisan is assigned to this job.
        </p>
      </div>
    );
  }

  const isParticipant = user?.id === customerId || user?.id === artisanId;

  if (!isParticipant) return null;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          Messages
          {otherPartyName && (
            <span className="text-sm font-normal text-muted-foreground">
              with {otherPartyName}
            </span>
          )}
        </h2>
      </div>

      {/* Messages area */}
      <ScrollArea className="h-[320px] sm:h-[400px]">
        <div className="p-4 space-y-3" ref={scrollRef}>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : !messages?.length ? (
            <div className="text-center py-12">
              <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const isMine = msg.sender_id === user?.id;
              const senderName = senderMap?.[msg.sender_id] || "User";

              return (
                <div
                  key={msg.id}
                  className={cn("flex flex-col max-w-[80%]", isMine ? "ml-auto items-end" : "items-start")}
                >
                  <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
                    {isMine ? "You" : senderName}
                  </span>
                  {containsSensitiveInfo(msg.content) && (
                    <div className="flex items-center gap-1 text-[10px] text-destructive mb-1 px-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Contains sensitive info (phone/bank details)</span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-sm",
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md",
                      containsSensitiveInfo(msg.content) && "ring-1 ring-destructive/40"
                    )}
                  >
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 px-1">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </span>
                    {isMine && (
                      msg.is_read ? (
                        <CheckCheck className="w-3 h-3 text-primary" />
                      ) : (
                        <Check className="w-3 h-3 text-muted-foreground" />
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
          {isOtherTyping && (
            <div className="flex items-start max-w-[80%]">
              <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-2.5">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">
        {containsSensitiveInfo(newMessage) && (
          <div className="flex items-center gap-1.5 text-xs text-destructive mb-2 px-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Sharing phone numbers or bank details in chat is not recommended for your safety.</span>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage.mutate();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              if (e.target.value.trim()) broadcastTyping();
            }}
            placeholder="Type a message..."
            maxLength={1000}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || sendMessage.isPending}
            className="bg-primary text-primary-foreground hover:opacity-90 shrink-0"
          >
            {sendMessage.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default JobChat;
