-- raise_dispute() is SECURITY DEFINER and bypasses RLS entirely, but it
-- never validated a single one of its own parameters: it didn't check the
-- caller was actually _raised_by, didn't check the caller was a participant
-- on _job_id, didn't check _escrow_id even belonged to _job_id, and didn't
-- check _raised_against was the correct other party. Any authenticated user
-- could call it directly with someone else's job/escrow ids and freeze a
-- stranger's escrow, cancel their job, and forge who's disputing whom — pure
-- sabotage of any in-progress transaction on the platform, unrelated to
-- whether the caller was ever involved.
--
-- Also tightens the underlying table's own INSERT policy to match (defense
-- in depth in case anything ever inserts into disputes directly instead of
-- through this RPC) — same shape as the reviews fix: verify job/escrow/
-- reviewee-equivalent consistency, not just "the row says it's you".
CREATE OR REPLACE FUNCTION public.raise_dispute(
  _job_id uuid,
  _escrow_id uuid,
  _raised_by uuid,
  _raised_against uuid,
  _category text,
  _description text,
  _evidence_urls text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _dispute_id UUID;
  _job RECORD;
  _escrow RECORD;
  _other_party UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != _raised_by THEN
    RAISE EXCEPTION 'You can only raise a dispute as yourself';
  END IF;

  SELECT * INTO _job FROM public.jobs WHERE id = _job_id FOR UPDATE;
  IF _job IS NULL THEN
    RAISE EXCEPTION 'Job not found';
  END IF;
  IF auth.uid() != _job.customer_id AND auth.uid() != _job.assigned_artisan_id THEN
    RAISE EXCEPTION 'You are not a participant on this job';
  END IF;

  _other_party := CASE WHEN _job.customer_id = auth.uid() THEN _job.assigned_artisan_id ELSE _job.customer_id END;
  IF _raised_against IS DISTINCT FROM _other_party THEN
    RAISE EXCEPTION 'raised_against must be the other party on this job';
  END IF;

  SELECT * INTO _escrow FROM public.escrows WHERE id = _escrow_id FOR UPDATE;
  IF _escrow IS NULL OR _escrow.job_id != _job_id THEN
    RAISE EXCEPTION 'Escrow does not match this job';
  END IF;
  IF _escrow.status != 'held' THEN
    RAISE EXCEPTION 'This escrow is not in a disputable state';
  END IF;

  UPDATE public.escrows SET status = 'disputed' WHERE id = _escrow_id;
  UPDATE public.jobs SET status = 'cancelled' WHERE id = _job_id AND status = 'in_progress';

  INSERT INTO public.disputes (job_id, escrow_id, raised_by, raised_against, category, description, evidence_urls, status)
  VALUES (_job_id, _escrow_id, _raised_by, _raised_against, _category, _description, _evidence_urls, 'under_review')
  RETURNING id INTO _dispute_id;

  RETURN _dispute_id;
END;
$$;

DROP POLICY IF EXISTS "Users can create disputes" ON public.disputes;

CREATE POLICY "Users can create disputes for jobs they are on" ON public.disputes
FOR INSERT
WITH CHECK (
  auth.uid() = raised_by
  AND EXISTS (
    SELECT 1 FROM public.jobs j
    JOIN public.escrows e ON e.id = escrow_id AND e.job_id = j.id
    WHERE j.id = job_id
      AND (
        (j.customer_id = auth.uid() AND j.assigned_artisan_id = raised_against)
        OR
        (j.assigned_artisan_id = auth.uid() AND j.customer_id = raised_against)
      )
  )
);
