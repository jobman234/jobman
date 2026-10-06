import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYSTACK_BASE = "https://api.paystack.co";
const MIN_AMOUNT_NGN = 100;
const MAX_AMOUNT_NGN = 2_000_000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

  try {
    // Identify the caller from their own JWT (never trust a client-supplied user id).
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: "Not authenticated" }, 401);
    }
    const user = userData.user;

    if (!paystackSecretKey) {
      return json({ error: "Wallet funding is not configured yet (missing PAYSTACK_SECRET_KEY)." }, 503);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === "initialize") {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < MIN_AMOUNT_NGN || amount > MAX_AMOUNT_NGN) {
        return json({ error: `Enter an amount between ₦${MIN_AMOUNT_NGN} and ₦${MAX_AMOUNT_NGN.toLocaleString()}.` }, 400);
      }

      const { data: wallet, error: walletError } = await admin
        .from("wallets")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (walletError || !wallet) {
        return json({ error: "Wallet not found for this account." }, 404);
      }

      const reference = `jobman_${user.id.slice(0, 8)}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

      const { error: insertError } = await admin.from("wallet_topups").insert({
        user_id: user.id,
        wallet_id: wallet.id,
        amount,
        paystack_reference: reference,
        status: "pending",
      });
      if (insertError) throw insertError;

      const origin = req.headers.get("origin") || body.origin || "";
      const initRes = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: Math.round(amount * 100), // kobo
          reference,
          currency: "NGN",
          callback_url: origin ? `${origin}/wallet?reference=${reference}` : undefined,
          metadata: { user_id: user.id, purpose: "wallet_topup" },
        }),
      });
      const initData = await initRes.json();
      if (!initRes.ok || !initData.status) {
        await admin.from("wallet_topups").update({ status: "failed" }).eq("paystack_reference", reference);
        return json({ error: initData.message || "Could not start payment with Paystack." }, 502);
      }

      return json({
        authorization_url: initData.data.authorization_url,
        reference,
      });
    }

    if (action === "verify") {
      const reference = String(body.reference || "");
      if (!reference) return json({ error: "Missing reference" }, 400);

      const { data: topup } = await admin
        .from("wallet_topups")
        .select("id, user_id, status, amount")
        .eq("paystack_reference", reference)
        .maybeSingle();
      if (!topup || topup.user_id !== user.id) {
        return json({ error: "Topup not found" }, 404);
      }
      if (topup.status === "success") {
        return json({ status: "success", alreadyApplied: true });
      }

      const verifyRes = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${paystackSecretKey}` },
      });
      const verifyData = await verifyRes.json();
      const txn = verifyData?.data;

      if (!verifyRes.ok || !txn || txn.status !== "success") {
        return json({ status: "failed", message: txn?.gateway_response || "Payment was not successful." });
      }
      if (Math.round(Number(topup.amount) * 100) !== txn.amount) {
        return json({ error: "Amount mismatch — refusing to credit wallet." }, 400);
      }

      const { data: applied, error: applyError } = await admin.rpc("apply_wallet_topup", {
        _paystack_reference: reference,
      });
      if (applyError) throw applyError;

      return json({ status: "success", credited: applied === true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
