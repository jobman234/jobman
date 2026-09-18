UPDATE public.artisan_profiles
SET verification_status = 'approved',
    is_public = true,
    approved_at = now(),
    rejection_note = NULL
WHERE verification_status = 'pending';