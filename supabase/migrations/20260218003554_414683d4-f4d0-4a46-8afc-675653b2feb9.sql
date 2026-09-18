
-- Add job_videos array column to artisan_profiles
ALTER TABLE public.artisan_profiles
ADD COLUMN IF NOT EXISTS job_videos text[] DEFAULT '{}'::text[];
