
-- Unique constraint on phone number (excluding nulls/empty)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique 
ON public.profiles (phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Unique constraint on email (excluding nulls/empty)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique 
ON public.profiles (email) 
WHERE email IS NOT NULL AND email != '';

-- Unique constraint on NIN (excluding nulls/empty)
CREATE UNIQUE INDEX IF NOT EXISTS idx_artisan_profiles_nin_unique 
ON public.artisan_profiles (nin) 
WHERE nin IS NOT NULL AND nin != '';

-- Unique constraint on government ID front URL (to prevent same ID doc reuse)
CREATE UNIQUE INDEX IF NOT EXISTS idx_artisan_profiles_gov_id_front_unique 
ON public.artisan_profiles (government_id_front_url) 
WHERE government_id_front_url IS NOT NULL AND government_id_front_url != '';
