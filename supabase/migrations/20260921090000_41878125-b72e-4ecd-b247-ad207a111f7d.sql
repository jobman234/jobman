-- Same class of bug as artisan_profiles and jobs, on the table that is the
-- actual entry point to the chatbot-mediated matching model. The policy is
-- literally named "Clients can cancel their own pending requests", but its
-- WITH CHECK only verifies auth.uid() = user_id — it never restricts which
-- columns change or what the new status is. A customer could currently
-- self-assign assigned_artisan_id to an account they control, fabricate
-- agreed_price/agreed_timeline, or jump status straight to 'assigned' —
-- fully bypassing the admin sourcing step this platform's entire "no direct
-- client-artisan contact" design depends on. No current frontend code
-- actually performs this update (there's no wired-up "cancel" button), so
-- nothing legitimate is lost by tightening it — only the exploit surface.
--
-- current_user != session_user (true only inside a SECURITY DEFINER RPC
-- like admin_assign_request, which is how requests actually get assigned)
-- is the same trusted-context signal used for the jobs fix.
CREATE OR REPLACE FUNCTION public.protect_artisan_request_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user != session_user THEN
    RETURN NEW; -- running inside a trusted SECURITY DEFINER RPC
  END IF;

  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;

  -- The only thing a client may do directly is cancel their own still-open
  -- request — nothing else changes in the same statement.
  IF NEW.status = 'cancelled' AND OLD.status IN ('new', 'admin_review', 'matched') THEN
    IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
      RAISE EXCEPTION 'Cancelling a request cannot change anything else about it';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'This can only be changed by an admin or the matching workflow';
END;
$$;

DROP TRIGGER IF EXISTS protect_artisan_request_columns_trigger ON public.artisan_requests;
CREATE TRIGGER protect_artisan_request_columns_trigger
  BEFORE UPDATE ON public.artisan_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_artisan_request_columns();
