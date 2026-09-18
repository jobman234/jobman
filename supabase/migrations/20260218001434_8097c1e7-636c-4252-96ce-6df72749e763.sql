-- Allow anyone to read basic profile info (name, avatar) for users who have public artisan profiles
CREATE POLICY "Public can view profiles of public artisans"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.artisan_profiles
    WHERE artisan_profiles.user_id = profiles.user_id
    AND artisan_profiles.is_public = true
    AND artisan_profiles.verification_status = 'approved'
  )
);