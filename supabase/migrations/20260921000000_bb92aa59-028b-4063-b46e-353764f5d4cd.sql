-- The Register form has always collected a full address (house number, street,
-- landmark, city, LGA, postcode) but handle_new_user() only ever persisted
-- full_name/email/phone/state — postcode and the rest of the address were
-- silently dropped. Add the missing columns and start saving them.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS postcode TEXT,
  ADD CONSTRAINT profiles_postcode_format CHECK (postcode IS NULL OR postcode ~* '^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$');

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
BEGIN
  -- Generate unique referral code for new user
  _referral_code := public.generate_referral_code();
  _referred_by := NULLIF(NEW.raw_user_meta_data->>'referral_code', '');

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
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer')
  );

  IF COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'artisan' THEN
    INSERT INTO public.artisan_profiles (user_id, primary_trade, years_experience, is_public)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'primary_trade', 'General'),
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'years_experience', '')::integer, 0),
      true
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
      -- Record event with ₦300 reward, but referral_credited = false
      INSERT INTO public.referral_events (referrer_id, referred_user_id, reward_amount, referral_credited)
      VALUES (_referrer_id, NEW.id, 300, false);

      -- Notify referrer that their referee has registered
      PERFORM public.create_notification(
        _referrer_id,
        'referral',
        '👤 New Referral Registered',
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Your referee') || ' has registered on Jobman! They need to complete verification before you earn your ₦300 bonus.',
        '/wallet'
      );

      -- Notify the referred user to complete verification
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
