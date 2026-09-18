
-- Add referral_code and referred_by to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- Add referral_balance to wallets table (separate from main balance)
ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS referral_balance NUMERIC NOT NULL DEFAULT 0;

-- Create referral_events table to track referral completions
CREATE TABLE IF NOT EXISTS public.referral_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,           -- user who referred
  referred_user_id UUID NOT NULL,       -- the new user
  reward_amount NUMERIC NOT NULL DEFAULT 1500,
  rewarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referred_user_id)              -- each user can only be referred once
);

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

-- Users can see their own referral events (as referrer)
CREATE POLICY "Users can view own referrals"
  ON public.referral_events FOR SELECT
  USING (auth.uid() = referrer_id);

-- Admins can see all
CREATE POLICY "Admins can view all referrals"
  ON public.referral_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Generate unique referral code function
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
  _code TEXT;
  _exists BOOLEAN;
BEGIN
  LOOP
    _code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = _code) INTO _exists;
    EXIT WHEN NOT _exists;
  END LOOP;
  RETURN _code;
END;
$function$;

-- Backfill referral codes for existing profiles
UPDATE public.profiles 
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- Update handle_new_user to generate referral code and credit referrer
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
  _referrer_wallet_id UUID;
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

  -- Credit referrer if a valid referral code was used
  IF _referred_by IS NOT NULL THEN
    SELECT user_id INTO _referrer_id
    FROM public.profiles
    WHERE referral_code = _referred_by AND user_id != NEW.id;

    IF _referrer_id IS NOT NULL THEN
      SELECT id INTO _referrer_wallet_id FROM public.wallets WHERE user_id = _referrer_id;

      IF _referrer_wallet_id IS NOT NULL THEN
        -- Credit referral balance
        UPDATE public.wallets 
        SET referral_balance = referral_balance + 1500
        WHERE id = _referrer_wallet_id;

        -- Log the referral event
        INSERT INTO public.referral_events (referrer_id, referred_user_id, reward_amount)
        VALUES (_referrer_id, NEW.id, 1500);

        -- Notify the referrer
        PERFORM public.create_notification(
          _referrer_id,
          'referral',
          '🎉 Referral Reward!',
          'You earned ₦1,500 for inviting ' || COALESCE(NEW.raw_user_meta_data->>'full_name', 'a new user') || ' to Jobman!',
          '/wallet'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
