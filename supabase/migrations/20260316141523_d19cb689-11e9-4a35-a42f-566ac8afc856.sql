
-- Fix all email triggers to include 'text' parameter

CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _message_id TEXT; _html TEXT; _app_url TEXT := 'https://jobmanmarketplace.lovable.app';
BEGIN
  IF NEW.email IS NULL THEN RETURN NEW; END IF;
  _message_id := gen_random_uuid()::text;
  _html := '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff"><div style="background:linear-gradient(135deg,#e8590c,#d94f00);padding:32px 24px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:#fff;font-size:26px;margin:0">Welcome to Jobman!</h1></div><div style="padding:32px 24px"><p style="color:#333;font-size:16px;line-height:1.6">Hi ' || COALESCE(NEW.full_name, 'there') || ',</p><p style="color:#555;font-size:16px;line-height:1.6">We are thrilled to have you on Jobman — Nigeria''s trusted marketplace connecting customers with skilled artisans.</p><p style="color:#555;font-size:16px;line-height:1.6">Here is what you can do next:</p><ul style="color:#555;font-size:15px;line-height:2;padding-left:20px"><li>Complete your profile to stand out</li><li>Browse available jobs or post your first job</li><li>Connect with verified professionals in your area</li></ul><div style="text-align:center;margin:28px 0"><a href="' || _app_url || '/dashboard" style="display:inline-block;background:linear-gradient(135deg,#e8590c,#d94f00);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Go to Dashboard</a></div><p style="color:#888;font-size:13px;text-align:center">Questions? Reach us at support@jobman.ng</p></div><div style="background:#f9f9f9;padding:16px 24px;text-align:center;border-top:1px solid #eee;border-radius:0 0 8px 8px"><p style="color:#aaa;font-size:12px;margin:0">2026 Jobman. All rights reserved.</p></div></div>';
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'run_id','bpuvhiifnbuytzzbgfln','to',NEW.email,'from','Jobman <support@jobman.ng>','sender_domain','notify.www.jobman.ng',
    'subject','Welcome to Jobman — Let''s Get Started!','html',_html,
    'text','Hi ' || COALESCE(NEW.full_name,'there') || ', Welcome to Jobman! Complete your profile, browse jobs, and connect with professionals. Visit: ' || _app_url || '/dashboard',
    'purpose','transactional','label','welcome','message_id',_message_id,'queued_at',now()::text));
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION public.send_verification_reminder_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _email TEXT; _full_name TEXT; _message_id TEXT; _html TEXT; _app_url TEXT := 'https://jobmanmarketplace.lovable.app';
BEGIN
  IF NEW.verification_status != 'unverified' THEN RETURN NEW; END IF;
  SELECT p.email, p.full_name INTO _email, _full_name FROM public.profiles p WHERE p.user_id = NEW.user_id;
  IF _email IS NULL THEN RETURN NEW; END IF;
  _message_id := gen_random_uuid()::text;
  _html := '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff"><div style="background:linear-gradient(135deg,#e8590c,#d94f00);padding:32px 24px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:#fff;font-size:24px;margin:0">Welcome to Jobman!</h1></div><div style="padding:32px 24px"><p style="color:#333;font-size:16px;line-height:1.6">Hi ' || COALESCE(_full_name,'there') || ',</p><p style="color:#555;font-size:16px;line-height:1.6">You are one step away from unlocking the full benefits of Jobman. Complete your ID verification to receive job requests, get paid securely, build trust with a verified badge, withdraw earnings, and boost your profile.</p><div style="text-align:center;margin:24px 0"><a href="' || _app_url || '/artisan-verification" style="display:inline-block;background:linear-gradient(135deg,#e8590c,#d94f00);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Verify My ID Now</a></div></div><div style="background:#f9f9f9;padding:16px 24px;text-align:center;border-top:1px solid #eee;border-radius:0 0 8px 8px"><p style="color:#aaa;font-size:12px;margin:0">2026 Jobman. All rights reserved.</p></div></div>';
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'run_id','bpuvhiifnbuytzzbgfln','to',_email,'from','Jobman <support@jobman.ng>','sender_domain','notify.www.jobman.ng',
    'subject','Verify Your ID to Start Receiving Clients on Jobman','html',_html,
    'text','Hi ' || COALESCE(_full_name,'there') || ', complete your ID verification on Jobman to receive job requests, get paid, and more. Verify now: ' || _app_url || '/artisan-verification',
    'purpose','transactional','label','verification_reminder','message_id',_message_id,'queued_at',now()::text));
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION public.send_job_booking_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _customer_email TEXT; _customer_name TEXT; _artisan_name TEXT; _message_id TEXT; _html TEXT; _app_url TEXT := 'https://jobmanmarketplace.lovable.app';
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.status != 'agreed' THEN RETURN NEW; END IF;
  SELECT p.email, p.full_name INTO _customer_email, _customer_name FROM public.profiles p WHERE p.user_id = NEW.customer_id;
  SELECT p.full_name INTO _artisan_name FROM public.profiles p WHERE p.user_id = NEW.assigned_artisan_id;
  IF _customer_email IS NULL THEN RETURN NEW; END IF;
  _message_id := gen_random_uuid()::text;
  _html := '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff"><div style="background:linear-gradient(135deg,#e8590c,#d94f00);padding:32px 24px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:#fff;font-size:24px;margin:0">Booking Confirmed!</h1></div><div style="padding:32px 24px"><p style="color:#333;font-size:16px;line-height:1.6">Hi ' || COALESCE(_customer_name,'there') || ',</p><p style="color:#555;font-size:16px;line-height:1.6">Your job "' || LEFT(NEW.title,60) || '" has been confirmed with ' || COALESCE(_artisan_name,'an artisan') || '.</p><div style="background:#f4f4f8;border-radius:8px;padding:16px;margin:16px 0"><p style="margin:0 0 8px;color:#333"><strong>Agreed Price:</strong> ' || COALESCE(NEW.agreed_price::text,'N/A') || '</p><p style="margin:0;color:#333"><strong>Timeline:</strong> ' || COALESCE(NEW.agreed_timeline,'TBC') || '</p></div><div style="text-align:center;margin:24px 0"><a href="' || _app_url || '/jobs/' || NEW.id || '" style="display:inline-block;background:linear-gradient(135deg,#e8590c,#d94f00);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600">View Job Details</a></div></div><div style="background:#f9f9f9;padding:16px 24px;text-align:center;border-top:1px solid #eee;border-radius:0 0 8px 8px"><p style="color:#aaa;font-size:12px;margin:0">2026 Jobman. All rights reserved.</p></div></div>';
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'run_id','bpuvhiifnbuytzzbgfln','to',_customer_email,'from','Jobman <support@jobman.ng>','sender_domain','notify.www.jobman.ng',
    'subject','Booking Confirmed — "' || LEFT(NEW.title,40) || '"','html',_html,
    'text','Hi ' || COALESCE(_customer_name,'there') || ', your job "' || LEFT(NEW.title,60) || '" has been confirmed with ' || COALESCE(_artisan_name,'an artisan') || '. Price: ' || COALESCE(NEW.agreed_price::text,'N/A') || '. View details: ' || _app_url || '/jobs/' || NEW.id,
    'purpose','transactional','label','booking_confirmation','message_id',_message_id,'queued_at',now()::text));
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION public.send_job_completion_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _customer_email TEXT; _customer_name TEXT; _artisan_name TEXT; _message_id TEXT; _html TEXT; _app_url TEXT := 'https://jobmanmarketplace.lovable.app';
BEGIN
  IF OLD.artisan_completed_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.artisan_completed_at IS NULL THEN RETURN NEW; END IF;
  SELECT p.email, p.full_name INTO _customer_email, _customer_name FROM public.profiles p WHERE p.user_id = NEW.customer_id;
  SELECT p.full_name INTO _artisan_name FROM public.profiles p WHERE p.user_id = NEW.assigned_artisan_id;
  IF _customer_email IS NULL THEN RETURN NEW; END IF;
  _message_id := gen_random_uuid()::text;
  _html := '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff"><div style="background:linear-gradient(135deg,#e8590c,#d94f00);padding:32px 24px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:#fff;font-size:24px;margin:0">Job Completed!</h1></div><div style="padding:32px 24px"><p style="color:#333;font-size:16px;line-height:1.6">Hi ' || COALESCE(_customer_name,'there') || ',</p><p style="color:#555;font-size:16px;line-height:1.6">' || COALESCE(_artisan_name,'The artisan') || ' has marked your job "' || LEFT(NEW.title,60) || '" as completed.</p><div style="background:#fff8f5;border-left:4px solid #e8590c;padding:16px;border-radius:0 8px 8px 0;margin:16px 0"><p style="color:#333;font-size:14px;margin:0"><strong>Action Required:</strong> Review and confirm within 48 hours.</p></div><div style="text-align:center;margin:24px 0"><a href="' || _app_url || '/jobs/' || NEW.id || '" style="display:inline-block;background:linear-gradient(135deg,#e8590c,#d94f00);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600">Review and Confirm</a></div></div><div style="background:#f9f9f9;padding:16px 24px;text-align:center;border-top:1px solid #eee;border-radius:0 0 8px 8px"><p style="color:#aaa;font-size:12px;margin:0">2026 Jobman. All rights reserved.</p></div></div>';
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'run_id','bpuvhiifnbuytzzbgfln','to',_customer_email,'from','Jobman <support@jobman.ng>','sender_domain','notify.www.jobman.ng',
    'subject','Job Completed — Review Required for "' || LEFT(NEW.title,40) || '"','html',_html,
    'text','Hi ' || COALESCE(_customer_name,'there') || ', ' || COALESCE(_artisan_name,'the artisan') || ' has completed your job "' || LEFT(NEW.title,60) || '". Please review within 48 hours: ' || _app_url || '/jobs/' || NEW.id,
    'purpose','transactional','label','job_completion','message_id',_message_id,'queued_at',now()::text));
  RETURN NEW;
