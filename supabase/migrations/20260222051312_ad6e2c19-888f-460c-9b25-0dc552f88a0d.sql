
-- Add artisan_completed_at to track when artisan marks job as done
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS artisan_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Modify fund_escrow to NOT auto-set in_progress (keep status as agreed, no deadline yet)
CREATE OR REPLACE FUNCTION public.fund_escrow(_job_id uuid, _payer_id uuid, _payee_id uuid, _amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    RAISE EXCEPTION 'Insufficient balance. Please fund your wallet first.';
  END IF;

  UPDATE public.wallets SET balance = balance - _amount WHERE id = _wallet_id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference, status)
  VALUES (_wallet_id, 'debit', _amount, 'Payment for job (held in escrow)', _job_id::TEXT, 'completed');

  INSERT INTO public.escrows (job_id, payer_id, payee_id, amount)
  VALUES (_job_id, _payer_id, _payee_id, _amount)
  RETURNING id INTO _escrow_id;

  -- Notify artisan that payment has been made
  PERFORM public.create_notification(
    _payee_id,
    'payment',
    'Payment Received!',
    'Customer has funded ₦' || _amount::TEXT || ' for your job. You can now start the project.',
    '/jobs/' || _job_id
  );

  RETURN _escrow_id;
END;
$function$;

-- Create start_job RPC for artisan to mark job as started
CREATE OR REPLACE FUNCTION public.start_job(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _artisan_id UUID;
  _customer_id UUID;
  _job_status job_status;
  _escrow_exists BOOLEAN;
BEGIN
  SELECT status, assigned_artisan_id, customer_id INTO _job_status, _artisan_id, _customer_id
  FROM public.jobs WHERE id = _job_id;

  IF _artisan_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned artisan can start this job';
  END IF;

  IF _job_status != 'agreed' THEN
    RAISE EXCEPTION 'Job must be in agreed status to start';
  END IF;

  -- Verify escrow exists
  SELECT EXISTS(SELECT 1 FROM public.escrows WHERE job_id = _job_id AND status = 'held')
  INTO _escrow_exists;

  IF NOT _escrow_exists THEN
    RAISE EXCEPTION 'Payment must be funded before starting the job';
  END IF;

  UPDATE public.jobs 
  SET status = 'in_progress'
  WHERE id = _job_id;

  -- Notify customer
  PERFORM public.create_notification(
    _customer_id,
    'job_update',
    'Job Started!',
    'The artisan has started working on your job.',
    '/jobs/' || _job_id
  );
END;
$function$;

-- Create artisan_mark_complete RPC
CREATE OR REPLACE FUNCTION public.artisan_mark_complete(_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _artisan_id UUID;
  _customer_id UUID;
  _job_status job_status;
BEGIN
  SELECT status, assigned_artisan_id, customer_id INTO _job_status, _artisan_id, _customer_id
  FROM public.jobs WHERE id = _job_id;

  IF _artisan_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the assigned artisan can mark this job as complete';
  END IF;

  IF _job_status != 'in_progress' THEN
    RAISE EXCEPTION 'Job must be in progress to mark as complete';
  END IF;

  UPDATE public.jobs 
  SET artisan_completed_at = now(),
      escrow_release_deadline = now() + interval '48 hours'
  WHERE id = _job_id;

  -- Notify customer to review
  PERFORM public.create_notification(
    _customer_id,
    'job_update',
    'Job Completed - Review Required',
    'The artisan has marked the job as completed. Please review and accept or raise a dispute within 48 hours.',
    '/jobs/' || _job_id
  );
END;
$function$;

-- Update complete_job to be the customer acceptance action
CREATE OR REPLACE FUNCTION public.complete_job(_job_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _escrow_id UUID;
  _customer_id UUID;
BEGIN
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
$function$;

-- Update auto_release to check artisan_completed_at
CREATE OR REPLACE FUNCTION public.auto_release_expired_escrows()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
      AND j.artisan_completed_at IS NOT NULL
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
