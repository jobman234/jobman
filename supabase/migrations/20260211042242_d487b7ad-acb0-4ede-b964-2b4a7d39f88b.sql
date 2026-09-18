
-- Job status enum
CREATE TYPE public.job_status AS ENUM ('open', 'in_negotiation', 'agreed', 'in_progress', 'completed', 'cancelled');

-- Negotiation status enum
CREATE TYPE public.negotiation_status AS ENUM ('pending', 'countered', 'accepted', 'rejected', 'withdrawn');

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  trade_category TEXT NOT NULL,
  budget_min NUMERIC(12,2),
  budget_max NUMERIC(12,2),
  location_state TEXT,
  location_lga TEXT,
  location_address TEXT,
  photos TEXT[] DEFAULT '{}'::TEXT[],
  status public.job_status NOT NULL DEFAULT 'open',
  assigned_artisan_id UUID,
  agreed_price NUMERIC(12,2),
  agreed_timeline TEXT,
  agreed_scope TEXT,
  agreed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Negotiations table
CREATE TABLE public.negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  artisan_id UUID NOT NULL,
  proposed_price NUMERIC(12,2) NOT NULL,
  proposed_timeline TEXT,
  message TEXT,
  status public.negotiation_status NOT NULL DEFAULT 'pending',
  sender_role TEXT NOT NULL CHECK (sender_role IN ('customer', 'artisan')),
  parent_id UUID REFERENCES public.negotiations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_jobs_customer ON public.jobs(customer_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_trade ON public.jobs(trade_category);
CREATE INDEX idx_negotiations_job ON public.negotiations(job_id);
CREATE INDEX idx_negotiations_artisan ON public.negotiations(artisan_id);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;

-- Jobs RLS policies
CREATE POLICY "Open jobs visible to all authenticated" ON public.jobs
  FOR SELECT TO authenticated
  USING (status = 'open' OR customer_id = auth.uid() OR assigned_artisan_id = auth.uid());

CREATE POLICY "Customers can create jobs" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = customer_id AND public.has_role(auth.uid(), 'customer'));

CREATE POLICY "Customers can update own jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Admins can view all jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Negotiations RLS policies
CREATE POLICY "Job participants can view negotiations" ON public.negotiations
  FOR SELECT TO authenticated
  USING (
    artisan_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND customer_id = auth.uid())
  );

CREATE POLICY "Artisans can create negotiations" ON public.negotiations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = artisan_id
    AND public.has_role(auth.uid(), 'artisan')
    AND sender_role = 'artisan'
  );

CREATE POLICY "Customers can create counter offers" ON public.negotiations
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_role = 'customer'
    AND EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND customer_id = auth.uid())
  );

CREATE POLICY "Participants can update negotiation status" ON public.negotiations
  FOR UPDATE TO authenticated
  USING (
    artisan_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND customer_id = auth.uid())
  );

CREATE POLICY "Admins can view all negotiations" ON public.negotiations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger for jobs
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Storage bucket for job photos
INSERT INTO storage.buckets (id, name, public) VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload job photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Job photos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'job-photos');

CREATE POLICY "Users can update own job photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own job photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
