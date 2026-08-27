-- Redemption cap now applies to the dentist's POINTS BALANCE (e.g. 50% of points),
-- not to the order total. The money value is still clamped to the order total.
CREATE OR REPLACE FUNCTION public.reward_redeem_order(_order_id uuid, _points integer)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o record; _wid uuid; _bal numeric; rate numeric; maxpct numeric; on_flag boolean;
  value numeric; allowed_pts integer; use_pts integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT rewards_enabled, points_per_1000_iqd, rewards_max_redeem_percent
    INTO on_flag, rate, maxpct FROM public.store_settings LIMIT 1;
  IF NOT COALESCE(on_flag, false) THEN RAISE EXCEPTION 'rewards disabled'; END IF;
  IF COALESCE(rate, 0) <= 0 THEN RAISE EXCEPTION 'rate not set'; END IF;

  SELECT id, total, coins_spent INTO o FROM public.orders
   WHERE id = _order_id AND user_id = auth.uid() AND payment_status <> 'paid' FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'order not payable'; END IF;
  IF COALESCE(o.coins_spent, 0) > 0 THEN RAISE EXCEPTION 'already redeemed'; END IF;

  _wid := public.wallet_ensure(auth.uid());
  IF (SELECT is_frozen FROM public.wallets WHERE id = _wid) THEN RAISE EXCEPTION 'rewards frozen'; END IF;
  SELECT balance INTO _bal FROM public.wallets WHERE id = _wid;

  -- max share of the balance the dentist may spend at once
  allowed_pts := floor(GREATEST(COALESCE(_bal, 0), 0)
                       * LEAST(GREATEST(COALESCE(maxpct, 0), 0), 100) / 100)::integer;
  use_pts := LEAST(GREATEST(COALESCE(_points, 0), 0), allowed_pts);
  IF use_pts <= 0 THEN RAISE EXCEPTION 'no points'; END IF;

  value := round(use_pts / rate * 1000);
  -- never discount more than the order itself
  IF value > GREATEST(COALESCE(o.total, 0), 0) THEN
    value := GREATEST(COALESCE(o.total, 0), 0);
    use_pts := floor(value * rate / 1000)::integer;
  END IF;
  IF use_pts <= 0 OR value <= 0 THEN RAISE EXCEPTION 'no points'; END IF;

  UPDATE public.wallets SET balance = balance - use_pts WHERE id = _wid RETURNING balance INTO _bal;
  IF _bal < 0 THEN RAISE EXCEPTION 'insufficient points'; END IF;

  INSERT INTO public.wallet_transactions (wallet_id, user_id, kind, amount, balance_after, note, ref_id)
  VALUES (_wid, auth.uid(), 'spend_order', -use_pts, _bal, '', _order_id);

  UPDATE public.orders SET coins_spent = use_pts, coins_discount = value WHERE id = _order_id;
  PERFORM public.recalc_order_money(_order_id);
  RETURN value;
END; $$;

REVOKE ALL ON FUNCTION public.reward_redeem_order(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reward_redeem_order(uuid, integer) TO authenticated;
