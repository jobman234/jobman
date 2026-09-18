
-- Dispute category enum
CREATE TYPE public.dispute_status AS ENUM ('open', 'under_review', 'resolved_artisan', 'resolved_customer', 'resolved_split', 'closed');

-- Disputes table
CREATE TABLE public.disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  escrow_id UUID NOT NULL REFERENCES public.escrows(id),
  raised_by UUID NOT NULL,
  raised_against UUID NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}'::TEXT[],
  status dispute_status NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  admin_decision TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Participants can view their disputes
CREATE POLICY "Participants can view own disputes" ON public.disputes
FOR SELECT USING (raised_by = auth.uid() OR raised_against = auth.uid());

-- Participants can create disputes
CREATE POLICY "Users can create disputes" ON public.disputes
FOR INSERT WITH CHECK (auth.uid() = raised_by);

-- Admins full access
CREATE POLICY "Admins can view all disputes" ON public.disputes
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update disputes" ON public.disputes
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, reviewer_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view reviews
CREATE POLICY "Reviews are publicly viewable" ON public.reviews
FOR SELECT USING (true);

-- Users can create reviews for jobs they participated in
CREATE POLICY "Users can create reviews" ON public.reviews
FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Admins can manage reviews
CREATE POLICY "Admins can manage reviews" ON public.reviews
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Profile boost table
CREATE TABLE public.profile_boosts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  boost_type TEXT NOT NULL DEFAULT 'weekly',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own boosts" ON public.profile_boosts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create boosts" ON public.profile_boosts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all boosts" ON public.profile_boosts
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for dispute evidence
INSERT INTO storage.buckets (id, name, public) VALUES ('dispute-evidence', 'dispute-evidence', false);

-- Dispute evidence storage policies
CREATE POLICY "Users can upload dispute evidence" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'dispute-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own dispute evidence" ON storage.objects
FOR SELECT USING (bucket_id = 'dispute-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all dispute evidence" ON storage.objects
FOR SELECT USING (bucket_id = 'dispute-evidence' AND has_role(auth.uid(), 'admin'::app_role));

-- Trust score function
CREATE OR REPLACE FUNCTION public.calculate_trust_score(_user_id uuid)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _score NUMERIC := 0;
  _id_verified BOOLEAN := false;
  _address_verified BOOLEAN := false;
  _avg_rating NUMERIC := 0;
  _total_jobs INTEGER := 0;
  _completed_jobs INTEGER := 0;
  _dispute_count INTEGER := 0;
  _review_count INTEGER := 0;
BEGIN
  -- Check artisan verification (20 points)
  SELECT 
    (government_id_front_url IS NOT NULL),
    (current_address_state IS NOT NULL)
  INTO _id_verified, _address_verified
  FROM public.artisan_profiles WHERE user_id = _user_id;
  
  IF _id_verified THEN _score := _score + 10; END IF;
  IF _address_verified THEN _score := _score + 10; END IF;

  -- Average rating (30 points max)
  SELECT COALESCE(AVG(rating), 0), COUNT(*)
  INTO _avg_rating, _review_count
  FROM public.reviews WHERE reviewee_id = _user_id;
  
  IF _review_count > 0 THEN
    _score := _score + (_avg_rating / 5.0) * 30;
  END IF;

  -- Completion rate (25 points max)
  SELECT COUNT(*) INTO _total_jobs
  FROM public.jobs WHERE assigned_artisan_id = _user_id;
  
  SELECT COUNT(*) INTO _completed_jobs
  FROM public.jobs WHERE assigned_artisan_id = _user_id AND status = 'completed';
  
  IF _total_jobs > 0 THEN
    _score := _score + (_completed_jobs::NUMERIC / _total_jobs) * 25;
  END IF;

  -- Dispute penalty (-15 points max)
  SELECT COUNT(*) INTO _dispute_count
  FROM public.disputes WHERE raised_against = _user_id AND status IN ('resolved_customer', 'resolved_split');
  
  _score := _score - LEAST(_dispute_count * 5, 15);

  -- Bonus for having references confirmed (5 points)
  IF EXISTS (
    SELECT 1 FROM public.artisan_profiles 
    WHERE user_id = _user_id 
    AND reference1_name IS NOT NULL 
    AND reference2_name IS NOT NULL
  ) THEN
    _score := _score + 5;
  END IF;

  RETURN GREATEST(ROUND(_score, 1), 0);
END;
$$;

-- Add trigger for disputes updated_at
CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Function to freeze escrow on dispute
CREATE OR REPLACE FUNCTION public.raise_dispute(
  _job_id uuid,
  _escrow_id uuid, 
  _raised_by uuid,
  _raised_against uuid,
  _category text,
  _description text,
  _evidence_urls text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _dispute_id UUID;
BEGIN
  -- Freeze the escrow
  UPDATE public.escrows SET status = 'disputed' WHERE id = _escrow_id AND status = 'held';

  -- Update job status
  UPDATE public.jobs SET status = 'cancelled' WHERE id = _job_id AND status = 'in_progress';

  -- Create dispute record
  INSERT INTO public.disputes (job_id, escrow_id, raised_by, raised_against, category, description, evidence_urls, status)
  VALUES (_job_id, _escrow_id, _raised_by, _raised_against, _category, _description, _evidence_urls, 'under_review')
  RETURNING id INTO _dispute_id;

  RETURN _dispute_id;
END;
$$;

-- Add realtime for disputes
ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
