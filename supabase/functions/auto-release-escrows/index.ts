import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Plain === on a secret comparison leaks timing information byte-by-byte;
// compare as bytes instead so a mismatched bearer token can't be guessed
// incrementally from response latency.
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // This is meant to be cron-triggered only, same convention as
    // weekly-verification-reminder and process-email-queue. It takes no
    // attacker-controlled input and auto_release_expired_escrows() only ever
    // touches escrows already past their own release deadline, so this was
    // never a path to divert funds — but with no caller check, anyone who
    // found this public URL could trigger it on demand instead of waiting
    // for the scheduled run, with no reason that should be possible.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!timingSafeEqual(authHeader, `Bearer ${supabaseServiceKey}`)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.rpc("auto_release_expired_escrows");

    if (error) throw error;

    return new Response(JSON.stringify({ released: data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
