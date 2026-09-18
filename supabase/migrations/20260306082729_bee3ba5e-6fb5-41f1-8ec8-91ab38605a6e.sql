
-- Fix: Allow viewing profiles of ALL public artisans (not just approved ones)
-- so names show on the Find Artisan page
DROP POLICY IF EXISTS "Public can view profiles of public artisans" ON public.profiles;

CREATE POLICY "Public can view profiles of public artisans"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.artisan_profiles
    WHERE artisan_profiles.user_id = profiles.user_id
      AND artisan_profiles.is_public = true
  )
);
