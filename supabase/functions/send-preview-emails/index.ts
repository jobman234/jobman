import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to Jobman! 🎉',
    html: `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #e8590c, #d94f00); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Welcome to Jobman!</h1>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi there,</p>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">Welcome to Jobman — Nigeria's trusted marketplace connecting skilled artisans with customers who need quality work done.</p>
        <div style="background: #f4f4f8; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <p style="color: #333; font-size: 14px; margin: 0 0 8px;"><strong>Here's what you can do:</strong></p>
          <p style="color: #555; font-size: 14px; margin: 4px 0;">🔍 Find verified artisans near you</p>
          <p style="color: #555; font-size: 14px; margin: 4px 0;">💼 Post jobs and receive competitive bids</p>
          <p style="color: #555; font-size: 14px; margin: 4px 0;">🔒 Pay securely through escrow protection</p>
          <p style="color: #555; font-size: 14px; margin: 4px 0;">⭐ Rate and review completed work</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://www.jobman.ng/dashboard" style="display: inline-block; background: linear-gradient(135deg, #e8590c, #d94f00); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center;">Need help? Contact us at <a href="mailto:support@jobman.ng" style="color: #e8590c;">support@jobman.ng</a></p>
      </div>
      <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
        <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Jobman. All rights reserved.</p>
      </div>
    </div>`,
  },
  verification_reminder: {
    subject: '🔔 Complete Your Verification to Start Earning',
    html: `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #e8590c, #d94f00); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Complete Your Verification</h1>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi there,</p>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">You're one step away from receiving jobs and earning on Jobman. Complete your ID verification to unlock all features.</p>
        <div style="background: #fff8f5; border-left: 4px solid #e8590c; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
          <p style="color: #333; font-size: 14px; margin: 0;"><strong>It takes less than 5 minutes.</strong> You'll need your NIN, a government-issued ID, and a quick selfie.</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://www.jobman.ng/artisan-verification" style="display: inline-block; background: linear-gradient(135deg, #e8590c, #d94f00); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Verify My ID Now</a>
        </div>
      </div>
      <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
        <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Jobman. All rights reserved.</p>
      </div>
    </div>`,
  },
  booking_confirmation: {
    subject: '✅ Job Booking Confirmed — Kitchen Renovation',
    html: `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #e8590c, #d94f00); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Booking Confirmed!</h1>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi there,</p>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">Your job <strong>"Kitchen Renovation"</strong> has been confirmed and the artisan is ready to begin.</p>
        <div style="background: #f4f4f8; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <p style="color: #333; font-size: 14px; margin: 4px 0;"><strong>Job:</strong> Kitchen Renovation</p>
          <p style="color: #333; font-size: 14px; margin: 4px 0;"><strong>Agreed Price:</strong> ₦120,000</p>
          <p style="color: #333; font-size: 14px; margin: 4px 0;"><strong>Timeline:</strong> 5 days</p>
          <p style="color: #333; font-size: 14px; margin: 4px 0;"><strong>Escrow Status:</strong> ✅ Funded</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://www.jobman.ng/jobs/preview" style="display: inline-block; background: linear-gradient(135deg, #e8590c, #d94f00); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">View Job Details</a>
        </div>
      </div>
      <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
        <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Jobman. All rights reserved.</p>
      </div>
    </div>`,
  },
  job_completion: {
    subject: '🎉 Job Completed — Please Review',
    html: `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #e8590c, #d94f00); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Job Completed!</h1>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi there,</p>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">The artisan has marked <strong>"Kitchen Renovation"</strong> as completed. Please review the work and release the escrow payment.</p>
        <div style="background: #fff8f5; border-left: 4px solid #e8590c; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
          <p style="color: #333; font-size: 14px; margin: 0;"><strong>⏰ You have 48 hours</strong> to review and accept. After that, payment will be released automatically.</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://www.jobman.ng/jobs/preview" style="display: inline-block; background: linear-gradient(135deg, #e8590c, #d94f00); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Review & Accept</a>
        </div>
      </div>
      <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
        <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Jobman. All rights reserved.</p>
      </div>
    </div>`,
  },
  payment_receipt: {
    subject: '💰 Payment Received — ₦85,000',
    html: `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #e8590c, #d94f00); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Payment Received!</h1>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi there,</p>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">Great news! The escrow for <strong>"Plumbing Repair"</strong> has been released. Your wallet has been credited.</p>
        <div style="background: #f4f4f8; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <p style="color: #333; font-size: 14px; margin: 4px 0;"><strong>Amount:</strong> ₦85,000</p>
          <p style="color: #333; font-size: 14px; margin: 4px 0;"><strong>Job:</strong> Plumbing Repair</p>
          <p style="color: #333; font-size: 14px; margin: 4px 0;"><strong>Status:</strong> ✅ Credited to Wallet</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://www.jobman.ng/wallet" style="display: inline-block; background: linear-gradient(135deg, #e8590c, #d94f00); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">View Wallet</a>
        </div>
      </div>
      <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
        <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Jobman. All rights reserved.</p>
      </div>
    </div>`,
  },
  weekly_verification: {
    subject: 'Reminder: Verify Your ID to Start Earning on Jobman',
    html: `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #e8590c, #d94f00); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Your Verification is Pending</h1>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi there,</p>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">We noticed you haven't completed your ID verification on Jobman yet. Verified artisans enjoy major benefits:</p>
        <div style="background: #f4f4f8; border-radius: 8px; padding: 20px; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #333; font-size: 14px;">✅ Appear in search results</td><td style="padding: 8px 0; color: #999; font-size: 14px; text-align: right;">Unverified: Hidden</td></tr>
            <tr><td style="padding: 8px 0; color: #333; font-size: 14px;">✅ Receive job requests</td><td style="padding: 8px 0; color: #999; font-size: 14px; text-align: right;">Unverified: Blocked</td></tr>
            <tr><td style="padding: 8px 0; color: #333; font-size: 14px;">✅ Get paid via escrow</td><td style="padding: 8px 0; color: #999; font-size: 14px; text-align: right;">Unverified: No access</td></tr>
            <tr><td style="padding: 8px 0; color: #333; font-size: 14px;">✅ Withdraw to bank</td><td style="padding: 8px 0; color: #999; font-size: 14px; text-align: right;">Unverified: No access</td></tr>
            <tr><td style="padding: 8px 0; color: #333; font-size: 14px;">✅ Verified badge on profile</td><td style="padding: 8px 0; color: #999; font-size: 14px; text-align: right;">Unverified: No badge</td></tr>
          </table>
        </div>
        <div style="background: #fff8f5; border-left: 4px solid #e8590c; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
          <p style="color: #333; font-size: 14px; margin: 0;"><strong>It takes less than 5 minutes.</strong> All you need is your NIN, a government-issued ID, and a quick selfie.</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
          <a href="https://www.jobman.ng/artisan-verification" style="display: inline-block; background: linear-gradient(135deg, #e8590c, #d94f00); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Verify My ID Now</a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center;">Need help? Contact us at <a href="mailto:support@jobman.ng" style="color: #e8590c;">support@jobman.ng</a></p>
      </div>
      <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
        <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Jobman. All rights reserved.</p>
      </div>
    </div>`,
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'Missing RESEND_API_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const resend = new Resend(resendApiKey)
    const { to, templates } = await req.json()
    
    if (!to || !templates || !Array.isArray(templates)) {
      return new Response(JSON.stringify({ error: 'Missing to or templates array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const rawSender = (Deno.env.get('RESEND_DOMAIN') || '').trim()
    const bracketMatch = rawSender.match(/<\s*([^>]+)\s*>/)
    const candidate = (bracketMatch?.[1] || rawSender)
      .trim()
      .toLowerCase()
      .replace(/^mailto:/, '')
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')

    const senderEmail = candidate.includes('@') ? candidate : `noreply@${candidate}`
    const isValidSender = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(senderEmail)

    const fromAddress = isValidSender
      ? `Jobman <${senderEmail}>`
      : 'Jobman <onboarding@resend.dev>'

    const results = []
    
    for (const templateName of templates) {
      const template = EMAIL_TEMPLATES[templateName as keyof typeof EMAIL_TEMPLATES]
      if (!template) {
        results.push({ template: templateName, status: 'skipped', reason: 'unknown template' })
        continue
      }

      try {
        const emailResponse = await resend.emails.send({
          from: fromAddress,
          to: [to],
          subject: `[Preview] ${template.subject}`,
          html: template.html,
        })

        if (emailResponse.error) {
          throw new Error(emailResponse.error.message || 'Resend returned an unknown error')
        }

        console.log(`Sent ${templateName}:`, emailResponse)
        results.push({ template: templateName, status: 'sent' })
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error(`Failed ${templateName}:`, msg)
        results.push({ template: templateName, status: 'failed', error: msg })
      }

      await new Promise(r => setTimeout(r, 500))
    }

    return new Response(JSON.stringify({ results }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
