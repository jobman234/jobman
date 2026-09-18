
-- Create a security definer function to check if a user has a public artisan profile
-- This bypasses RLS on artisan_profiles so it can be used in profiles RLS policy
CREATE OR REPLACE FUNCTION public.is_public_artisan(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.artisan_profiles
    WHERE user_id = _user_id
      AND is_public = true
  )
$$;

-- Drop the old policy that does a subquery (which fails due to RLS on artisan_profiles)
DROP POLICY IF EXISTS "Public can view profiles of public artisans" ON public.profiles;

-- Recreate using the security definer function
CREATE POLICY "Public can view profiles of public artisans"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_public_artisan(profiles.user_id));
