
-- Add referral_credited flag to track whether reward has been credited
ALTER TABLE public.referral_events ADD COLUMN IF NOT EXISTS referral_credited boolean NOT NULL DEFAULT false;

-- Update handle_new_user to use ₦300 reward and NOT credit immediately
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

  INSERT INTO public.profiles (user_id, full_name, email, phone, state, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'state', ''),
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

-- Create function to credit referral when referee completes verification
CREATE OR REPLACE FUNCTION public.check_and_credit_referral(_referred_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _event RECORD;
  _referrer_wallet_id UUID;
  _has_id BOOLEAN;
  _has_address BOOLEAN;
  _has_references BOOLEAN;
  _referred_name TEXT;
BEGIN
  -- Find uncredited referral event for this user
  SELECT * INTO _event
  FROM public.referral_events
  WHERE referred_user_id = _referred_user_id AND referral_credited = false
  LIMIT 1;

  IF _event IS NULL THEN RETURN; END IF;

  -- Check if referee has completed all verifications
  SELECT 
    (government_id_front_url IS NOT NULL AND nin IS NOT NULL),
    (current_address_state IS NOT NULL AND current_address_street IS NOT NULL AND current_address_lga IS NOT NULL),
    (reference1_name IS NOT NULL AND reference1_phone IS NOT NULL AND reference2_name IS NOT NULL AND reference2_phone IS NOT NULL)
  INTO _has_id, _has_address, _has_references
  FROM public.artisan_profiles WHERE user_id = _referred_user_id;

  -- All three must be complete
  IF NOT (_has_id AND _has_address AND _has_references) THEN RETURN; END IF;

  -- Credit the referrer
  SELECT id INTO _referrer_wallet_id FROM public.wallets WHERE user_id = _event.referrer_id;

  IF _referrer_wallet_id IS NOT NULL THEN
    UPDATE public.wallets 
    SET referral_balance = referral_balance + _event.reward_amount
    WHERE id = _referrer_wallet_id;

    -- Mark as credited
    UPDATE public.referral_events SET referral_credited = true WHERE id = _event.id;

    -- Get referred user's name
    SELECT full_name INTO _referred_name FROM public.profiles WHERE user_id = _referred_user_id;

    -- Notify referrer
    PERFORM public.create_notification(
      _event.referrer_id,
      'referral',
      '🎉 Referral Bonus Earned!',
      'You earned ₦' || _event.reward_amount::TEXT || ' because ' || COALESCE(_referred_name, 'your referee') || ' completed their verification!',
      '/wallet'
    );
  END IF;
END;
$function$;

-- Create trigger to check referral credit on artisan profile updates
CREATE OR REPLACE FUNCTION public.trigger_check_referral_on_verification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if this user has a pending referral credit
  PERFORM public.check_and_credit_referral(NEW.user_id);
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS check_referral_on_artisan_update ON public.artisan_profiles;
CREATE TRIGGER check_referral_on_artisan_update
  AFTER UPDATE ON public.artisan_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_referral_on_verification();

-- Notification triggers for verification progress
CREATE OR REPLACE FUNCTION public.notify_referrer_verification_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _referrer_id UUID;
  _referred_name TEXT;
  _step TEXT := NULL;
BEGIN
  -- Find if this user was referred
  SELECT referrer_id INTO _referrer_id
  FROM public.referral_events
  WHERE referred_user_id = NEW.user_id AND referral_credited = false
  LIMIT 1;

  IF _referrer_id IS NULL THEN RETURN NEW; END IF;

  SELECT full_name INTO _referred_name FROM public.profiles WHERE user_id = NEW.user_id;

  -- Detect which step just completed
  IF (OLD.government_id_front_url IS NULL AND NEW.government_id_front_url IS NOT NULL) 
     OR (OLD.nin IS NULL AND NEW.nin IS NOT NULL) THEN
    _step := 'ID verification';
  ELSIF (OLD.current_address_state IS NULL AND NEW.current_address_state IS NOT NULL)
     OR (OLD.current_address_street IS NULL AND NEW.current_address_street IS NOT NULL) THEN
    _step := 'address verification';
  ELSIF (OLD.reference1_name IS NULL AND NEW.reference1_name IS NOT NULL)
     OR (OLD.reference2_name IS NULL AND NEW.reference2_name IS NOT NULL) THEN
    _step := 'reference verification';
  END IF;

  IF _step IS NOT NULL THEN
    PERFORM public.create_notification(
      _referrer_id,
      'referral',
      '📋 Referee Progress Update',
      COALESCE(_referred_name, 'Your referee') || ' has completed ' || _step || '.',
      '/wallet'
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notify_referrer_on_verification_progress ON public.artisan_profiles;
CREATE TRIGGER notify_referrer_on_verification_progress
  AFTER UPDATE ON public.artisan_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_referrer_verification_progress();

-- Update transfer_referral_to_wallet to check all referees are verified
CREATE OR REPLACE FUNCTION public.transfer_referral_to_wallet(_amount numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _wallet_id UUID;
  _referral_balance NUMERIC;
  _uncredited_count INTEGER;
BEGIN
  SELECT id, referral_balance INTO _wallet_id, _referral_balance
  FROM public.wallets WHERE user_id = auth.uid() FOR UPDATE;

  IF _wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF _amount < 100 THEN
    RAISE EXCEPTION 'Minimum transfer amount is ₦100';
  END IF;

  IF _referral_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient referral balance';
  END IF;

  UPDATE public.wallets
  SET
    referral_balance = referral_balance - _amount,
    balance = balance + _amount
  WHERE id = _wallet_id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, status)
  VALUES (_wallet_id, 'credit', _amount, 'Referral earnings transferred to main wallet', 'completed');
END;
$function$;

-- Remove the old credit_referral_reward trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_referral ON auth.users;
