import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Briefcase,
  Wallet,
  AlertTriangle,
  MessageSquare,
  MessageCircle,
  CheckCheck,
  Loader2,
  Inbox,
  ArrowLeft,
} from "lucide-react";
import { useEffect } from "react";

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string; label: string }> = {
  job_update: { icon: Briefcase, color: "text-primary", bg: "bg-primary/10", label: "Job" },
  escrow_update: { icon: Wallet, color: "text-warning", bg: "bg-warning/10", label: "Escrow" },
  dispute: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", label: "Dispute" },
  negotiation: { icon: MessageSquare, color: "text-info", bg: "bg-info/10", label: "Negotiation" },
  message: { icon: MessageCircle, color: "text-primary", bg: "bg-primary/10", label: "Message" },
};

const Notifications = () => {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications-page", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("notifications" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100) as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!user,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-page-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications-page", user.id] });
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await (supabase
        .from("notifications" as any)
        .update({ is_read: true } as any)
        .eq("id", id) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-page"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications?.filter((n: any) => !n.is_read).map((n: any) => n.id) ?? [];
      if (unreadIds.length === 0) return;
      await (supabase
        .from("notifications" as any)
        .update({ is_read: true } as any)
        .in("id", unreadIds) as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-page"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const unreadNotifs = notifications?.filter((n: any) => !n.is_read) ?? [];
  const readNotifs = notifications?.filter((n: any) => n.is_read) ?? [];

  const renderNotification = (notif: any) => {
    const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.job_update;
    const Icon = cfg.icon;
    return (
      <div
        key={notif.id}
        className={cn(
          "flex items-start gap-4 p-4 rounded-xl border transition-colors",
          !notif.is_read
            ? "bg-primary/5 border-primary/20"
            : "bg-card border-border"
        )}
      >
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", cfg.bg)}>
          <Icon className={cn("w-5 h-5", cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={cn("text-sm font-medium text-foreground", !notif.is_read && "font-semibold")}>
              {notif.title}
            </p>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", cfg.bg, cfg.color)}>
              {cfg.label}
            </span>
            {!notif.is_read && (
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{notif.message}</p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
          </p>
        </div>
        {!notif.is_read && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs shrink-0 h-8"
            onClick={() => markReadMutation.mutate(notif.id)}
            disabled={markReadMutation.isPending}
          >
            Mark read
          </Button>
        )}
      </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="py-16 text-center">
      <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Notifications</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {unreadNotifs.length > 0
                  ? `${unreadNotifs.length} unread notification${unreadNotifs.length > 1 ? "s" : ""}`
                  : "You're all caught up"}
              </p>
            </div>
            {unreadNotifs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCheck className="w-4 h-4 mr-1.5" />
                Mark all read
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  All ({notifications?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="unread">
                  Unread ({unreadNotifs.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3">
                {!notifications?.length ? (
                  <EmptyState message="No notifications yet. You'll see updates about jobs, messages, and payments here." />
                ) : (
                  notifications.map(renderNotification)
                )}
              </TabsContent>

              <TabsContent value="unread" className="space-y-3">
                {unreadNotifs.length === 0 ? (
                  <EmptyState message="No unread notifications." />
                ) : (
                  unreadNotifs.map(renderNotification)
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
};

export default Notifications;
