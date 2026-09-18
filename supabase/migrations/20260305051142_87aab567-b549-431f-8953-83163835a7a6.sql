
-- 1. Function to notify artisans when a new job matching their trade is posted
CREATE OR REPLACE FUNCTION public.notify_artisans_new_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _artisan RECORD;
BEGIN
  -- Only notify on new open jobs (not direct hires which go to in_negotiation)
  IF NEW.status = 'open' THEN
    FOR _artisan IN
      SELECT ap.user_id
      FROM public.artisan_profiles ap
      WHERE ap.primary_trade = NEW.trade_category
        AND ap.verification_status = 'approved'
        AND ap.is_public = true
        AND ap.user_id != NEW.customer_id
    LOOP
      PERFORM public.create_notification(
        _artisan.user_id,
        'job_alert',
        '🔔 New Job in Your Trade!',
        'A new job "' || LEFT(NEW.title, 50) || '" has been posted in ' || NEW.trade_category || '. Bid now!',
        '/jobs/' || NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for new job notifications
DROP TRIGGER IF EXISTS trg_notify_artisans_new_job ON public.jobs;
CREATE TRIGGER trg_notify_artisans_new_job
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_artisans_new_job();

-- 2. Function to atomically purchase a profile boost
CREATE OR REPLACE FUNCTION public.purchase_profile_boost(
  _boost_type TEXT,
  _price NUMERIC,
  _days INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _wallet_id UUID;
  _balance NUMERIC;
  _expires_at TIMESTAMPTZ;
BEGIN
  -- Get wallet with lock
  SELECT id, balance INTO _wallet_id, _balance
  FROM public.wallets
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF _wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF _balance < _price THEN
    RAISE EXCEPTION 'Insufficient wallet balance. You need ₦% but have ₦%', _price, _balance;
  END IF;

  -- Check for existing active boost
  IF EXISTS (
    SELECT 1 FROM public.profile_boosts
    WHERE user_id = auth.uid() AND is_active = true AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'You already have an active boost';
  END IF;

  -- Debit wallet
  UPDATE public.wallets
  SET balance = balance - _price
  WHERE id = _wallet_id;

  -- Record transaction
  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, status)
  VALUES (_wallet_id, 'debit', _price, 'Profile boost - ' || _boost_type, 'completed');

  -- Create boost
  _expires_at := now() + (_days || ' days')::INTERVAL;
  
  INSERT INTO public.profile_boosts (user_id, boost_type, expires_at, amount_paid, is_active)
  VALUES (auth.uid(), _boost_type, _expires_at, _price, true);
END;
$$;
