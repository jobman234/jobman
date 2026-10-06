-- CRITICAL: two compounding issues meant any artisan could appear as a
-- verified, publicly bookable professional with zero admin review.
--
-- 1. handle_new_user() has always inserted new artisan_profiles rows with
--    is_public = true — a brand new signup was publicly listed on
--    FindArtisan and the homepage carousel from the moment of registration,
--    before submitting a single verification document. The public view
--    (artisan_profiles_public) filters only on is_public = true — it never
--    checks verification_status. Fixed here to default to false; approval
--    already sets is_public = true (see AdminVerifications.tsx).
--
-- 2. "Artisans can update own profile" is a plain row-scoped RLS policy
--    (auth.uid() = user_id) with no column restriction, so nothing has ever
--    stopped an artisan from calling the client directly and setting
--    verification_status = 'approved' / is_public = true on their own row —
--    fully bypassing admin review. Fixed with a trigger that lets a
--    non-admin move unverified/rejected -> pending (the legitimate "submit
--    for review" transition) and toggle is_public only once already
--    approved, and blocks every other change to these columns outright.
--    Admin-performed updates (checked via has_role) are unaffected.

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

-- Existing artisan rows that are already public but were never actually
-- approved should not stay publicly listed after this fix ships. Only
-- touches rows an admin never approved.
UPDATE public.artisan_profiles
SET is_public = false
WHERE is_public = true AND verification_status != 'approved';

CREATE OR REPLACE FUNCTION public.protect_artisan_verification_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Admins make these decisions directly; nothing below applies to them.
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT (OLD.verification_status IN ('unverified', 'rejected') AND NEW.verification_status = 'pending') THEN
      RAISE EXCEPTION 'Only an admin can change verification status';
    END IF;
  END IF;

  IF NEW.is_public IS DISTINCT FROM OLD.is_public THEN
    IF OLD.verification_status != 'approved' THEN
      RAISE EXCEPTION 'Your profile becomes public once an admin approves your verification';
    END IF;
  END IF;

  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    RAISE EXCEPTION 'Only an admin can set approved_at';
  END IF;

  IF NEW.rejection_note IS DISTINCT FROM OLD.rejection_note THEN
    RAISE EXCEPTION 'Only an admin can set rejection_note';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_artisan_verification_columns_trigger ON public.artisan_profiles;
CREATE TRIGGER protect_artisan_verification_columns_trigger
  BEFORE UPDATE ON public.artisan_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_artisan_verification_columns();
