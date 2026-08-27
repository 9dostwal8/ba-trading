-- 1. settings toggles
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS wallet_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wallet_max_balance numeric NOT NULL DEFAULT 5000000,
  ADD COLUMN IF NOT EXISTS wallet_note_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS wallet_note_ku text NOT NULL DEFAULT '';

-- 2. wallets
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  is_frozen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_select_own" ON public.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "wallets_admin_all" ON public.wallets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER wallets_touch BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. transactions
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'admin_credit',
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  ref_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wallet_tx_user_idx ON public.wallet_transactions (user_id, created_at DESC);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_tx_select_own" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 4. cards / codes
CREATE TABLE public.wallet_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount numeric NOT NULL CHECK (amount > 0),
  batch text NOT NULL DEFAULT '',
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_cards TO authenticated;
GRANT ALL ON public.wallet_cards TO service_role;
ALTER TABLE public.wallet_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_cards_admin_all" ON public.wallet_cards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER wallet_cards_touch BEFORE UPDATE ON public.wallet_cards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.wallet_card_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.wallet_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, user_id)
);
GRANT SELECT ON public.wallet_card_redemptions TO authenticated;
GRANT ALL ON public.wallet_card_redemptions TO service_role;
ALTER TABLE public.wallet_card_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_redemptions_select_own" ON public.wallet_card_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5. helpers
CREATE OR REPLACE FUNCTION public.wallet_ensure(_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  SELECT id INTO _id FROM public.wallets WHERE user_id = _user_id;
  IF _id IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (_user_id) RETURNING id INTO _id;
  END IF;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.wallet_my_balance()
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  PERFORM public.wallet_ensure(auth.uid());
  SELECT balance INTO _b FROM public.wallets WHERE user_id = auth.uid();
  RETURN COALESCE(_b, 0);
END; $$;

-- admin add / remove balance
CREATE OR REPLACE FUNCTION public.wallet_admin_adjust(_user_id uuid, _amount numeric, _note text DEFAULT '')
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid; _bal numeric; _max numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _amount = 0 THEN RAISE EXCEPTION 'amount required'; END IF;
  _wid := public.wallet_ensure(_user_id);
  SELECT wallet_max_balance INTO _max FROM public.store_settings LIMIT 1;
  UPDATE public.wallets SET balance = balance + _amount WHERE id = _wid RETURNING balance INTO _bal;
  IF _bal < 0 THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  IF _max IS NOT NULL AND _bal > _max THEN RAISE EXCEPTION 'over max balance'; END IF;
  INSERT INTO public.wallet_transactions (wallet_id, user_id, kind, amount, balance_after, note, created_by)
  VALUES (_wid, _user_id, CASE WHEN _amount > 0 THEN 'admin_credit' ELSE 'admin_debit' END,
          _amount, _bal, COALESCE(_note, ''), auth.uid());
  RETURN _bal;
END; $$;

-- customer redeems a card code
CREATE OR REPLACE FUNCTION public.wallet_redeem_card(_code text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _card public.wallet_cards; _wid uuid; _bal numeric; _on boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT wallet_enabled INTO _on FROM public.store_settings LIMIT 1;
  IF NOT COALESCE(_on, false) THEN RAISE EXCEPTION 'wallet disabled'; END IF;
  SELECT * INTO _card FROM public.wallet_cards
    WHERE code = upper(btrim(_code)) FOR UPDATE;
  IF _card.id IS NULL THEN RAISE EXCEPTION 'invalid code'; END IF;
  IF NOT _card.is_active THEN RAISE EXCEPTION 'code inactive'; END IF;
  IF _card.expires_at IS NOT NULL AND _card.expires_at < now() THEN RAISE EXCEPTION 'code expired'; END IF;
  IF _card.used_count >= _card.max_uses THEN RAISE EXCEPTION 'code used'; END IF;
  IF EXISTS (SELECT 1 FROM public.wallet_card_redemptions WHERE card_id = _card.id AND user_id = auth.uid())
    THEN RAISE EXCEPTION 'already redeemed'; END IF;

  _wid := public.wallet_ensure(auth.uid());
  IF (SELECT is_frozen FROM public.wallets WHERE id = _wid) THEN RAISE EXCEPTION 'wallet frozen'; END IF;

  UPDATE public.wallet_cards SET used_count = used_count + 1 WHERE id = _card.id;
  INSERT INTO public.wallet_card_redemptions (card_id, user_id, amount) VALUES (_card.id, auth.uid(), _card.amount);
  UPDATE public.wallets SET balance = balance + _card.amount WHERE id = _wid RETURNING balance INTO _bal;
  INSERT INTO public.wallet_transactions (wallet_id, user_id, kind, amount, balance_after, note, ref_id)
  VALUES (_wid, auth.uid(), 'card_redeem', _card.amount, _bal, _card.code, _card.id);
  RETURN _bal;
END; $$;

-- pay an order from balance
CREATE OR REPLACE FUNCTION public.wallet_pay_order(_order_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid; _bal numeric; _total numeric; _on boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT wallet_enabled INTO _on FROM public.store_settings LIMIT 1;
  IF NOT COALESCE(_on, false) THEN RAISE EXCEPTION 'wallet disabled'; END IF;
  SELECT total INTO _total FROM public.orders
    WHERE id = _order_id AND user_id = auth.uid() AND payment_status <> 'paid';
  IF _total IS NULL THEN RAISE EXCEPTION 'order not payable'; END IF;
  _wid := public.wallet_ensure(auth.uid());
  IF (SELECT is_frozen FROM public.wallets WHERE id = _wid) THEN RAISE EXCEPTION 'wallet frozen'; END IF;
  UPDATE public.wallets SET balance = balance - _total WHERE id = _wid RETURNING balance INTO _bal;
  IF _bal < 0 THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  UPDATE public.orders SET payment_status = 'paid', paid_at = now(), payment_method = 'wallet'
    WHERE id = _order_id;
  INSERT INTO public.wallet_transactions (wallet_id, user_id, kind, amount, balance_after, note, ref_id)
  VALUES (_wid, auth.uid(), 'order_payment', -_total, _bal, '', _order_id);
  RETURN _bal;
END; $$;

REVOKE ALL ON FUNCTION public.wallet_ensure(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_my_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_redeem_card(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_pay_order(uuid) TO authenticated;