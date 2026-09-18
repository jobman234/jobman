-- Update the referral reward amount from 1500 to 700
ALTER TABLE public.referral_events ALTER COLUMN reward_amount SET DEFAULT 700;

-- Update the trigger function that credits referral rewards
CREATE OR REPLACE FUNCTION public.credit_referral_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _referrer_id UUID;
  _referrer_wallet_id UUID;
BEGIN
  -- Check if user was referred
  IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
    -- Find referrer by referral code
    SELECT user_id INTO _referrer_id
    FROM public.profiles
    WHERE referral_code = NEW.raw_user_meta_data->>'referred_by';

    IF _referrer_id IS NOT NULL THEN
      -- Get or create referrer wallet
      SELECT id INTO _referrer_wallet_id
      FROM public.wallets WHERE user_id = _referrer_id;

      IF _referrer_wallet_id IS NOT NULL THEN
        -- Credit referral balance
        UPDATE public.wallets 
        SET referral_balance = referral_balance + 700
        WHERE id = _referrer_wallet_id;

        -- Log the referral event
        INSERT INTO public.referral_events (referrer_id, referred_user_id, reward_amount)
        VALUES (_referrer_id, NEW.id, 700);

        -- Notify the referrer
        PERFORM public.create_notification(
          _referrer_id,
          'referral',
          '🎉 Referral Reward!',
          'You earned ₦700 for inviting ' || COALESCE(NEW.raw_user_meta_data->>'full_name', 'a new user') || ' to Jobman!',
          '/wallet'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
