-- None of the four storage buckets (avatars, job-photos, verification-docs,
-- dispute-evidence) ever set file_size_limit or allowed_mime_types. Every
-- size/type check in the app (ArtisanPortfolio's 5MB image / 30MB video
-- caps, the "image/*" accept attributes) is client-side only — trivially
-- bypassed by uploading directly to the Storage API, letting any
-- authenticated user store arbitrarily large or arbitrary-type files
-- (storage cost abuse, and one less layer between "whatever a user
-- uploads" and "what gets served back", even though nothing in this app
-- renders stored content as HTML).
--
-- All four buckets are actually used for a mix of images AND short videos
-- (avatars: portrait/work photos + the artisan portfolio's work videos;
-- verification-docs: ID photos + the verification intro video;
-- dispute-evidence and job-photos: accept="image/*,video/*" already in the
-- UI) — so the limit has to accommodate the largest legitimate case
-- (ArtisanPortfolio's 30MB video cap) across every bucket, not just images.
UPDATE storage.buckets
SET file_size_limit = 52428800, -- 50MB, comfortably above the largest client-side cap (30MB video)
    allowed_mime_types = ARRAY[
      'image/png', 'image/jpeg', 'image/webp', 'image/gif',
      'video/mp4', 'video/quicktime', 'video/webm'
    ]
WHERE id IN ('avatars', 'job-photos', 'verification-docs', 'dispute-evidence');
