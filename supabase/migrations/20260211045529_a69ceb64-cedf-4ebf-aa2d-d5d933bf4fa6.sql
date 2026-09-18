-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update (mark read) their own notifications
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- System inserts via triggers (security definer functions)
-- No direct INSERT policy needed for users

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create a notification (used by triggers)
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _type TEXT,
  _title TEXT,
  _message TEXT,
  _link TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (_user_id, _type, _title, _message, _link);
END;
$$;

-- Trigger: Job status changes
CREATE OR REPLACE FUNCTION public.notify_job_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify the customer
    PERFORM public.create_notification(
      NEW.customer_id,
      'job_update',
      'Job Status Updated',
      'Your job "' || LEFT(NEW.title, 50) || '" is now ' || REPLACE(NEW.status::text, '_', ' '),
      '/jobs/' || NEW.id
    );

    -- Notify assigned artisan if exists
    IF NEW.assigned_artisan_id IS NOT NULL THEN
      PERFORM public.create_notification(
        NEW.assigned_artisan_id,
        'job_update',
        'Job Status Updated',
        'Job "' || LEFT(NEW.title, 50) || '" is now ' || REPLACE(NEW.status::text, '_', ' '),
        '/jobs/' || NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_job_status
AFTER UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.notify_job_status_change();

-- Trigger: Escrow status changes
CREATE OR REPLACE FUNCTION public.notify_escrow_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _job_title TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT LEFT(title, 50) INTO _job_title FROM public.jobs WHERE id = NEW.job_id;

    -- Notify payer
    PERFORM public.create_notification(
      NEW.payer_id,
      'escrow_update',
      'Escrow ' || INITCAP(REPLACE(NEW.status::text, '_', ' ')),
      'Escrow for "' || COALESCE(_job_title, 'a job') || '" has been ' || REPLACE(NEW.status::text, '_', ' '),
      '/jobs/' || NEW.job_id
    );

    -- Notify payee
    PERFORM public.create_notification(
      NEW.payee_id,
      'escrow_update',
      'Escrow ' || INITCAP(REPLACE(NEW.status::text, '_', ' ')),
      'Escrow for "' || COALESCE(_job_title, 'a job') || '" has been ' || REPLACE(NEW.status::text, '_', ' '),
      '/jobs/' || NEW.job_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_escrow_change
AFTER UPDATE ON public.escrows
FOR EACH ROW
EXECUTE FUNCTION public.notify_escrow_change();

-- Trigger: New dispute created
CREATE OR REPLACE FUNCTION public.notify_dispute_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Notify the person the dispute is raised against
  PERFORM public.create_notification(
    NEW.raised_against,
    'dispute',
    'Dispute Raised Against You',
    'A ' || NEW.category || ' dispute has been opened. Please review the details.',
    '/jobs/' || NEW.job_id
  );

  -- Notify admins (all users with admin role)
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT ur.user_id, 'dispute', 'New Dispute Filed',
    'A new ' || NEW.category || ' dispute requires review.',
    '/admin'
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'super_admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_dispute_created
AFTER INSERT ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.notify_dispute_created();

-- Trigger: Dispute resolved
CREATE OR REPLACE FUNCTION public.notify_dispute_resolved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('resolved_artisan', 'resolved_customer', 'resolved_split', 'closed') THEN
    PERFORM public.create_notification(
      NEW.raised_by,
      'dispute',
      'Dispute Resolved',
      'Your dispute has been resolved: ' || COALESCE(NEW.admin_decision, REPLACE(NEW.status::text, '_', ' ')),
      '/jobs/' || NEW.job_id
    );
    PERFORM public.create_notification(
      NEW.raised_against,
      'dispute',
      'Dispute Resolved',
      'A dispute involving you has been resolved: ' || COALESCE(NEW.admin_decision, REPLACE(NEW.status::text, '_', ' ')),
      '/jobs/' || NEW.job_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_dispute_resolved
AFTER UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.notify_dispute_resolved();

-- Trigger: New negotiation/bid on a job
CREATE OR REPLACE FUNCTION public.notify_new_negotiation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _customer_id UUID;
  _job_title TEXT;
BEGIN
  SELECT customer_id, LEFT(title, 50) INTO _customer_id, _job_title
  FROM public.jobs WHERE id = NEW.job_id;

  IF NEW.sender_role = 'artisan' THEN
    -- Notify customer about new bid
    PERFORM public.create_notification(
      _customer_id,
      'negotiation',
      'New Bid Received',
      'You received a bid of ₦' || NEW.proposed_price::TEXT || ' on "' || COALESCE(_job_title, 'your job') || '"',
      '/jobs/' || NEW.job_id
    );
  ELSE
    -- Notify artisan about counter offer
    PERFORM public.create_notification(
      NEW.artisan_id,
      'negotiation',
      'Counter Offer Received',
      'You received a counter offer of ₦' || NEW.proposed_price::TEXT || ' on "' || COALESCE(_job_title, 'a job') || '"',
      '/jobs/' || NEW.job_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_negotiation
AFTER INSERT ON public.negotiations
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_negotiation();