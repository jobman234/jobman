
-- 1. phone_otps: remove all client-side access; only SECURITY DEFINER funcs touch it
DROP POLICY IF EXISTS "Users can view own otps" ON public.phone_otps;
DROP POLICY IF EXISTS "Users can update own otps" ON public.phone_otps;
DROP POLICY IF EXISTS "Users can insert own otps" ON public.phone_otps;

-- 2. push_subscriptions: drop overly permissive read
DROP POLICY IF EXISTS "Service can read all subscriptions" ON public.push_subscriptions;

-- 3. wallet_transactions: prevent client inserts
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.wallet_transactions;

-- 4. wallets: prevent direct balance updates by users
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;

-- 5. escrows: prevent participants from mutating escrow state directly
DROP POLICY IF EXISTS "Participants can update escrow" ON public.escrows;

-- 6. profiles: replace broad cross-user SELECT with a safe view
DROP POLICY IF EXISTS "Public can view profiles of public artisans" ON public.profiles;

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT p.user_id, p.full_name, p.avatar_url, p.state, p.lga
FROM public.profiles p;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 7. Fix mutable search_path on remaining functions
ALTER FUNCTION public.delete_email(text, bigint)             SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb)             SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.send_verification_reminder_email()     SET search_path = public;

-- 8. Revoke EXECUTE on SECURITY DEFINER functions that should never be called by clients
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.handle_new_user()',
    'public.send_welcome_email()',
    'public.send_verification_reminder_email()',
    'public.send_job_booking_email()',
    'public.send_job_completion_email()',
    'public.send_payment_receipt_email()',
    'public.notify_job_status_change()',
    'public.notify_escrow_change()',
    'public.notify_dispute_created()',
    'public.notify_dispute_resolved()',
    'public.notify_new_message()',
    'public.notify_new_negotiation()',
    'public.notify_artisans_new_job()',
    'public.notify_referrer_verification_progress()',
    'public.credit_referral_reward()',
    'public.trigger_check_referral_on_verification()',
    'public.check_and_credit_referral(uuid)',
    'public.create_notification(uuid, text, text, text, text)',
    'public.release_escrow(uuid)',
    'public.fund_escrow(uuid, uuid, uuid, numeric)',
    'public.auto_release_expired_escrows()',
    'public.generate_referral_code()',
    'public.update_updated_at()',
    'public.delete_email(text, bigint)',
    'public.enqueue_email(text, jsonb)',
    'public.move_to_dlq(text, text, bigint, jsonb)',
    'public.read_email_batch(text, integer, integer)',
    'public.hash_nin(text)',
    'public.generate_phone_otp(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM public, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      -- ignore if signature drifted
      NULL;
    END;
  END LOOP;
END $$;
