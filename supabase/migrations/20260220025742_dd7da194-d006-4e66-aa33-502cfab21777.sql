
-- Fix the artisan_profiles_public view:
-- 1. Remove security_invoker so it uses definer privileges (bypasses RLS) to allow public read
-- 2. JOIN with profiles to get state from registration when current_address_state is NULL
-- 3. Keep is_public = true filter

DROP VIEW IF EXISTS public.artisan_profiles_public;

CREATE VIEW public.artisan_profiles_public AS
SELECT
  ap.id,
  ap.user_id,
  ap.primary_trade,
  ap.bio,
  ap.years_experience,
  COALESCE(ap.current_address_state, p.state) AS current_address_state,
  ap.current_address_lga,
  ap.portrait_url,
  ap.work_photo_url,
  ap.job_photos,
  ap.job_videos,
  ap.verification_status,
  ap.is_public,
  ap.created_at,
  (ap.government_id_front_url IS NOT NULL OR ap.selfie_url IS NOT NULL) AS has_verification_docs
FROM public.artisan_profiles ap
LEFT JOIN public.profiles p ON p.user_id = ap.user_id
WHERE ap.is_public = true;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.artisan_profiles_public TO anon, authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
