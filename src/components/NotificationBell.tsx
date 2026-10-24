import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Check, CheckCheck, Briefcase, Wallet, AlertTriangle, MessageSquare, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  job_update: { icon: Briefcase, color: "text-primary", bg: "bg-primary/10" },
  escrow_update: { icon: Wallet, color: "text-warning", bg: "bg-warning/10" },
  dispute: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  negotiation: { icon: MessageSquare, color: "text-info", bg: "bg-info/10" },
  message: { icon: MessageCircle, color: "text-primary", bg: "bg-primary/10" },
};

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("notifications" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(30) as any);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length ?? 0;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await (supabase
        .from("notifications" as any)
        .update({ is_read: true } as any)
        .eq("id", id) as any);
    },
    onSuccess: () => {
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
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleClick = (notif: any) => {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
      setOpen(false);
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-display font-semibold text-sm text-foreground">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => { navigate("/notifications"); setOpen(false); }}
            >
              View all
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-[360px]">
          {!notifications?.length ? (
            <div className="py-10 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif: any) => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.job_update;
                const Icon = cfg.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 text-left hover:bg-muted/50 transition-colors",
                      !notif.is_read && "bg-primary/5"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                      <Icon className={cn("w-4 h-4", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm font-medium text-foreground truncate", !notif.is_read && "font-semibold")}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
