
-- Add UPDATE policy on wallets so users can update their own wallet (needed for referral transfer)
CREATE POLICY "Users can update own wallet"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- Create a secure RPC for referral balance transfer
CREATE OR REPLACE FUNCTION public.transfer_referral_to_wallet(_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  _wallet_id UUID;
  _referral_balance NUMERIC;
BEGIN
  SELECT id, referral_balance INTO _wallet_id, _referral_balance
  FROM public.wallets WHERE user_id = auth.uid() FOR UPDATE;

  IF _wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF _amount < 100 THEN
    RAISE EXCEPTION 'Minimum transfer amount is ₦100';
  END IF;

  IF _referral_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient referral balance';
  END IF;

  UPDATE public.wallets
  SET
    referral_balance = referral_balance - _amount,
    balance = balance + _amount
  WHERE id = _wallet_id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, status)
  VALUES (_wallet_id, 'credit', _amount, 'Referral earnings transferred to main wallet', 'completed');
END;
$function$;
