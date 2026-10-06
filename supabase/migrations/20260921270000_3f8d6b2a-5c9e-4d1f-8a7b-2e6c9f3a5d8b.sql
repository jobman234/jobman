-- Notification preferences: lets a user turn off individual in-app
-- notification categories, and a single master toggle for the transactional
-- emails this app sends (booking confirmation, job completion, payment
-- receipt, verification reminder). The one-time welcome email on signup is
-- not a preference -- it always sends.
--
-- No row here means "everything enabled", matching every user's current
-- behavior today -- a row only gets created the first time someone actually
-- changes a toggle in Settings, so nothing changes for anyone who never
-- visits the panel.
CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_enabled BOOLEAN NOT NULL DEFAULT true,
  referral_enabled BOOLEAN NOT NULL DEFAULT true,
  job_update_enabled BOOLEAN NOT NULL DEFAULT true,
  message_enabled BOOLEAN NOT NULL DEFAULT true,
  dispute_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences" ON public.notification_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- create_notification() is the one place every in-app notification (bell +
-- realtime) flows through, regardless of type, so it's the single point to
-- gate on the per-category toggle.
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _type TEXT,
  _title TEXT,
  _message TEXT,
  _link TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _enabled BOOLEAN;
BEGIN
  SELECT CASE _type
    WHEN 'payment' THEN payment_enabled
    WHEN 'referral' THEN referral_enabled
    WHEN 'job_update' THEN job_update_enabled
    WHEN 'message' THEN message_enabled
    WHEN 'dispute' THEN dispute_enabled
    ELSE true
  END INTO _enabled
  FROM public.notification_preferences
  WHERE user_id = _user_id;

  IF _enabled IS FALSE THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (_user_id, _type, _title, _message, _link);
END;
$$;

-- The four transactional email triggers each get the same one-line guard,
-- right after they resolve the recipient's email, gated on that recipient's
-- own email_enabled preference. Bodies are otherwise byte-for-byte what
-- they already were.
CREATE OR REPLACE FUNCTION public.send_job_booking_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _customer_email TEXT; _customer_name TEXT; _artisan_name TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.status != 'agreed' THEN RETURN NEW; END IF;
  SELECT p.email, p.full_name INTO _customer_email, _customer_name FROM public.profiles p WHERE p.user_id = NEW.customer_id;
  SELECT p.full_name INTO _artisan_name FROM public.profiles p WHERE p.user_id = NEW.assigned_artisan_id;
  IF _customer_email IS NULL THEN RETURN NEW; END IF;
  IF NOT COALESCE((SELECT email_enabled FROM public.notification_preferences WHERE user_id = NEW.customer_id), true) THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://bpuvhiifnbuytzzbgfln.supabase.co/functions/v1/send-email-notification',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('supabase.service_role_key', true)),
    body := jsonb_build_object('to',_customer_email,'subject','✅ Booking Confirmed — "' || LEFT(NEW.title,40) || '"','eventType','booking_confirmation','details',jsonb_build_object('name',COALESCE(_customer_name,'there'),'jobTitle',LEFT(NEW.title,60),'artisanName',COALESCE(_artisan_name,'an artisan'),'price',COALESCE(NEW.agreed_price::text,'N/A'),'timeline',COALESCE(NEW.agreed_timeline,'TBC'),'link','https://www.jobman.ng/jobs/' || NEW.id))
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_job_completion_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _customer_email TEXT; _customer_name TEXT; _artisan_name TEXT;
BEGIN
  IF OLD.artisan_completed_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.artisan_completed_at IS NULL THEN RETURN NEW; END IF;
  SELECT p.email, p.full_name INTO _customer_email, _customer_name FROM public.profiles p WHERE p.user_id = NEW.customer_id;
  SELECT p.full_name INTO _artisan_name FROM public.profiles p WHERE p.user_id = NEW.assigned_artisan_id;
  IF _customer_email IS NULL THEN RETURN NEW; END IF;
  IF NOT COALESCE((SELECT email_enabled FROM public.notification_preferences WHERE user_id = NEW.customer_id), true) THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://bpuvhiifnbuytzzbgfln.supabase.co/functions/v1/send-email-notification',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('supabase.service_role_key', true)),
    body := jsonb_build_object('to',_customer_email,'subject','🎉 Job Completed — Please Review "' || LEFT(NEW.title,40) || '"','eventType','job_completion','details',jsonb_build_object('name',COALESCE(_customer_name,'there'),'jobTitle',LEFT(NEW.title,60),'artisanName',COALESCE(_artisan_name,'the artisan'),'link','https://www.jobman.ng/jobs/' || NEW.id,'message','The artisan has marked your job as completed. Please review the work and release the escrow payment within 48 hours.'))
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_payment_receipt_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _payee_email TEXT; _payee_name TEXT; _job_title TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.status != 'released' THEN RETURN NEW; END IF;
  SELECT p.email, p.full_name INTO _payee_email, _payee_name FROM public.profiles p WHERE p.user_id = NEW.payee_id;
  SELECT j.title INTO _job_title FROM public.jobs j WHERE j.id = NEW.job_id;
  IF _payee_email IS NULL THEN RETURN NEW; END IF;
  IF NOT COALESCE((SELECT email_enabled FROM public.notification_preferences WHERE user_id = NEW.payee_id), true) THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://bpuvhiifnbuytzzbgfln.supabase.co/functions/v1/send-email-notification',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('supabase.service_role_key', true)),
    body := jsonb_build_object('to',_payee_email,'subject','💰 Payment Received — ₦' || NEW.amount::text,'eventType','escrow_released','details',jsonb_build_object('name',COALESCE(_payee_name,'there'),'jobTitle',COALESCE(_job_title,'a job'),'amount',NEW.amount::text,'status','Released','link','https://www.jobman.ng/wallet','message','Great news! The escrow payment has been released and your wallet has been credited.'))
  );
  RETURN NEW;
END;
$function$;

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

  IF _email IS NOT NULL AND COALESCE((SELECT email_enabled FROM public.notification_preferences WHERE user_id = NEW.user_id), true) THEN
    PERFORM net.http_post(
      url := 'https://bpuvhiifnbuytzzbgfln.supabase.co/functions/v1/send-email-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
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
