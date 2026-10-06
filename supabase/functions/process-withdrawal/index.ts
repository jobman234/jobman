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
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    // Admin-only: this function moves real money out via Paystack transfers.
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    if (!paystackSecretKey) {
      return json({ error: "Withdrawals are not configured yet (missing PAYSTACK_SECRET_KEY)." }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const requestId = String(body.request_id || "");
    if (!requestId) return json({ error: "Missing request_id" }, 400);

    if (body.action === "reject") {
      const note = String(body.note || "Rejected by admin");
      const { error } = await admin.rpc("close_withdrawal_request", {
        _request_id: requestId,
        _new_status: "rejected",
        _note: note,
      });
      if (error) return json({ error: error.message }, 400);
      await admin.rpc("log_admin_action", {
        _admin_id: userData.user.id,
        _action: "withdrawal_rejected",
        _entity_type: "withdrawal_request",
        _entity_id: requestId,
        _details: { note },
      });
      return json({ status: "rejected" });
    }

    const { data: reqRow, error: fetchError } = await admin
      .from("withdrawal_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();
    if (fetchError || !reqRow) return json({ error: "Withdrawal request not found" }, 404);

    if (body.action === "initiate") {
      if (!["pending", "awaiting_otp"].includes(reqRow.status)) {
        return json({ error: `Request is already ${reqRow.status}` }, 400);
      }

      let recipientCode = reqRow.paystack_recipient_code;
      if (!recipientCode) {
        const recRes = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
          method: "POST",
          headers: { Authorization: `Bearer ${paystackSecretKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "nuban",
            name: reqRow.account_name,
            account_number: reqRow.account_number,
            bank_code: reqRow.bank_code,
            currency: "NGN",
          }),
        });
        const recData = await recRes.json();
        if (!recRes.ok || !recData.status) {
          return json({ error: recData.message || "Could not register recipient with Paystack." }, 502);
        }
        recipientCode = recData.data.recipient_code;
      }

      const transferRes = await fetch(`${PAYSTACK_BASE}/transfer`, {
        method: "POST",
        headers: { Authorization: `Bearer ${paystackSecretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "balance",
          amount: Math.round(Number(reqRow.amount) * 100),
          recipient: recipientCode,
          reason: "Jobman wallet withdrawal",
          reference: `withdrawal_${reqRow.id}`,
        }),
      });
      const transferData = await transferRes.json();
      if (!transferRes.ok || !transferData.status) {
        await admin.rpc("close_withdrawal_request", {
          _request_id: requestId,
          _new_status: "failed",
          _note: transferData.message || "Paystack transfer failed to initiate.",
        });
        return json({ error: transferData.message || "Transfer failed to initiate." }, 502);
      }

      const transferStatus = transferData.data.status; // 'success' | 'otp' | 'pending'
      const transferCode = transferData.data.transfer_code;

      if (transferStatus === "success") {
        await admin.rpc("mark_withdrawal_paid", { _request_id: requestId, _transfer_code: transferCode });
        await admin.rpc("log_admin_action", {
          _admin_id: userData.user.id,
          _action: "withdrawal_paid",
          _entity_type: "withdrawal_request",
          _entity_id: requestId,
          _details: { amount: reqRow.amount, transfer_code: transferCode },
        });
        return json({ status: "paid" });
      }

      await admin.rpc("set_withdrawal_processing", {
        _request_id: requestId,
        _recipient_code: recipientCode,
        _transfer_code: transferCode,
        _status: "awaiting_otp",
      });
      return json({ status: "awaiting_otp", needsOtp: true });
    }

    if (body.action === "finalize_otp") {
      const otp = String(body.otp || "").trim();
      if (!otp) return json({ error: "Enter the OTP sent to the business's registered contact." }, 400);
      if (!reqRow.paystack_transfer_code) return json({ error: "No transfer in progress for this request." }, 400);

      const finRes = await fetch(`${PAYSTACK_BASE}/transfer/finalize_transfer`, {
        method: "POST",
        headers: { Authorization: `Bearer ${paystackSecretKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ transfer_code: reqRow.paystack_transfer_code, otp }),
      });
      const finData = await finRes.json();
      if (!finRes.ok || !finData.status || finData.data?.status !== "success") {
        return json({ error: finData.message || "Incorrect or expired OTP." }, 400);
      }

      await admin.rpc("mark_withdrawal_paid", {
        _request_id: requestId,
        _transfer_code: reqRow.paystack_transfer_code,
      });
      await admin.rpc("log_admin_action", {
        _admin_id: userData.user.id,
        _action: "withdrawal_paid",
        _entity_type: "withdrawal_request",
        _entity_id: requestId,
        _details: { amount: reqRow.amount, transfer_code: reqRow.paystack_transfer_code, via: "otp_finalize" },
      });
      return json({ status: "paid" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
