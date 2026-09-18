
-- Update the public view to include job_videos
DROP VIEW IF EXISTS public.artisan_profiles_public;

CREATE VIEW public.artisan_profiles_public AS
SELECT
  ap.id,
  ap.user_id,
  ap.bio,
  ap.primary_trade,
  ap.years_experience,
  ap.portrait_url,
  ap.work_photo_url,
  ap.job_photos,
  ap.job_videos,
  ap.current_address_state,
  ap.current_address_lga,
  ap.is_public,
  ap.verification_status,
  ap.created_at,
  (ap.government_id_front_url IS NOT NULL AND ap.selfie_url IS NOT NULL AND ap.nin IS NOT NULL) AS has_verification_docs
FROM public.artisan_profiles ap
WHERE ap.is_public = true
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = ap.user_id AND ur.role = 'artisan'
  );

ALTER VIEW public.artisan_profiles_public SET (security_invoker = on);
