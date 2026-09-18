-- Request status enum
CREATE TYPE public.artisan_request_status AS ENUM ('new', 'admin_review', 'matched', 'assigned', 'completed', 'cancelled');

CREATE TABLE public.artisan_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  trade_category text NOT NULL,
  description text NOT NULL DEFAULT '',
  location_state text,
  location_lga text,
  location_address text,
  budget_min numeric,
  budget_max numeric,
  preferred_start date,
  status public.artisan_request_status NOT NULL DEFAULT 'new',
  assigned_artisan_id uuid,
  agreed_price numeric,
  agreed_timeline text,
  admin_note text,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.artisan_requests TO authenticated;
GRANT ALL ON public.artisan_requests TO service_role;

ALTER TABLE public.artisan_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own requests"
  ON public.artisan_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = assigned_artisan_id);

CREATE POLICY "Clients can create their own requests"
  ON public.artisan_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clients can cancel their own pending requests"
  ON public.artisan_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('new','admin_review','matched'))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests"
  ON public.artisan_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update all requests"
  ON public.artisan_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (true);

CREATE TRIGGER update_artisan_requests_updated_at
  BEFORE UPDATE ON public.artisan_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_artisan_requests_user ON public.artisan_requests(user_id, created_at DESC);
CREATE INDEX idx_artisan_requests_status ON public.artisan_requests(status, created_at DESC);
CREATE INDEX idx_artisan_requests_conversation ON public.artisan_requests(conversation_id);

-- Chat message / conversation additions
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS sender_role text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.artisan_requests(id) ON DELETE SET NULL;

ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS admin_unread boolean NOT NULL DEFAULT false;

-- Admins need to read/participate in client conversations
CREATE POLICY "Admins can view all conversations"
  ON public.chat_conversations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update all conversations"
  ON public.chat_conversations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (true);

CREATE POLICY "Admins can view all chat messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can post chat messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Admin assignment RPC
CREATE OR REPLACE FUNCTION public.admin_assign_request(
  _request_id uuid,
  _artisan_id uuid,
  _price numeric,
  _timeline text,
  _note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req public.artisan_requests%ROWTYPE;
  _job_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Only admins can assign requests';
  END IF;

  SELECT * INTO _req FROM public.artisan_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF _req.job_id IS NOT NULL THEN
    RAISE EXCEPTION 'Request already assigned';
  END IF;

  INSERT INTO public.jobs (
    customer_id, title, description, trade_category,
    budget_min, budget_max, location_state, location_lga, location_address,
    status, assigned_artisan_id, agreed_price, agreed_timeline, agreed_at, start_date
  ) VALUES (
    _req.user_id,
    _req.trade_category || ' request',
    COALESCE(NULLIF(_req.description, ''), 'Concierge request'),
    _req.trade_category,
    _req.budget_min, _req.budget_max,
    _req.location_state, _req.location_lga, _req.location_address,
    'agreed', _artisan_id, _price, _timeline, now(), _req.preferred_start
  ) RETURNING id INTO _job_id;

  UPDATE public.artisan_requests
  SET status = 'assigned',
      assigned_artisan_id = _artisan_id,
      agreed_price = _price,
      agreed_timeline = _timeline,
      admin_note = COALESCE(_note, admin_note),
      job_id = _job_id
  WHERE id = _request_id;

  IF _req.conversation_id IS NOT NULL THEN
    INSERT INTO public.chat_messages (conversation_id, role, sender_role, content, request_id)
    VALUES (
      _req.conversation_id,
      'assistant',
      'admin',
      'Good news — we matched an artisan for your ' || _req.trade_category || ' request. Agreed price: NGN ' || _price::text ||
      COALESCE('. Timeline: ' || _timeline, '') || COALESCE('. ' || _note, '') ||
      ' You can now fund escrow to get started.',
      _request_id
    );
  END IF;

  PERFORM public.create_notification(
    _req.user_id,
    'request_matched',
    'Artisan matched',
    'We found an artisan for your ' || _req.trade_category || ' request. Review and fund escrow to begin.',
    '/jobs/' || _job_id::text
  );

  PERFORM public.create_notification(
    _artisan_id,
    'job_assigned',
    'New job assigned',
    'Jobman assigned you a ' || _req.trade_category || ' job.',
    '/jobs/' || _job_id::text
  );

  RETURN _job_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_assign_request(uuid, uuid, numeric, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_request(uuid, uuid, numeric, text, text) TO authenticated;