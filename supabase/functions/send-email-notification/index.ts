import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  eventType: string;
  details: Record<string, string>;
}

function wrapInLayout(innerHtml: string): string {
  return `
    <div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #e8590c, #d94f00); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
        ${innerHtml.split('<!--HEADER-->')[0]}
      </div>
      <div style="padding: 32px 24px;">
        ${innerHtml.split('<!--HEADER-->')[1]?.split('<!--FOOTER-->')[0] || ''}
      </div>
      <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
        <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Jobman. All rights reserved.</p>
      </div>
    </div>`;
}

function buildEmailHtml(eventType: string, details: Record<string, string>, subject: string): string {
  const fullName = details.name || 'there';
  const name = fullName !== 'there' ? fullName.split(' ')[0] : 'there';
  const link = details.link || '#';
  const appUrl = 'https://www.jobman.ng';

  switch (eventType) {
    case "welcome":
      return `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #e8590c, #d94f00); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Welcome to Jobman!</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Welcome to Jobman — Nigeria's trusted marketplace connecting skilled artisans with customers who need quality work done.
          </p>
          <div style="background: #f4f4f8; border-radius: 8px; padding: 20px; margin: 16px 0;">
            <p style="color: #333; font-size: 14px; margin: 0 0 8px;"><strong>Here's what you can do:</strong></p>
            <p style="color: #555; font-size: 14px; margin: 4px 0;">🔍 Find verified artisans near you</p>
            <p style="color: #555; font-size: 14px; margin: 4px 0;">💼 Post jobs and receive competitive bids</p>
            <p style="color: #555; font-size: 14px; margin: 4px 0;">🔒 Pay securely through escrow protection</p>
            <p style="color: #555; font-size: 14px; margin: 4px 0;">⭐ Rate and review completed work</p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #e8590c, #d94f00); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
          </div>
          <p style="color: #888; font-size: 13px; text-align: center;">Need help? Contact us at <a href="mailto:support@jobman.ng" style="color: #e8590c;">support@jobman.ng</a></p>
        </div>
        <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
          <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Jobman. All rights reserved.</p>
        </div>
      </div>`;

    case "verification_reminder":
      return `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #e8590c, #d94f00); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Complete Your Verification</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            You're one step away from receiving jobs and earning on Jobman. Complete your ID verification to unlock all features.
          </p>
          <div style="background: #fff8f5; border-left: 4px solid #e8590c; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
            <p style="color: #333; font-size: 14px; margin: 0;">
              <strong>It takes less than 5 minutes.</strong> You'll need your NIN, a government-issued ID, and a quick selfie.
            </p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #e8590c, #d94f00); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Verify My ID Now</a>
          </div>
        </div>
        <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
          <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Jobman. All rights reserved.</p>
        </div>
      </div>`;

    case "booking_confirmation":
      return `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #e8590c, #d94f00); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Booking Confirmed!</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Your job <strong>"${details.jobTitle || 'a job'}"</strong> has been confirmed with ${details.artisanName || 'an artisan'}.
          </p>
          <div style="background: #f4f4f8; border-radius: 8px; padding: 20px; margin: 16px 0;">
            <p style="color: #333; font-size: 14px; margin: 4px 0;"><strong>Job:</strong> ${details.jobTitle || 'N/A'}</p>
            <p style="color: #333; font-size: 14px; margin: 4px 0;"><strong>Agreed Price:</strong> ₦${details.price || 'N/A'}</p>
            <p style="color: #333; font-size: 14px; margin: 4px 0;"><strong>Timeline:</strong> ${details.timeline || 'TBC'}</p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #e8590c, #d94f00); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">View Job Details</a>
          </div>
        </div>
        <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
          <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Jobman. All rights reserved.</p>
        </div>
      </div>`;

    case "job_completion":
      return `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #e8590c, #d94f00); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Job Completed!</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            The artisan has marked <strong>"${details.jobTitle || 'a job'}"</strong> as completed. Please review the work and release the escrow payment.
          </p>
          <div style="background: #fff8f5; border-left: 4px solid #e8590c; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
            <p style="color: #333; font-size: 14px; margin: 0;">
              <strong>⏰ You have 48 hours</strong> to review and accept. After that, payment will be released automatically.
            </p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #e8590c, #d94f00); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Review & Accept</a>
          </div>
        </div>
        <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
          <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Jobman. All rights reserved.</p>
        </div>
      </div>`;

    case "dispute_resolved":
      return `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #1a1a2e; font-size: 24px;">Dispute Resolved</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          Your dispute for job <strong>"${details.jobTitle || "a job"}"</strong> has been resolved.
        </p>
        <div style="background: #f4f4f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #333;"><strong>Decision:</strong> ${details.decision || "See details in app"}</p>
          ${details.notes ? `<p style="margin: 8px 0 0; color: #555;"><strong>Notes:</strong> ${details.notes}</p>` : ""}
        </div>
        <a href="${link}" style="display: inline-block; background: #e8590c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">View Details</a>
      </div>`;

    case "escrow_released":
      return `<div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #e8590c, #d94f00); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Payment Received!</h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Great news! The escrow for <strong>"${details.jobTitle || "a job"}"</strong> has been released. Your wallet has been credited.
          </p>
          <div style="background: #f4f4f8; border-radius: 8px; padding: 20px; margin: 16px 0;">
            <p style="color: #333; font-size: 14px; margin: 4px 0;"><strong>Amount:</strong> ₦${details.amount || "N/A"}</p>
            <p style="color: #333; font-size: 14px; margin: 4px 0;"><strong>Job:</strong> ${details.jobTitle || 'N/A'}</p>
            <p style="color: #333; font-size: 14px; margin: 4px 0;"><strong>Status:</strong> ✅ Credited to Wallet</p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #e8590c, #d94f00); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">View Wallet</a>
          </div>
        </div>
        <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
          <p style="color: #aaa; font-size: 12px; margin: 0;">© 2026 Jobman. All rights reserved.</p>
        </div>
      </div>`;

    case "escrow_refunded":
      return `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #1a1a2e; font-size: 24px;">Escrow Refunded</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">
          The escrow for job <strong>"${details.jobTitle || "a job"}"</strong> has been refunded to your wallet.
        </p>
        <div style="background: #f4f4f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #333;"><strong>Amount:</strong> ₦${details.amount || "N/A"}</p>
        </div>
        <a href="${link}" style="display: inline-block; background: #e8590c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">View Wallet</a>
      </div>`;

    default:
      return `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="color: #1a1a2e; font-size: 24px;">${subject}</h1>
        <p style="color: #555; font-size: 16px; line-height: 1.6;">${details.message || "You have a new notification."}</p>
        ${link !== '#' ? `<a href="${link}" style="display: inline-block; background: #e8590c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View Details</a>` : ""}
      </div>`;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, eventType, details }: EmailRequest = await req.json();

    if (!to || !subject || !eventType) {
      throw new Error("Missing required fields: to, subject, eventType");
    }

    const htmlContent = buildEmailHtml(eventType, details || {}, subject);

    const rawSender = (Deno.env.get("RESEND_DOMAIN") || "").trim();
    const bracketMatch = rawSender.match(/<\s*([^>]+)\s*>/);
    const candidate = (bracketMatch?.[1] || rawSender)
      .trim()
      .toLowerCase()
      .replace(/^mailto:/, "")
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

    const senderEmail = candidate.includes("@") ? candidate : `noreply@${candidate}`;
    const isValidSender = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(senderEmail);

    const fromAddress = isValidSender
      ? `Jobman <${senderEmail}>`
      : "Jobman <onboarding@resend.dev>";

    const emailResponse = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html: htmlContent,
    });

    if (emailResponse.error) {
      throw new Error(emailResponse.error.message || "Resend returned an unknown error");
    }

    console.log("Email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Email send error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
