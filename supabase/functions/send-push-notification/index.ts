import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generatePushHTTPRequest,
  ApplicationServerKeys,
} from "https://esm.sh/@block65/webcrypto-web-push@1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error("VAPID keys not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase config not set");
    }

    const { userId, title, body, url, icon }: PushPayload = await req.json();

    if (!userId || !title || !body) {
      throw new Error("Missing required fields: userId, title, body");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all push subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found for user" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const applicationServerKeys = await ApplicationServerKeys.fromJSON({
      publicKey: VAPID_PUBLIC_KEY,
      privateKey: VAPID_PRIVATE_KEY,
    });

    const payload = JSON.stringify({
      title,
      body,
      url: url || "/",
      icon: icon || "/pwa-192x192.png",
    });

    const results = [];
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const { headers, body: reqBody, endpoint } =
          await generatePushHTTPRequest({
            applicationServerKeys,
            payload,
            target: pushSubscription,
            adminContact: "mailto:admin@jobman.app",
            ttl: 60 * 60, // 1 hour
          });

        const pushResponse = await fetch(endpoint, {
          method: "POST",
          headers,
          body: reqBody,
        });

        if (pushResponse.status === 410 || pushResponse.status === 404) {
          // Subscription expired, mark for cleanup
          expiredEndpoints.push(sub.endpoint);
        }

        results.push({
          endpoint: sub.endpoint,
          status: pushResponse.status,
          ok: pushResponse.ok,
        });
      } catch (err) {
        console.error("Push to endpoint failed:", sub.endpoint, err);
        results.push({
          endpoint: sub.endpoint,
          status: 0,
          ok: false,
          error: String(err),
        });
      }
    }

    // Cleanup expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
