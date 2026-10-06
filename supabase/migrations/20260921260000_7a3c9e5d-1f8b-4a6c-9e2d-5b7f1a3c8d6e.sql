-- Saved/Favorite Artisans: lets a customer bookmark an artisan from
-- FindArtisan/ArtisanProfile for quick access later (e.g. to request them
-- again via the Jobman assistant).
CREATE TABLE public.saved_artisans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artisan_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saved_artisans_not_self CHECK (artisan_user_id != user_id),
  CONSTRAINT saved_artisans_unique UNIQUE (user_id, artisan_user_id)
);

CREATE INDEX idx_saved_artisans_user ON public.saved_artisans(user_id, created_at DESC);

ALTER TABLE public.saved_artisans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved artisans" ON public.saved_artisans
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can save artisans" ON public.saved_artisans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave artisans" ON public.saved_artisans
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
