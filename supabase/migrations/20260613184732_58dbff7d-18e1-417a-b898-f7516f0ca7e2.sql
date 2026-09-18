
-- 1. Remove direct INSERT on escrows (must go through fund_escrow RPC)
DROP POLICY IF EXISTS "Payers can create escrow" ON public.escrows;

-- 2. Remove direct INSERT on profile_boosts (must go through purchase_profile_boost RPC)
DROP POLICY IF EXISTS "Users can create boosts" ON public.profile_boosts;

-- 3. Create safe view for jobs that redacts location_address from non-participants
DROP VIEW IF EXISTS public.jobs_safe;
CREATE VIEW public.jobs_safe
WITH (security_invoker = true)
AS
SELECT
  j.id,
  j.customer_id,
  j.title,
  j.description,
  j.trade_category,
  j.budget_min,
  j.budget_max,
  j.location_state,
  j.location_lga,
  CASE
    WHEN auth.uid() = j.customer_id
      OR auth.uid() = j.assigned_artisan_id
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'super_admin'::app_role)
    THEN j.location_address
    ELSE NULL
  END AS location_address,
  j.photos,
  j.status,
  j.assigned_artisan_id,
  j.agreed_price,
  j.agreed_timeline,
  j.agreed_scope,
  j.agreed_at,
  j.created_at,
  j.updated_at,
  j.escrow_release_deadline,
  j.duration_days,
  j.artisan_completed_at,
  j.start_date
FROM public.jobs j;

GRANT SELECT ON public.jobs_safe TO authenticated;

-- 4. Allow referred users to view their own referral event
CREATE POLICY "Referred users can view their referral"
ON public.referral_events
FOR SELECT
TO authenticated
USING (auth.uid() = referred_user_id);

-- 5. Admin DELETE policy for dispute-evidence storage bucket
CREATE POLICY "Admins can delete dispute evidence"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'dispute-evidence'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- 6. Lock down SECURITY DEFINER function execution
-- Revoke EXECUTE from public/anon/authenticated on all SECURITY DEFINER functions,
-- then grant back only the user-callable RPCs.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                   r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant EXECUTE for RLS helpers (must be callable to evaluate policies)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_artisan(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hash_nin(text) TO anon, authenticated;

-- Re-grant EXECUTE for explicit user-callable RPCs
GRANT EXECUTE ON FUNCTION public.transfer_referral_to_wallet(numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_profile_boost(text, numeric, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fund_escrow(uuid, uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.artisan_mark_complete(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_job(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_trust_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.raise_dispute(uuid, uuid, uuid, uuid, text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_phone_otp(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_phone_otp(uuid, text) TO authenticated;
