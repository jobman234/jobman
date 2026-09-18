
DROP VIEW IF EXISTS public.artisan_profiles_public;

CREATE VIEW public.artisan_profiles_public AS
SELECT
  id,
  user_id,
  bio,
  primary_trade,
  years_experience,
  portrait_url,
  work_photo_url,
  job_photos,
  current_address_state,
  current_address_lga,
  is_public,
  verification_status,
  created_at,
  (government_id_front_url IS NOT NULL AND selfie_url IS NOT NULL AND nin IS NOT NULL) AS has_verification_docs
FROM public.artisan_profiles
WHERE is_public = true;
