import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Plain === on a secret comparison leaks timing information byte-by-byte;
// compare as bytes instead so a mismatched bearer token can't be guessed
// incrementally from response latency.
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // This is meant to be cron-triggered only. It takes no attacker-controlled
  // input, but with no caller check anyone could hit this public URL in a
  // loop and repeatedly spam every unverified artisan's real inbox — same
  // convention as process-email-queue.
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!timingSafeEqual(authHeader, `Bearer ${serviceKey}`)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // Fetch all unverified artisans
  const { data: artisans, error } = await supabase
    .from('artisan_profiles')
    .select('user_id')
    .in('verification_status', ['unverified', 'rejected'])

  if (error) {
    console.error('Failed to fetch unverified artisans:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  if (!artisans?.length) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no_unverified_artisans' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  let sent = 0

  for (const artisan of artisans) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', artisan.user_id)
      .single()

    if (!profile?.email) continue

    try {
      // Call send-email-notification edge function (Resend)
      const { error: invokeError } = await supabase.functions.invoke('send-email-notification', {
        body: {
          to: profile.email,
          subject: 'Reminder: Verify Your ID to Start Earning on Jobman',
          eventType: 'verification_reminder',
          details: {
            name: profile.full_name || 'there',
            link: 'https://www.jobman.ng/login?redirect=/verify',
            message: `Hi ${profile.full_name || 'there'}, complete your ID verification on Jobman to start earning. It takes less than 5 minutes.`,
          },
        },
      })

      if (invokeError) {
        console.error(`Failed to send email for ${artisan.user_id}:`, invokeError)
      } else {
        sent++
      }
    } catch (err) {
      console.error(`Error sending email for ${artisan.user_id}:`, err)
    }

    // Small delay between sends
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`Weekly verification reminder: sent ${sent} emails for ${artisans.length} unverified artisans`)

  return new Response(
    JSON.stringify({ sent, total_unverified: artisans.length }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  )
})
