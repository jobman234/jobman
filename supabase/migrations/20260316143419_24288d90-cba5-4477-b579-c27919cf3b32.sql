
-- Switch all transactional email triggers to call send-email-notification edge function (Resend)

CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _email TEXT; _name TEXT;
BEGIN
  _email := NEW.email;
  _name := COALESCE(NEW.full_name, 'there');
  IF _email IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://bpuvhiifnbuytzzbgfln.supabase.co/functions/v1/send-email-notification',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('supabase.service_role_key', true)),
    body := jsonb_build_object('to',_email,'subject','Welcome to Jobman! 🎉','eventType','welcome','details',jsonb_build_object('name',_name,'link','https://jobmanmarketplace.lovable.app/dashboard','message','Welcome to Jobman — Nigeria''s trusted marketplace connecting skilled artisans with customers who need quality work done.'))
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_verification_reminder_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _email TEXT; _name TEXT;
BEGIN
  IF NEW.verification_status != 'unverified' THEN RETURN NEW; END IF;
  SELECT p.email, p.full_name INTO _email, _name FROM public.profiles p WHERE p.user_id = NEW.user_id;
  IF _email IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://bpuvhiifnbuytzzbgfln.supabase.co/functions/v1/send-email-notification',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('supabase.service_role_key', true)),
    body := jsonb_build_object('to',_email,'subject','🔔 Complete Your Verification to Start Earning','eventType','verification_reminder','details',jsonb_build_object('name',COALESCE(_name,'there'),'link','https://jobmanmarketplace.lovable.app/artisan-verification','message','You are one step away from receiving jobs and earning on Jobman. Complete your ID verification to unlock all features.'))
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_job_booking_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _customer_email TEXT; _customer_name TEXT; _artisan_name TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.status != 'agreed' THEN RETURN NEW; END IF;
  SELECT p.email, p.full_name INTO _customer_email, _customer_name FROM public.profiles p WHERE p.user_id = NEW.customer_id;
  SELECT p.full_name INTO _artisan_name FROM public.profiles p WHERE p.user_id = NEW.assigned_artisan_id;
  IF _customer_email IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://bpuvhiifnbuytzzbgfln.supabase.co/functions/v1/send-email-notification',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('supabase.service_role_key', true)),
    body := jsonb_build_object('to',_customer_email,'subject','✅ Booking Confirmed — "' || LEFT(NEW.title,40) || '"','eventType','booking_confirmation','details',jsonb_build_object('name',COALESCE(_customer_name,'there'),'jobTitle',LEFT(NEW.title,60),'artisanName',COALESCE(_artisan_name,'an artisan'),'price',COALESCE(NEW.agreed_price::text,'N/A'),'timeline',COALESCE(NEW.agreed_timeline,'TBC'),'link','https://jobmanmarketplace.lovable.app/jobs/' || NEW.id))
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_job_completion_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _customer_email TEXT; _customer_name TEXT; _artisan_name TEXT;
BEGIN
  IF OLD.artisan_completed_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.artisan_completed_at IS NULL THEN RETURN NEW; END IF;
  SELECT p.email, p.full_name INTO _customer_email, _customer_name FROM public.profiles p WHERE p.user_id = NEW.customer_id;
  SELECT p.full_name INTO _artisan_name FROM public.profiles p WHERE p.user_id = NEW.assigned_artisan_id;
  IF _customer_email IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://bpuvhiifnbuytzzbgfln.supabase.co/functions/v1/send-email-notification',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('supabase.service_role_key', true)),
    body := jsonb_build_object('to',_customer_email,'subject','🎉 Job Completed — Please Review "' || LEFT(NEW.title,40) || '"','eventType','job_completion','details',jsonb_build_object('name',COALESCE(_customer_name,'there'),'jobTitle',LEFT(NEW.title,60),'artisanName',COALESCE(_artisan_name,'the artisan'),'link','https://jobmanmarketplace.lovable.app/jobs/' || NEW.id,'message','The artisan has marked your job as completed. Please review the work and release the escrow payment within 48 hours.'))
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_payment_receipt_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _payee_email TEXT; _payee_name TEXT; _job_title TEXT;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.status != 'released' THEN RETURN NEW; END IF;
  SELECT p.email, p.full_name INTO _payee_email, _payee_name FROM public.profiles p WHERE p.user_id = NEW.payee_id;
  SELECT j.title INTO _job_title FROM public.jobs j WHERE j.id = NEW.job_id;
  IF _payee_email IS NULL THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := 'https://bpuvhiifnbuytzzbgfln.supabase.co/functions/v1/send-email-notification',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('supabase.service_role_key', true)),
    body := jsonb_build_object('to',_payee_email,'subject','💰 Payment Received — ₦' || NEW.amount::text,'eventType','escrow_released','details',jsonb_build_object('name',COALESCE(_payee_name,'there'),'jobTitle',COALESCE(_job_title,'a job'),'amount',NEW.amount::text,'status','Released','link','https://jobmanmarketplace.lovable.app/wallet','message','Great news! The escrow payment has been released and your wallet has been credited.'))
  );
  RETURN NEW;
END;
$$;
