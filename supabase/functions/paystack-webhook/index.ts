import { createClient } from "npm:@supabase/supabase-js@2";

// Paystack calls this directly (no Supabase user session), so trust comes
// from verifying the x-paystack-signature HMAC-SHA512 of the raw body against
// PAYSTACK_SECRET_KEY — never process a payload that doesn't match.
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function isValidSignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !/^[0-9a-f]+$/i.test(signature) || signature.length % 2 !== 0) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const expected = new Uint8Array(signature.length / 2);
  for (let i = 0; i < expected.length; i++) {
    expected[i] = parseInt(signature.slice(i * 2, i * 2 + 2), 16);
  }
  // Comparing differing-length buffers still costs the same either way
  // (length check short-circuits before the per-byte loop), so this never
  // leaks how much of a guessed signature was correct via timing.
  return timingSafeEqual(mac, expected);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!paystackSecretKey) {
    return new Response("Not configured", { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!(await isValidSignature(rawBody, signature, paystackSecretKey))) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success" && event.data?.metadata?.purpose === "wallet_topup") {
    const reference = event.data.reference as string;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: topup } = await admin
      .from("wallet_topups")
      .select("amount")
      .eq("paystack_reference", reference)
      .maybeSingle();

    // Amount from Paystack is in kobo; guard against a tampered/mismatched event.
    if (topup && Math.round(Number(topup.amount) * 100) === event.data.amount) {
      await admin.rpc("apply_wallet_topup", { _paystack_reference: reference });
    }
  }

  // Always 200 quickly so Paystack doesn't endlessly retry a webhook we've handled (or ignored on purpose).
  return new Response("ok", { status: 200 });
});
