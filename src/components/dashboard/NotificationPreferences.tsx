import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell, Loader2 } from "lucide-react";

const CATEGORIES = [
  { key: "payment_enabled", label: "Payments", description: "Escrow funded, released, or refunded" },
  { key: "job_update_enabled", label: "Job updates", description: "Booking confirmed, started, completed" },
  { key: "message_enabled", label: "Messages", description: "New messages from a customer or artisan" },
  { key: "dispute_enabled", label: "Disputes", description: "Dispute raised or resolved" },
  { key: "referral_enabled", label: "Referrals", description: "Referral signups and bonus credits" },
] as const;

type PreferenceKey = (typeof CATEGORIES)[number]["key"] | "email_enabled";

type Preferences = Record<PreferenceKey, boolean>;

const DEFAULT_PREFERENCES: Preferences = {
  payment_enabled: true,
  job_update_enabled: true,
  message_enabled: true,
  dispute_enabled: true,
  referral_enabled: true,
  email_enabled: true,
};

const NotificationPreferences = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async (): Promise<Preferences> => {
      const { data } = await supabase
        .from("notification_preferences" as any)
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      // No row yet means every category defaults to enabled, matching the
      // server-side behavior in create_notification()/the email triggers.
      return data ? { ...DEFAULT_PREFERENCES, ...(data as any) } : DEFAULT_PREFERENCES;
    },
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<Preferences>) => {
      const { error } = await supabase
        .from("notification_preferences" as any)
        .upsert({ user_id: user!.id, ...patch } as any, { onConflict: "user_id" });
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["notification-preferences", user?.id] });
      const previous = queryClient.getQueryData<Preferences>(["notification-preferences", user?.id]);
      queryClient.setQueryData(["notification-preferences", user?.id], (old: Preferences | undefined) => ({
        ...(old ?? DEFAULT_PREFERENCES),
        ...patch,
      }));
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["notification-preferences", user?.id], context.previous);
      }
      toast.error("Could not update notification preferences");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences", user?.id] });
    },
  });

  const current = prefs ?? DEFAULT_PREFERENCES;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="w-4 h-4 text-primary" />
        <h2 className="font-display font-semibold text-base text-foreground">Notifications</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Choose what you hear about. Turning a category off stops it from appearing in your notification bell.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
              </div>
              <Switch
                checked={current[c.key]}
                disabled={mutation.isPending}
                onCheckedChange={(checked) => mutation.mutate({ [c.key]: checked })}
              />
            </div>
          ))}

          <div className="pt-4 border-t border-border flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Email notifications</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Booking, completion, payment, and verification-reminder emails. Account emails (like password resets) always send.
              </p>
            </div>
            <Switch
              checked={current.email_enabled}
              disabled={mutation.isPending}
              onCheckedChange={(checked) => mutation.mutate({ email_enabled: checked })}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPreferences;
