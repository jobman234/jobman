-- Bank withdrawals: the "Withdraw" button was a disabled placeholder. This adds
-- a conservative request/approve flow rather than instant self-service payout,
-- since Paystack transfers are typically OTP-gated to the business's own phone
-- (an artisan can't complete that step) and moving money OUT deserves a human
-- checkpoint before it leaves the platform.
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  bank_code TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'awaiting_otp', 'paid', 'rejected', 'failed')),
  paystack_recipient_code TEXT,
  paystack_transfer_code TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_withdrawal_requests_user ON public.withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawal requests" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Debits the wallet immediately (so the same balance can't be withdrawn twice
-- while a request is pending) and files the request for admin processing.
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _user_id UUID,
  _amount NUMERIC,
  _bank_code TEXT,
  _bank_name TEXT,
  _account_number TEXT,
  _account_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _wallet_id UUID;
  _balance NUMERIC;
  _request_id UUID;
BEGIN
  SELECT id, balance INTO _wallet_id, _balance
  FROM public.wallets WHERE user_id = _user_id FOR UPDATE;

  IF _wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF _balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.wallets SET balance = balance - _amount WHERE id = _wallet_id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, status)
  VALUES (_wallet_id, 'debit', _amount, 'Withdrawal requested', 'completed');

  INSERT INTO public.withdrawal_requests (user_id, wallet_id, amount, bank_code, bank_name, account_number, account_name)
  VALUES (_user_id, _wallet_id, _amount, _bank_code, _bank_name, _account_number, _account_name)
  RETURNING id INTO _request_id;

  RETURN _request_id;
END;
$$;

-- Refunds a pending/awaiting_otp/failed request back to the wallet and closes it.
-- Used both for admin rejection and for a failed Paystack transfer.
CREATE OR REPLACE FUNCTION public.close_withdrawal_request(
  _request_id UUID,
  _new_status TEXT,
  _note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _req RECORD;
BEGIN
  IF _new_status NOT IN ('rejected', 'failed') THEN
    RAISE EXCEPTION 'Invalid status for close_withdrawal_request';
  END IF;

  SELECT * INTO _req FROM public.withdrawal_requests WHERE id = _request_id FOR UPDATE;
  IF _req IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  IF _req.status NOT IN ('pending', 'awaiting_otp') THEN
    RAISE EXCEPTION 'Request is already %', _req.status;
  END IF;

  UPDATE public.wallets SET balance = balance + _req.amount WHERE id = _req.wallet_id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, status)
  VALUES (_req.wallet_id, 'credit', _req.amount, 'Withdrawal ' || _new_status || ' — refunded', 'reversed');

  UPDATE public.withdrawal_requests
  SET status = _new_status, admin_note = _note, processed_at = now()
  WHERE id = _request_id;
END;
$$;

-- Marks a request paid after Paystack confirms the transfer. No wallet change
-- (the debit already happened at request time).
CREATE OR REPLACE FUNCTION public.mark_withdrawal_paid(
  _request_id UUID,
  _transfer_code TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.withdrawal_requests
  SET status = 'paid', paystack_transfer_code = _transfer_code, processed_at = now()
  WHERE id = _request_id AND status IN ('pending', 'awaiting_otp');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already resolved';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_withdrawal_processing(
  _request_id UUID,
  _recipient_code TEXT,
  _transfer_code TEXT,
  _status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _status NOT IN ('pending', 'awaiting_otp') THEN
    RAISE EXCEPTION 'Invalid status for set_withdrawal_processing';
  END IF;

  UPDATE public.withdrawal_requests
  SET paystack_recipient_code = COALESCE(_recipient_code, paystack_recipient_code),
      paystack_transfer_code = COALESCE(_transfer_code, paystack_transfer_code),
      status = _status
  WHERE id = _request_id;
END;
$$;

-- These are only ever called from trusted server-side edge functions:
-- request_withdrawal is invoked with the caller's own verified user id,
-- everything else is an admin-only payout action.
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.close_withdrawal_request(UUID, TEXT, TEXT) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_withdrawal_paid(UUID, TEXT) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_withdrawal_processing(UUID, TEXT, TEXT, TEXT) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.request_withdrawal(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.close_withdrawal_request(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_paid(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_withdrawal_processing(UUID, TEXT, TEXT, TEXT) TO service_role;
