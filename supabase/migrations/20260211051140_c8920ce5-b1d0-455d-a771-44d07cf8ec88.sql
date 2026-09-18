
-- Drop the overly permissive public SELECT policy that exposes all columns
DROP POLICY "Public artisan profiles visible to all" ON public.artisan_profiles;

-- Create a safe public view with only non-sensitive fields
CREATE VIEW public.artisan_profiles_public AS
SELECT 
  ap.id,
  ap.user_id,
  ap.primary_trade,
  ap.bio,
  ap.years_experience,
  ap.verification_status,
  ap.is_public,
  ap.job_photos,
  ap.portrait_url,
  ap.work_photo_url,
  ap.current_address_state,
  ap.current_address_lga,
  ap.created_at
FROM public.artisan_profiles ap
WHERE ap.is_public = true AND ap.verification_status = 'approved';

-- Grant SELECT on the view to all roles (view only exposes safe fields)
GRANT SELECT ON public.artisan_profiles_public TO anon, authenticated;
