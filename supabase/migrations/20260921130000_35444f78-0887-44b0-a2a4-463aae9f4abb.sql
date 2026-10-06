-- CRITICAL: fund_escrow() and complete_job() both take identity as a plain
-- parameter (_payer_id / _user_id) and never check it against auth.uid() —
-- the actual authenticated caller. Neither function is SECURITY DEFINER-safe
-- against a client that simply supplies someone else's id.
--
-- fund_escrow() is the worse of the two: it debits _payer_id's wallet
-- directly and inserts an escrow row with WHATEVER job_id/payer_id/payee_id
-- the caller passes — it never even checks the job actually belongs to
-- those people. Chained with complete_job()'s identical gap (which never
-- checks _user_id against auth.uid() either, only against the job's real
-- customer_id — a value the attacker can simply read and pass through),
-- this is a complete wallet-draining exploit: debit a stranger's wallet into
-- a fabricated escrow tied to any existing job, then force that escrow
-- released to an account you control, entirely without the victim, the real
-- customer, or the real artisan ever being involved.
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

CREATE OR REPLACE FUNCTION public.complete_job(_job_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _escrow_id UUID;
  _customer_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != _user_id THEN
    RAISE EXCEPTION 'You can only accept completion for yourself';
  END IF;

  SELECT customer_id INTO _customer_id FROM public.jobs WHERE id = _job_id;
  IF _customer_id != _user_id THEN
    RAISE EXCEPTION 'Only the job owner can accept completion';
  END IF;

  SELECT id INTO _escrow_id FROM public.escrows
  WHERE job_id = _job_id AND status = 'held';

  IF _escrow_id IS NULL THEN
    RAISE EXCEPTION 'No held escrow found for this job';
  END IF;

  PERFORM public.release_escrow(_escrow_id);
  UPDATE public.jobs SET status = 'completed' WHERE id = _job_id;
END;
$$;
