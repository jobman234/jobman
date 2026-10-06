-- ReferralSection.tsx's referral-progress checklist selects raw
-- government_id_front_url, nin, home address fields, and both personal
-- references' names/phone numbers directly from public.artisan_profiles for
-- every user the current account has referred -- just to compute three
-- boolean "done" flags (ID / address / reference verification) for display.
-- The UI itself never renders the raw values, but the full plaintext NIN and
-- a URL to the referred person's government ID photo still travel to the
-- referrer's browser in the query response, inspectable via devtools --
-- data a plain referrer (not that person, not an admin) should never
-- receive at all, regardless of what the UI does with it afterward.
--
-- It also doesn't currently work: artisan_profiles' only SELECT policies
-- are "own row" and "admin" (the old public-visibility policy was correctly
-- dropped when artisan_profiles_public was introduced, since it exposed
-- every column including these same identity fields to anyone). A referrer
-- is neither, so this query has always returned zero rows -- the referral
-- progress checklist shows every step as incomplete regardless of the
-- referred artisan's real progress.
--
-- Fixes both: a narrow RPC, scoped to actual referrer/referred pairs via
-- referral_events, that computes the three booleans server-side and never
-- returns a single raw identity field.
CREATE OR REPLACE FUNCTION public.get_referral_verification_progress(_referred_user_ids UUID[])
RETURNS TABLE (
  referred_user_id UUID,
  id_verification_done BOOLEAN,
  address_verification_done BOOLEAN,
  reference_verification_done BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ap.user_id,
    (ap.government_id_front_url IS NOT NULL AND ap.nin IS NOT NULL),
    (ap.current_address_state IS NOT NULL AND ap.current_address_street IS NOT NULL AND ap.current_address_lga IS NOT NULL),
    (ap.reference1_name IS NOT NULL AND ap.reference1_phone IS NOT NULL AND ap.reference2_name IS NOT NULL AND ap.reference2_phone IS NOT NULL)
  FROM public.artisan_profiles ap
  WHERE ap.user_id = ANY(_referred_user_ids)
    AND EXISTS (
      SELECT 1 FROM public.referral_events re
      WHERE re.referred_user_id = ap.user_id AND re.referrer_id = auth.uid()
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_verification_progress(UUID[]) TO authenticated;
