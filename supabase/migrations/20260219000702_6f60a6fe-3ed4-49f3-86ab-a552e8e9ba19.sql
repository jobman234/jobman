-- Drop and recreate view so column order matches
DROP VIEW IF EXISTS public.artisan_profiles_public;

CREATE VIEW public.artisan_profiles_public
WITH (security_invoker = on)
AS
SELECT
  ap.id,
  ap.user_id,
  ap.primary_trade,
  ap.bio,
  ap.years_experience,
  ap.current_address_state,
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
WHERE ap.is_public = true;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';