-- Create messages table for job-based conversations
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_messages_job_id ON public.messages(job_id, created_at);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Only job participants (customer or assigned artisan) can view messages
CREATE POLICY "Job participants can view messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = messages.job_id
    AND (jobs.customer_id = auth.uid() OR jobs.assigned_artisan_id = auth.uid())
  )
);

-- Only job participants can send messages
CREATE POLICY "Job participants can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = messages.job_id
    AND (jobs.customer_id = auth.uid() OR jobs.assigned_artisan_id = auth.uid())
  )
);

-- Users can update their own messages (mark as read)
CREATE POLICY "Recipients can mark messages read"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = messages.job_id
    AND (jobs.customer_id = auth.uid() OR jobs.assigned_artisan_id = auth.uid())
  )
);

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
ON public.messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Trigger: notify on new message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _recipient_id UUID;
  _job_title TEXT;
  _sender_name TEXT;
BEGIN
  -- Determine recipient
  SELECT 
    CASE 
      WHEN jobs.customer_id = NEW.sender_id THEN jobs.assigned_artisan_id
      ELSE jobs.customer_id
    END,
    LEFT(jobs.title, 50)
  INTO _recipient_id, _job_title
  FROM public.jobs WHERE jobs.id = NEW.job_id;

  -- Get sender name
  SELECT full_name INTO _sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id;

  IF _recipient_id IS NOT NULL THEN
    PERFORM public.create_notification(
      _recipient_id,
      'message',
      'New Message from ' || COALESCE(LEFT(_sender_name, 20), 'someone'),
      LEFT(NEW.content, 100),
      '/jobs/' || NEW.job_id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();