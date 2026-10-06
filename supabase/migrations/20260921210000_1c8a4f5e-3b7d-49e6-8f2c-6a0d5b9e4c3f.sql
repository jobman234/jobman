-- CRITICAL, HIGHEST SEVERITY OF THE ENTIRE AUDIT: handle_new_user() has,
-- in every single one of its 8 redefinitions since the very first migration,
-- cast the signup request's own raw_user_meta_data->>'role' STRAIGHT into
-- the app_role enum with no validation:
--
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer'));
--
-- raw_user_meta_data is the `options.data` object passed to
-- supabase.auth.signUp() — entirely client-controlled. Register.tsx's role
-- dropdown only ever sends 'customer' or 'artisan', but nothing stops any
-- caller from hitting the Supabase Auth signup endpoint directly (with
-- nothing more than the public anon key, which ships in every page load)
-- with {"data": {"role": "admin"}} or {"role": "super_admin"} in the body.
-- app_role's enum values are exactly {customer, artisan, admin,
-- super_admin} — so that string casts cleanly, and the trigger inserts a
-- real, fully-privileged admin row for a brand-new, self-registered
-- account. Zero review, zero existing-admin action, one HTTP request.
--
-- This grants everything admin-gated across the whole app: the full admin
-- dashboard, log_admin_action, admin_resolve_dispute (can redirect any
-- escrow), admin_assign_request, approving/rejecting artisan verification
-- (including seeing government ID/selfie via the admin storage policy),
-- reading every user's PII, and initiating real Paystack withdrawal
-- transfers via process-withdrawal.
--
-- Proved with a local Postgres harness replicating the real auth.users
-- trigger: a simulated signup with raw_user_meta_data = {"role":"admin"}
-- produced a genuine 'admin' row in user_roles. Fixed by whitelisting only
-- 'artisan' as a valid client-supplied signup role (everything else,
-- including 'admin'/'super_admin', now falls through to 'customer' — the
-- same safe default every version of this function already used for a
-- missing/absent role). Admin roles must only ever be granted by an
-- existing admin through the already-correctly-gated "Admins can manage
-- roles" policy on user_roles. Verified: the same exploit now lands as
-- 'customer', and real customer/artisan signups are unaffected.
--
-- ACTION NEEDED beyond this migration: this bug has existed since the first
-- migration, so if this project has ever been live, check the actual
-- user_roles table now for any 'admin'/'super_admin' row you don't
-- recognize granting yourself — this migration only stops new exploitation,
-- it does not undo a row already created this way.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _referral_code TEXT;
  _referred_by TEXT;
  _referrer_id UUID;
  _signup_role public.app_role;
BEGIN
  _referral_code := public.generate_referral_code();
  _referred_by := NULLIF(NEW.raw_user_meta_data->>'referral_code', '');

  IF NEW.raw_user_meta_data->>'role' = 'artisan' THEN
    _signup_role := 'artisan';
  ELSE
    _signup_role := 'customer';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, email, phone, state, lga, address, postcode, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'state', ''),
    NULLIF(NEW.raw_user_meta_data->>'lga', ''),
    NULLIF(NEW.raw_user_meta_data->>'address', ''),
    NULLIF(NEW.raw_user_meta_data->>'postcode', ''),
    _referral_code,
    _referred_by
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _signup_role);

  IF _signup_role = 'artisan' THEN
    INSERT INTO public.artisan_profiles (user_id, primary_trade, years_experience, is_public)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'primary_trade', 'General'),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'years_experience', '')::integer, 0),
      false
    );
  END IF;

  -- Create wallet for every user
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);

  -- Record referral event (but do NOT credit wallet yet - wait for verification)
  IF _referred_by IS NOT NULL THEN
    SELECT user_id INTO _referrer_id
    FROM public.profiles
    WHERE referral_code = _referred_by AND user_id != NEW.id;

    IF _referrer_id IS NOT NULL THEN
      INSERT INTO public.referral_events (referrer_id, referred_user_id, reward_amount, referral_credited)
      VALUES (_referrer_id, NEW.id, 300, false);

      PERFORM public.create_notification(
        _referrer_id,
        'referral',
        '👤 New Referral Registered',
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Your referee') || ' has registered on Jobman! They need to complete verification before you earn your ₦300 bonus.',
        '/wallet'
      );

      PERFORM public.create_notification(
        NEW.id,
        'referral',
        '🎯 Complete Your Verification',
        'Complete your ID, address, and reference verification to unlock your referrer''s bonus!',
        '/verify'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
