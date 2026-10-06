-- The Admin "Audit Log" tab has always queried an `audit_logs` table that was
-- never created (`.from("audit_logs" as any)` — the `as any` was masking a
-- table that doesn't exist in the generated types). It silently shows "No
-- audit logs yet." forever, and no admin action — verification decisions,
-- dispute resolutions, withdrawal payouts, role changes — has ever actually
-- been logged anywhere. This adds the real table and a logging RPC, wired
-- into the admin actions that decide identity or move money.
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_admin ON public.audit_logs(admin_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Callable both from an authenticated admin's own client session (auth.uid()
-- is set — must match _admin_id, no spoofing another admin) and from a
-- trusted edge function using the service role (auth.uid() is null there, so
-- that check is skipped) — either way _admin_id must actually hold an admin
-- role, so a non-admin can't manufacture a log entry attributing an action
-- to themselves or anyone else.
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _admin_id UUID,
  _action TEXT,
  _entity_type TEXT,
  _entity_id UUID,
  _details JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() != _admin_id THEN
    RAISE EXCEPTION 'Cannot log actions for another user';
  END IF;
  IF NOT (public.has_role(_admin_id, 'admin') OR public.has_role(_admin_id, 'super_admin')) THEN
    RAISE EXCEPTION 'Only admins can be logged as an acting admin';
  END IF;

  INSERT INTO public.audit_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (_admin_id, _action, _entity_type, _entity_id, _details);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action(UUID, TEXT, TEXT, UUID, JSONB) TO authenticated, service_role;