END;$$;

CREATE OR REPLACE FUNCTION public.send_payment_receipt_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _artisan_email TEXT; _artisan_name TEXT; _customer_name TEXT; _job_title TEXT; _message_id TEXT; _html TEXT; _app_url TEXT := 'https://jobmanmarketplace.lovable.app';
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.status != 'released' THEN RETURN NEW; END IF;
  SELECT p.email, p.full_name INTO _artisan_email, _artisan_name FROM public.profiles p WHERE p.user_id = NEW.payee_id;
  SELECT p.full_name INTO _customer_name FROM public.profiles p WHERE p.user_id = NEW.payer_id;
  SELECT j.title INTO _job_title FROM public.jobs j WHERE j.id = NEW.job_id;
  IF _artisan_email IS NULL THEN RETURN NEW; END IF;
  _message_id := gen_random_uuid()::text;
  _html := '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff"><div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 24px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:#fff;font-size:24px;margin:0">Payment Received!</h1></div><div style="padding:32px 24px"><p style="color:#333;font-size:16px;line-height:1.6">Hi ' || COALESCE(_artisan_name,'there') || ',</p><p style="color:#555;font-size:16px;line-height:1.6">The payment for your job has been released to your wallet.</p><div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #bbf7d0"><p style="margin:0 0 8px;color:#333;font-size:15px"><strong>Job:</strong> ' || COALESCE(LEFT(_job_title,80),'N/A') || '</p><p style="margin:0 0 8px;color:#333;font-size:15px"><strong>Client:</strong> ' || COALESCE(_customer_name,'N/A') || '</p><p style="margin:0;color:#16a34a;font-size:20px;font-weight:700">Amount: NGN ' || NEW.amount::text || '</p></div><div style="text-align:center;margin:24px 0"><a href="' || _app_url || '/wallet" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600">View Wallet</a></div></div><div style="background:#f9f9f9;padding:16px 24px;text-align:center;border-top:1px solid #eee;border-radius:0 0 8px 8px"><p style="color:#aaa;font-size:12px;margin:0">2026 Jobman. All rights reserved.</p></div></div>';
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'run_id','bpuvhiifnbuytzzbgfln','to',_artisan_email,'from','Jobman <support@jobman.ng>','sender_domain','notify.www.jobman.ng',
    'subject','Payment Received — NGN ' || NEW.amount::text || ' for "' || COALESCE(LEFT(_job_title,40),'a job') || '"','html',_html,
    'text','Hi ' || COALESCE(_artisan_name,'there') || ', NGN ' || NEW.amount::text || ' has been released to your Jobman wallet for "' || COALESCE(LEFT(_job_title,60),'a job') || '". View wallet: ' || _app_url || '/wallet',
    'purpose','transactional','label','payment_receipt','message_id',_message_id,'queued_at',now()::text));
  RETURN NEW;
END;$$;
