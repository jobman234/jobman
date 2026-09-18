
-- Transaction type enum
CREATE TYPE public.transaction_type AS ENUM ('credit', 'debit');

-- Transaction status enum
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');

-- Escrow status enum
CREATE TYPE public.escrow_status AS ENUM ('held', 'released', 'refunded', 'disputed');

-- Wallets table
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

-- Wallet transactions
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  reference TEXT,
  status public.transaction_status NOT NULL DEFAULT 'completed',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Escrow table
CREATE TABLE public.escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL,
  payee_id UUID NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  status public.escrow_status NOT NULL DEFAULT 'held',
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wallets_user ON public.wallets(user_id);
CREATE INDEX idx_wallet_txns_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_txns_created ON public.wallet_transactions(created_at DESC);
CREATE INDEX idx_escrows_job ON public.escrows(job_id);
CREATE INDEX idx_escrows_payer ON public.escrows(payer_id);
CREATE INDEX idx_escrows_payee ON public.escrows(payee_id);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrows ENABLE ROW LEVEL SECURITY;

-- Wallets RLS
CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert wallets" ON public.wallets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets" ON public.wallets
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Wallet transactions RLS
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wallets WHERE id = wallet_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert own transactions" ON public.wallet_transactions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.wallets WHERE id = wallet_id AND user_id = auth.uid()));

CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Escrows RLS
CREATE POLICY "Escrow participants can view" ON public.escrows
  FOR SELECT TO authenticated
  USING (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE POLICY "Payers can create escrow" ON public.escrows
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = payer_id);

CREATE POLICY "Participants can update escrow" ON public.escrows
  FOR UPDATE TO authenticated
  USING (payer_id = auth.uid() OR payee_id = auth.uid());

CREATE POLICY "Admins can view all escrows" ON public.escrows
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all escrows" ON public.escrows
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_escrows_updated_at
  BEFORE UPDATE ON public.escrows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to create wallet on user signup (add to existing trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'customer')
  );

  IF COALESCE(NEW.raw_user_meta_data->>'role', 'customer') = 'artisan' THEN
    INSERT INTO public.artisan_profiles (user_id, primary_trade)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'primary_trade', 'General'));
  END IF;

  -- Create wallet for every user
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$;

-- Function to fund escrow (debit payer wallet, create escrow)
CREATE OR REPLACE FUNCTION public.fund_escrow(
  _job_id UUID,
  _payer_id UUID,
  _payee_id UUID,
  _amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _wallet_id UUID;
  _escrow_id UUID;
  _balance NUMERIC;
BEGIN
  -- Get payer wallet
  SELECT id, balance INTO _wallet_id, _balance
  FROM public.wallets WHERE user_id = _payer_id FOR UPDATE;

  IF _wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF _balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Debit wallet
  UPDATE public.wallets SET balance = balance - _amount WHERE id = _wallet_id;

  -- Record transaction
  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference, status)
  VALUES (_wallet_id, 'debit', _amount, 'Escrow payment for job', _job_id::TEXT, 'completed');

  -- Create escrow
  INSERT INTO public.escrows (job_id, payer_id, payee_id, amount)
  VALUES (_job_id, _payer_id, _payee_id, _amount)
  RETURNING id INTO _escrow_id;

  RETURN _escrow_id;
END;
$$;

-- Function to release escrow (credit payee wallet)
CREATE OR REPLACE FUNCTION public.release_escrow(_escrow_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _payee_wallet_id UUID;
  _amount NUMERIC;
  _payee_id UUID;
  _job_id UUID;
  _status escrow_status;
BEGIN
  SELECT amount, payee_id, job_id, status INTO _amount, _payee_id, _job_id, _status
  FROM public.escrows WHERE id = _escrow_id FOR UPDATE;

  IF _status != 'held' THEN
    RAISE EXCEPTION 'Escrow is not in held status';
  END IF;

  SELECT id INTO _payee_wallet_id FROM public.wallets WHERE user_id = _payee_id;

  -- Credit payee
  UPDATE public.wallets SET balance = balance + _amount WHERE id = _payee_wallet_id;

  INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference, status)
  VALUES (_payee_wallet_id, 'credit', _amount, 'Escrow release for job', _job_id::TEXT, 'completed');

  -- Update escrow
  UPDATE public.escrows SET status = 'released', released_at = now() WHERE id = _escrow_id;
END;
$$;
