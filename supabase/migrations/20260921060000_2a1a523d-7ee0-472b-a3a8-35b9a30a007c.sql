-- Profile Boost is a paid feature (₦3,000/week, ₦10,000/month) advertised as
-- "appear first in search" and "featured on the homepage carousel". Both
-- FindArtisan and the homepage carousel query profile_boosts directly to
-- find who's currently boosted — but that table's only SELECT policies are
-- "Users can view own boosts" (auth.uid() = user_id) and an admin-only
-- policy. Nobody else was ever allowed to see anyone else's active boost, so
-- an artisan's paid boost was invisible to every customer browsing the site.
--
-- A plain view (no security_invoker) runs with the view owner's privileges,
-- bypassing the underlying table's restrictive RLS — the same pattern
-- artisan_profiles_public already uses to expose public-safe rows. Only
-- exposes what a "featured" badge needs; amount_paid and id stay private.
CREATE OR REPLACE VIEW public.active_profile_boosts AS
SELECT user_id, boost_type, expires_at
FROM public.profile_boosts
WHERE is_active = true AND expires_at > now();

GRANT SELECT ON public.active_profile_boosts TO anon, authenticated;
