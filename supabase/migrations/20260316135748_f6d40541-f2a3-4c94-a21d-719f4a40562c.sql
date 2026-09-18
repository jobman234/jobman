
CREATE OR REPLACE FUNCTION public.send_verification_reminder_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email TEXT;
  _full_name TEXT;
  _message_id TEXT;
  _html TEXT;
  _app_url TEXT := 'https://jobmanmarketplace.lovable.app';
BEGIN
  IF NEW.verification_status != 'unverified' THEN
    RETURN NEW;
  END IF;

  SELECT p.email, p.full_name INTO _email, _full_name
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id;

  IF _email IS NULL THEN
    RETURN NEW;
  END IF;

  _message_id := gen_random_uuid()::text;

  _html := '
    <div style="font-family: Segoe UI, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #e8590c, #d94f00); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; font-size: 24px; margin: 0;">Welcome to Jobman!</h1>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Hi ' || COALESCE(_full_name, 'there') || ',
        </p>
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          You are one step away from unlocking the full benefits of Jobman. Complete your ID verification to:
        </p>
        <ul style="color: #555; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0 0 24px;">
          <li><strong>Receive job requests</strong> from customers in your area</li>
          <li><strong>Get paid securely</strong> through our escrow system</li>
          <li><strong>Build trust</strong> with a verified badge on your profile</li>
          <li><strong>Withdraw earnings</strong> to your bank account</li>
          <li><strong>Boost your profile</strong> for more visibility</li>
        </ul>
        <div style="text-align: center; margin: 24px 0;">
          <a href="' || _app_url || '/artisan-verification" style="display: inline-block; background: linear-gradient(135deg, #e8590c, #d94f00); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Verify My ID Now
          </a>
        </div>
        <div style="background: #fff8f5; border-left: 4px solid #e8590c; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
          <p style="color: #333; font-size: 14px; margin: 0;">
            <strong>Quick and Easy:</strong> The verification takes less than 5 minutes. You will need your NIN, a government-issued ID, and a selfie.
          </p>
        </div>
        <p style="color: #888; font-size: 13px; line-height: 1.6; margin: 24px 0 0; text-align: center;">
          Need help? Contact us at <a href="mailto:support@jobman.ng" style="color: #e8590c;">support@jobman.ng</a>
        </p>
      </div>
      <div style="background: #f9f9f9; padding: 16px 24px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #eee;">
        <p style="color: #aaa; font-size: 12px; margin: 0;">2026 Jobman. All rights reserved.</p>
      </div>
    </div>
  ';

  PERFORM public.enqueue_email(
    'transactional_emails',
    jsonb_build_object(
      'to', _email,
      'from', 'Jobman <support@jobman.ng>',
      'sender_domain', 'notify.www.jobman.ng',
      'subject', 'Verify Your ID to Start Receiving Clients on Jobman',
      'html', _html,
      'purpose', 'transactional',
      'label', 'verification_reminder',
      'message_id', _message_id,
      'queued_at', now()::text
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_send_verification_reminder ON public.artisan_profiles;
CREATE TRIGGER tr_send_verification_reminder
  AFTER INSERT ON public.artisan_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_verification_reminder_email();
