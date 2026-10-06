import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYSTACK_BASE = "https://api.paystack.co";
const MIN_AMOUNT_NGN = 500;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const user = userData.user;

    if (!paystackSecretKey) {
      return json({ error: "Withdrawals are not configured yet (missing PAYSTACK_SECRET_KEY)." }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    const accountNumber = String(body.account_number || "").trim();
    const bankCode = String(body.bank_code || "").trim();
    const bankName = String(body.bank_name || "");

    if (!Number.isFinite(amount) || amount < MIN_AMOUNT_NGN) {
      return json({ error: `Enter an amount of at least ₦${MIN_AMOUNT_NGN}.` }, 400);
    }
    if (!/^\d{10}$/.test(accountNumber) || !bankCode) {
      return json({ error: "A verified bank account is required." }, 400);
    }

    // Re-verify the account server-side — never trust an account name the
    // client supplies, even if it displayed a verified one a moment ago.
    const resolveRes = await fetch(
      `${PAYSTACK_BASE}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      { headers: { Authorization: `Bearer ${paystackSecretKey}` } }
    );
    const resolveData = await resolveRes.json();
    if (!resolveRes.ok || !resolveData.status) {
      return json({ error: "Could not verify this bank account." }, 400);
    }
    const accountName = resolveData.data.account_name;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: requestId, error: rpcError } = await admin.rpc("request_withdrawal", {
      _user_id: user.id,
      _amount: amount,
      _bank_code: bankCode,
      _bank_name: bankName || null,
      _account_number: accountNumber,
      _account_name: accountName,
    });
    if (rpcError) return json({ error: rpcError.message }, 400);

    return json({ id: requestId, account_name: accountName });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
