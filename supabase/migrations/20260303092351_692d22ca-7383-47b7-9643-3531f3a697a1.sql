
-- Allow admins to update referral events (edit rewards)
CREATE POLICY "Admins can update referral events"
ON public.referral_events
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete referral events
CREATE POLICY "Admins can delete referral events"
ON public.referral_events
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
