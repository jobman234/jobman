-- purchase_profile_boost(_boost_type, _price, _days) trusted _price and _days
-- as plain client-supplied parameters with no validation against what that
-- boost_type actually costs. Since nothing (any RLS INSERT policy on
-- profile_boosts was already removed by an earlier migration) stops a client
-- from calling this RPC directly with whatever arguments they like, any
-- authenticated user could buy the real "monthly" boost (normally ₦10,000
-- for 30 days) for ₦1 lasting 100 years, simply by calling the RPC with
-- _price=1, _days=36500 instead of what the UI's fixed BOOST_OPTIONS catalog
-- would have sent. Proved it against the exact original function: a wallet
-- with only ₦1 bought a "monthly" boost expiring in 2126.
--
-- Fixed by moving the price/duration catalog server-side and dropping the
-- _price/_days parameters entirely — the function now looks up the real
-- price and duration from _boost_type itself, so the client has no input
-- left to lie about. Verified the old call shape no longer exists (function
-- signature changed) and that a correctly-priced purchase still works
-- end-to-end.
DROP FUNCTION IF EXISTS public.purchase_profile_boost(text, numeric, integer);

CREATE OR REPLACE FUNCTION public.purchase_profile_boost(
  _boost_type TEXT
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
  _price NUMERIC;
  _days INTEGER;
BEGIN
  -- Server-side catalog, matching ProfileBoostDialog.tsx's BOOST_OPTIONS.
  -- Add new tiers here (and in the frontend) rather than trusting the client.
  CASE _boost_type
    WHEN 'weekly' THEN _price := 3000; _days := 7;
    WHEN 'monthly' THEN _price := 10000; _days := 30;
    ELSE RAISE EXCEPTION 'Unknown boost type';
  END CASE;

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

  IF EXISTS (
    SELECT 1 FROM public.profile_boosts
    WHERE user_id = auth.uid() AND is_active = true AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'You already have an active boost';
  END IF;

  UPDATE public.wallets
  SET balance = balance - _price
  WHERE id = _wallet_id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, status)
  VALUES (_wallet_id, 'debit', _price, 'Profile boost - ' || _boost_type, 'completed');

  _expires_at := now() + (_days || ' days')::INTERVAL;

  INSERT INTO public.profile_boosts (user_id, boost_type, expires_at, amount_paid, is_active)
  VALUES (auth.uid(), _boost_type, _expires_at, _price, true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_profile_boost(text) TO authenticated;
