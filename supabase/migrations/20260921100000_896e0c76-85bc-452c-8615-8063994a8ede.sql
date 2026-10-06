-- Same class of bug again, this time on chat history. "Recipients can mark
-- messages read" has no WITH CHECK and no column restriction — its USING
-- clause only checks that the caller is A participant in the job, not that
-- they're touching their own read-state or leaving content alone. Either
-- party in a job could directly rewrite the CONTENT of any message in that
-- thread, including messages the other party sent. Chat history is cited as
-- evidence when a dispute is raised (DisputeDialog), so this let either side
-- silently rewrite the record after the fact. The only thing any frontend
-- code actually does here is flip is_read on the other party's messages
-- (JobChat.tsx) — nothing legitimate needs more than that.
CREATE OR REPLACE FUNCTION public.protect_message_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user != session_user THEN
    RETURN NEW; -- trusted SECURITY DEFINER context
  END IF;

  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'is_read') IS DISTINCT FROM (to_jsonb(OLD) - 'is_read') THEN
    RAISE EXCEPTION 'Only is_read can be updated directly on a message';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_message_content_trigger ON public.messages;
CREATE TRIGGER protect_message_content_trigger
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_message_content();
