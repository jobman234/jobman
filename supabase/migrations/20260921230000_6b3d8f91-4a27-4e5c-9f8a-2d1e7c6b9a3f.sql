-- fund_escrow() validates the payer, the job, and that _payee_id matches the
-- job's assigned artisan, but never checks that the artisan is still
-- verification_status = 'approved'. The only place that check happens today
-- is client-side in JobDetail.tsx (the Pay button is disabled when
-- !artisanIsVerified) -- trivially bypassed by calling the RPC directly with
-- a valid session token. This doesn't let anyone divert funds (the payee is
-- still cross-checked against the real assigned artisan on the real job),
-- but it does let a customer fund escrow to an artisan whose verification
-- was revoked/rejected after assignment, which should be a hard stop.
CREATE OR REPLACE FUNCTION public.fund_escrow(
  _job_id UUID,
  _payer_id UUID,
  _payee_id UUID,
  _amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _wallet_id UUID;
  _escrow_id UUID;
  _balance NUMERIC;
  _job RECORD;
  _payee_verification public.verification_status;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != _payer_id THEN
    RAISE EXCEPTION 'You can only fund escrow from your own wallet';
  END IF;

  SELECT * INTO _job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF _job IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  IF _job.customer_id != _payer_id THEN
    RAISE EXCEPTION 'You are not the customer on this job';
  END IF;
  IF _job.assigned_artisan_id IS DISTINCT FROM _payee_id THEN
    RAISE EXCEPTION 'payee_id does not match the artisan assigned to this job';
  END IF;
  IF EXISTS (SELECT 1 FROM public.escrows WHERE job_id = _job_id) THEN
    RAISE EXCEPTION 'This job already has an escrow';
  END IF;

  SELECT verification_status INTO _payee_verification
  FROM public.artisan_profiles WHERE user_id = _payee_id;

  IF _payee_verification IS DISTINCT FROM 'approved'::public.verification_status THEN
    RAISE EXCEPTION 'This artisan is not currently verified. Payment cannot be processed.';
  END IF;

  SELECT id, balance INTO _wallet_id, _balance
  FROM public.wallets WHERE user_id = _payer_id FOR UPDATE;

  IF _wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF _balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance. Please fund your wallet first.';
  END IF;

  UPDATE public.wallets SET balance = balance - _amount WHERE id = _wallet_id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference, status)
  VALUES (_wallet_id, 'debit', _amount, 'Payment for job (held in escrow)', _job_id::TEXT, 'completed');

  INSERT INTO public.escrows (job_id, payer_id, payee_id, amount)
  VALUES (_job_id, _payer_id, _payee_id, _amount)
  RETURNING id INTO _escrow_id;

  PERFORM public.create_notification(
    _payee_id,
    'payment',
    'Payment Received!',
    'Customer has funded ₦' || _amount::TEXT || ' for your job. You can now start the project.',
    '/jobs/' || _job_id
  );

  RETURN _escrow_id;
END;
$$;
