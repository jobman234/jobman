
-- Add escrow_release_deadline to jobs table
ALTER TABLE public.jobs ADD COLUMN escrow_release_deadline TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update fund_escrow function to set 48hr deadline when escrow is funded
CREATE OR REPLACE FUNCTION public.fund_escrow(_job_id uuid, _payer_id uuid, _payee_id uuid, _amount numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _wallet_id UUID;
  _escrow_id UUID;
  _balance NUMERIC;
BEGIN
  SELECT id, balance INTO _wallet_id, _balance
  FROM public.wallets WHERE user_id = _payer_id FOR UPDATE;

  IF _wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF _balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.wallets SET balance = balance - _amount WHERE id = _wallet_id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference, status)
  VALUES (_wallet_id, 'debit', _amount, 'Escrow payment for job', _job_id::TEXT, 'completed');

  INSERT INTO public.escrows (job_id, payer_id, payee_id, amount)
  VALUES (_job_id, _payer_id, _payee_id, _amount)
  RETURNING id INTO _escrow_id;

  -- Set job to in_progress with 48hr deadline
  UPDATE public.jobs 
  SET status = 'in_progress', 
      escrow_release_deadline = now() + interval '48 hours'
  WHERE id = _job_id;

  RETURN _escrow_id;
END;
$function$;

-- Function to complete job and release escrow
CREATE OR REPLACE FUNCTION public.complete_job(_job_id uuid, _user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _escrow_id UUID;
  _customer_id UUID;
BEGIN
  -- Verify caller is the customer
  SELECT customer_id INTO _customer_id FROM public.jobs WHERE id = _job_id;
  IF _customer_id != _user_id THEN
    RAISE EXCEPTION 'Only the job owner can mark as completed';
  END IF;

  -- Get escrow
  SELECT id INTO _escrow_id FROM public.escrows 
  WHERE job_id = _job_id AND status = 'held';
  
  IF _escrow_id IS NULL THEN
    RAISE EXCEPTION 'No held escrow found for this job';
  END IF;

  -- Release escrow to artisan
  PERFORM public.release_escrow(_escrow_id);

  -- Update job status
  UPDATE public.jobs SET status = 'completed' WHERE id = _job_id;
END;
$function$;

-- Function for auto-releasing expired escrows (called by cron)
CREATE OR REPLACE FUNCTION public.auto_release_expired_escrows()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _job RECORD;
  _count INTEGER := 0;
BEGIN
  FOR _job IN 
    SELECT j.id as job_id, e.id as escrow_id
    FROM public.jobs j
    JOIN public.escrows e ON e.job_id = j.id
    WHERE j.status = 'in_progress'
      AND j.escrow_release_deadline IS NOT NULL
      AND j.escrow_release_deadline <= now()
      AND e.status = 'held'
  LOOP
    PERFORM public.release_escrow(_job.escrow_id);
    UPDATE public.jobs SET status = 'completed' WHERE id = _job.job_id;
    _count := _count + 1;
  END LOOP;
  
  RETURN _count;
END;
$function$;
