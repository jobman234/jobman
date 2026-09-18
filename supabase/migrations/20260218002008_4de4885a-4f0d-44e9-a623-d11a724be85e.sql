
-- Fix: set the view to use invoker security (default/safe behavior)
ALTER VIEW public.artisan_profiles_public SET (security_invoker = on);
