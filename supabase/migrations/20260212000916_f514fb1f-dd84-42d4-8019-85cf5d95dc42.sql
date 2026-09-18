-- Enforce unique phone numbers (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique 
ON public.profiles (phone) 
WHERE phone IS NOT NULL AND phone != '';

-- Add duration_days column to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS duration_days integer;
