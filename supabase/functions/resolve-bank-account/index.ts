import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYSTACK_BASE = "https://api.paystack.co";

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
  const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Not authenticated" }, 401);

    if (!paystackSecretKey) {
      return json({ error: "Bank verification is not configured yet (missing PAYSTACK_SECRET_KEY)." }, 503);
    }

    const body = await req.json().catch(() => ({}));

    if (body.action === "list_banks") {
      const res = await fetch(`${PAYSTACK_BASE}/bank?country=nigeria&currency=NGN`, {
        headers: { Authorization: `Bearer ${paystackSecretKey}` },
      });
      const data = await res.json();
      if (!res.ok) return json({ error: data.message || "Could not load bank list." }, 502);
      const banks = (data.data || []).map((b: any) => ({ name: b.name, code: b.code }));
      return json({ banks });
    }

    if (body.action === "resolve") {
      const accountNumber = String(body.account_number || "").trim();
      const bankCode = String(body.bank_code || "").trim();
      if (!/^\d{10}$/.test(accountNumber) || !bankCode) {
        return json({ error: "Enter a valid 10-digit account number and select a bank." }, 400);
      }
      const res = await fetch(
        `${PAYSTACK_BASE}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        { headers: { Authorization: `Bearer ${paystackSecretKey}` } }
      );
      const data = await res.json();
      if (!res.ok || !data.status) {
        return json({ error: data.message || "Could not verify this account." }, 400);
      }
      return json({ account_name: data.data.account_name, account_number: data.data.account_number });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
