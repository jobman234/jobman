import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, BellRing } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PushNotificationPrompt = () => {
  const { user } = useAuth();
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("push-prompt-dismissed") === "true";
  });

  if (!user || !isSupported || dismissed || permission === "denied") return null;
  if (isSubscribed) return null;

  const handleEnable = async () => {
    setLoading(true);
    const success = await subscribe();
    setLoading(false);
    if (success) {
      toast.success("Push notifications enabled!");
    } else {
      toast.error("Could not enable notifications. Check your browser settings.");
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("push-prompt-dismissed", "true");
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <BellRing className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-sm text-foreground mb-1">
          Enable push notifications
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Get notified about new messages, job updates, and escrow releases even when you're not using the app.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleEnable}
            disabled={loading}
            className="bg-gradient-hero text-primary-foreground hover:opacity-90 text-xs h-8"
          >
            <Bell className="w-3 h-3 mr-1.5" />
            {loading ? "Enabling..." : "Enable"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-xs h-8 text-muted-foreground"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationPrompt;
