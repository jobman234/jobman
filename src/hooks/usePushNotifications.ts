import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// This should match the VAPID_PUBLIC_KEY secret
// It's safe to expose the public key on the client
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);

    if (supported && Notification.permission === "granted" && user) {
      checkExistingSubscription();
    }
  }, [user]);

  const checkExistingSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch {
      setIsSubscribed(false);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!user || !VAPID_PUBLIC_KEY) return false;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return false;

      const registration = await navigator.serviceWorker.ready;
      
      // Unsubscribe from any existing subscription first
      const existing = await (registration as any).pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const sub = subscription.toJSON();
      
      // Store subscription in database
      const { error } = await supabase
        .from("push_subscriptions" as any)
        .upsert({
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: sub.keys?.p256dh,
          auth: sub.keys?.auth,
        } as any, { onConflict: "user_id,endpoint" });

      if (error) {
        console.error("Failed to store push subscription:", error);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      return false;
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        // Remove from database
        await supabase
          .from("push_subscriptions" as any)
          .delete()
          .eq("endpoint", subscription.endpoint);
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error("Unsubscribe failed:", err);
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
  };
}
