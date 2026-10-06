-- Dispute resolution correctness. The admin UI's "Refund customer" path only
-- ever updated escrows.status to 'refunded' — it fetched the customer's
-- wallet id and then never used it (the code's own comment: "This would
-- ideally be a DB function but for simplicity"). The held funds were never
-- actually credited back; the dispute just looked resolved while the money
-- vanished. "Partial split" had no backend at all — selecting it just wrote
-- a status with zero effect on the frozen escrow. "Close without action"
-- left the escrow permanently stuck in 'disputed' with no way to reach
-- release or refund afterwards.
--
-- This replaces all four paths with one atomic, admin-gated RPC so a client
-- can no longer half-apply a resolution.
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  _dispute_id UUID,
  _resolution TEXT, -- 'resolved_artisan' | 'resolved_customer' | 'resolved_split' | 'closed'
  _admin_notes TEXT,
  _artisan_amount NUMERIC DEFAULT NULL,
  _customer_amount NUMERIC DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _dispute RECORD;
  _escrow RECORD;
  _wallet_id UUID;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO _dispute FROM public.disputes WHERE id = _dispute_id FOR UPDATE;
  IF _dispute IS NULL THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;
  IF _dispute.status NOT IN ('open', 'under_review') THEN
    RAISE EXCEPTION 'Dispute is already %', _dispute.status;
  END IF;

  SELECT * INTO _escrow FROM public.escrows WHERE id = _dispute.escrow_id FOR UPDATE;
  IF _escrow IS NULL THEN
    RAISE EXCEPTION 'Escrow not found';
  END IF;

  IF _resolution = 'resolved_artisan' THEN
    SELECT id INTO _wallet_id FROM public.wallets WHERE user_id = _escrow.payee_id;
    UPDATE public.wallets SET balance = balance + _escrow.amount WHERE id = _wallet_id;
    INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference, status)
      VALUES (_wallet_id, 'credit', _escrow.amount, 'Dispute resolved — released to artisan', _dispute.job_id::TEXT, 'completed');
    UPDATE public.escrows SET status = 'released', released_at = now() WHERE id = _escrow.id;
    UPDATE public.jobs SET status = 'completed' WHERE id = _dispute.job_id;

  ELSIF _resolution = 'resolved_customer' THEN
    SELECT id INTO _wallet_id FROM public.wallets WHERE user_id = _escrow.payer_id;
    UPDATE public.wallets SET balance = balance + _escrow.amount WHERE id = _wallet_id;
    INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference, status)
      VALUES (_wallet_id, 'credit', _escrow.amount, 'Dispute resolved — refunded to customer', _dispute.job_id::TEXT, 'reversed');
    UPDATE public.escrows SET status = 'refunded', refunded_at = now() WHERE id = _escrow.id;
    UPDATE public.jobs SET status = 'cancelled' WHERE id = _dispute.job_id;

  ELSIF _resolution = 'resolved_split' THEN
    IF _artisan_amount IS NULL OR _customer_amount IS NULL OR _artisan_amount < 0 OR _customer_amount < 0 THEN
      RAISE EXCEPTION 'Provide non-negative split amounts for both parties';
    END IF;
    IF _artisan_amount + _customer_amount != _escrow.amount THEN
      RAISE EXCEPTION 'Split amounts must add up to the escrow total (%)', _escrow.amount;
    END IF;

    IF _artisan_amount > 0 THEN
      SELECT id INTO _wallet_id FROM public.wallets WHERE user_id = _escrow.payee_id;
      UPDATE public.wallets SET balance = balance + _artisan_amount WHERE id = _wallet_id;
      INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference, status)
        VALUES (_wallet_id, 'credit', _artisan_amount, 'Dispute resolved — partial split to artisan', _dispute.job_id::TEXT, 'completed');
    END IF;
    IF _customer_amount > 0 THEN
      SELECT id INTO _wallet_id FROM public.wallets WHERE user_id = _escrow.payer_id;
      UPDATE public.wallets SET balance = balance + _customer_amount WHERE id = _wallet_id;
      INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference, status)
        VALUES (_wallet_id, 'credit', _customer_amount, 'Dispute resolved — partial split refund to customer', _dispute.job_id::TEXT, 'reversed');
    END IF;
    UPDATE public.escrows SET status = 'released', released_at = now() WHERE id = _escrow.id;
    UPDATE public.jobs SET status = 'completed' WHERE id = _dispute.job_id;

  ELSIF _resolution = 'closed' THEN
    -- Dismissed with no fault found: unfreeze the escrow so the job can
    -- reach its normal completion/dispute path again instead of being stuck.
    UPDATE public.escrows SET status = 'held' WHERE id = _escrow.id;

  ELSE
    RAISE EXCEPTION 'Unknown resolution %', _resolution;
  END IF;

  UPDATE public.disputes
  SET status = _resolution::dispute_status,
      admin_notes = _admin_notes,
      admin_decision = _resolution,
      resolved_by = auth.uid(),
      resolved_at = now()
  WHERE id = _dispute_id;

  PERFORM public.log_admin_action(
    auth.uid(), 'dispute_resolved', 'dispute', _dispute_id,
    jsonb_build_object('resolution', _resolution, 'artisan_amount', _artisan_amount, 'customer_amount', _customer_amount)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_resolve_dispute(UUID, TEXT, TEXT, NUMERIC, NUMERIC) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute(UUID, TEXT, TEXT, NUMERIC, NUMERIC) TO authenticated;
