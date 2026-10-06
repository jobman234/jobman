-- "Users can update own conversations" has no WITH CHECK, so a customer
-- could directly clear their own conversation's admin_unread flag (hiding
-- their new request from the admin queue) and freely rewrite status/title
-- too, since nothing restricts which columns change. This was previously
-- noted and deliberately deferred as low severity (no current admin UI
-- exposed a downstream consequence); closing it now while touching this
-- area, on the same pattern used everywhere else in this table set.
--
-- The client legitimately needs to RAISE admin_unread (Assistant.tsx and the
-- chatbot edge function set it true when a customer sends a message/creates
-- a request, both running under the customer's own RLS context, not a
-- trusted RPC) and bump updated_at — so unlike the other tables, this can't
-- just block all direct client writes; the fix is an asymmetric guard: a
-- client can flip admin_unread false->true but never true->false, and
-- nothing else may change in the same statement. Only an admin (or a
-- trusted SECURITY DEFINER path) can clear the flag or touch status/title.
--
-- Proved against the original policy: a customer flipped admin_unread to
-- false and rewrote status/title on their own conversation in one
-- statement. Blocked after the fix; verified the client can still raise the
-- flag, bump updated_at, and that an admin can still clear it and close the
-- conversation.
CREATE OR REPLACE FUNCTION public.protect_chat_conversation_columns()
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

  IF OLD.admin_unread = true AND NEW.admin_unread = false THEN
    RAISE EXCEPTION 'Only an admin can clear the unread flag';
  END IF;

  IF (to_jsonb(NEW) - 'admin_unread' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'admin_unread' - 'updated_at') THEN
    RAISE EXCEPTION 'Only admin_unread and updated_at can be changed directly';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_chat_conversation_columns_trigger ON public.chat_conversations;
CREATE TRIGGER protect_chat_conversation_columns_trigger
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_chat_conversation_columns();
