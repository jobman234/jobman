
CREATE OR REPLACE FUNCTION public.send_verification_reminder_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  _email TEXT;
  _name TEXT;
BEGIN
  SELECT email, full_name INTO _email, _name
  FROM public.profiles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  IF _email IS NOT NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-email-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'to', _email,
        'subject', 'Complete Your Verification on Jobman',
        'eventType', 'verification_reminder',
        'details', jsonb_build_object(
          'name', COALESCE(_name, 'there'),
          'link', 'https://www.jobman.ng/login?redirect=/verify'
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;
