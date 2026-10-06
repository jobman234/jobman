-- JobDetail.tsx reads the assigned artisan's verification_status directly
-- from public.artisan_profiles so it can disable the Pay button for an
-- unverified artisan -- but the only SELECT policies on that table are
-- "own row" and "admin". The old "is_public = true AND verification_status
-- = 'approved'" public policy was correctly dropped by 20260211051140 (it
-- exposed every column, including nin/date_of_birth/government_id_*_url/
-- selfie_url, to anyone) and replaced with the artisan_profiles_public view
-- for browsing -- but nothing ever gave a job's customer a safe way to read
-- their OWN assigned artisan's status. The result: that query always
-- returns zero rows for a customer, artisanIsVerified is always false, and
-- the Pay button/fund_escrow guard in JobDetail.tsx is permanently
-- disabled for every job, verified artisan or not. Proved this against the
-- exact current policy set: a customer querying an approved, public
-- artisan's row gets 0 rows back.
--
-- artisan_profiles_public isn't the right fix either -- it additionally
-- requires is_public = true, which is a separate toggle (see
-- ProfileVisibilityToggle.tsx) an artisan can turn off independent of being
-- approved, so swapping the frontend query to that view would still
-- wrongly block payment to an approved-but-not-public artisan.
--
-- Fixes it with a narrow RPC instead of widening RLS on the raw table:
-- only a job's customer or its assigned artisan can call it, for that
-- specific job, and it returns only the one enum value -- never touching
-- the sensitive identity columns on the table.
CREATE OR REPLACE FUNCTION public.get_assigned_artisan_verification(_job_id UUID)
RETURNS public.verification_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _job RECORD;
  _status public.verification_status;
BEGIN
  SELECT customer_id, assigned_artisan_id INTO _job
  FROM public.jobs WHERE id = _job_id;

  IF _job IS NULL THEN
    RETURN NULL;
  END IF;

  IF auth.uid() IS NULL OR (auth.uid() != _job.customer_id AND auth.uid() != _job.assigned_artisan_id) THEN
    RAISE EXCEPTION 'You are not a participant on this job';
  END IF;

  IF _job.assigned_artisan_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT verification_status INTO _status
  FROM public.artisan_profiles WHERE user_id = _job.assigned_artisan_id;

  RETURN _status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_assigned_artisan_verification(UUID) TO authenticated;
