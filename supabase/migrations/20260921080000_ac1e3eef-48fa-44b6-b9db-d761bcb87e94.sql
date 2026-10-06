-- Same class of bug as the artisan_profiles fix: "Customers can update own
-- jobs" is a plain row-scoped RLS policy (auth.uid() = customer_id) with no
-- column restriction. The only column any current frontend code touches
-- directly is `photos` (JobDetail.tsx's evidence upload) — every real
-- state change (status, assigned_artisan_id, agreed_price, agreed_timeline,
-- agreed_scope, agreed_at, escrow_release_deadline, artisan_completed_at)
-- goes through SECURITY DEFINER RPCs (start_job, artisan_mark_complete,
-- complete_job, admin_assign_request, admin_resolve_dispute,
-- auto_release_expired_escrows). But nothing in the database stopped a
-- customer from calling the client directly and, say, setting
-- assigned_artisan_id to an account they control, or flipping status to
-- 'completed' without ever funding escrow.
--
-- current_user differs from session_user only while executing inside a
-- SECURITY DEFINER function (Postgres runs those as the function owner) —
-- so this trusts every one of the RPCs above and admins without needing to
-- touch any of them, and blocks a direct client update from changing
-- anything except photos.
-- Deliberately NOT SECURITY DEFINER: that would unconditionally elevate
-- current_user the moment the trigger fires, making the current_user vs
-- session_user comparison below always true and defeating the whole check.
-- Running as invoker means current_user correctly reflects whether we're
-- inside a trusted RPC's elevated context or a direct client call.
CREATE OR REPLACE FUNCTION public.protect_job_columns()
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

  IF (to_jsonb(NEW) - 'photos' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'photos' - 'updated_at') THEN
    RAISE EXCEPTION 'Only photos can be updated directly; everything else goes through the job workflow or an admin';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_job_columns_trigger ON public.jobs;
CREATE TRIGGER protect_job_columns_trigger
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_job_columns();
