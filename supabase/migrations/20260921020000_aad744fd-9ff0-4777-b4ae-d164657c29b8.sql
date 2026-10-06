-- Wallet funding was a disabled "coming soon" button with no backend at all,
-- which meant a customer could never actually get money into their wallet to
-- fund an escrow. This adds a Paystack-backed top-up flow.
--
-- wallet_topups tracks each funding attempt by its Paystack reference so the
-- credit can only ever be applied once, however many times verification runs
-- (client redirect callback + webhook can both fire for the same payment).
CREATE TABLE public.wallet_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  paystack_reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX idx_wallet_topups_user ON public.wallet_topups(user_id);

ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

-- Rows are only ever written by edge functions using the service role key
-- (initialization and verification both happen server-side against the live
-- Paystack API), so authenticated users only need read access to their own.
CREATE POLICY "Users can view own topups" ON public.wallet_topups
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all topups" ON public.wallet_topups
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Applies a verified topup exactly once: credits the wallet, records the
-- transaction, and marks the topup 'success' — but only on the first call
-- for a given reference. Safe to call repeatedly (webhook retries, the
-- browser redirect callback, and a manual admin re-check can all race).
CREATE OR REPLACE FUNCTION public.apply_wallet_topup(_paystack_reference TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _topup RECORD;
BEGIN
  SELECT * INTO _topup
  FROM public.wallet_topups
  WHERE paystack_reference = _paystack_reference
  FOR UPDATE;

  IF _topup IS NULL THEN
    RAISE EXCEPTION 'Unknown topup reference';
  END IF;

  IF _topup.status = 'success' THEN
    RETURN FALSE; -- already applied, nothing to do
  END IF;

  UPDATE public.wallets SET balance = balance + _topup.amount WHERE id = _topup.wallet_id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference, status)
  VALUES (_topup.wallet_id, 'credit', _topup.amount, 'Wallet funding via Paystack', _topup.paystack_reference, 'completed');

  UPDATE public.wallet_topups
  SET status = 'success', verified_at = now()
  WHERE id = _topup.id;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_wallet_topup(TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_wallet_topup(TEXT) TO service_role;
