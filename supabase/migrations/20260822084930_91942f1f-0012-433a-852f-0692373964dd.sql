CREATE OR REPLACE FUNCTION public.can_order(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL
     AND NOT public.has_role(_user_id, 'admin')
     AND NOT EXISTS (SELECT 1 FROM public.vendor_members m WHERE m.user_id = _user_id)
$$;

REVOKE ALL ON FUNCTION public.can_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_order(uuid) TO authenticated, service_role;

-- Orders: dentists only for inserts; admins keep read/update/delete
DROP POLICY IF EXISTS "own orders insert" ON public.orders;
CREATE POLICY "buyers insert own orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_order(auth.uid()));

DROP POLICY IF EXISTS "admins manage orders" ON public.orders;
CREATE POLICY "admins read orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete orders" ON public.orders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Order items: same rule
DROP POLICY IF EXISTS "own order items insert" ON public.order_items;
CREATE POLICY "buyers insert own order items" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (public.owns_order(order_id) AND public.can_order(auth.uid()));

DROP POLICY IF EXISTS "admins manage order items" ON public.order_items;
CREATE POLICY "admins read order items" ON public.order_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update order items" ON public.order_items
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete order items" ON public.order_items
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Reward points: admins and vendor members never earn points
CREATE OR REPLACE FUNCTION public.reward_grant(_user_id uuid, _kind text, _points numeric, _note text DEFAULT ''::text, _ref uuid DEFAULT NULL::uuid, _once boolean DEFAULT false)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _wid uuid; _bal numeric;
BEGIN
  IF _user_id IS NULL OR COALESCE(_points, 0) <= 0 THEN RETURN 0; END IF;
  IF NOT public.can_order(_user_id) THEN RETURN 0; END IF;
  IF _once AND EXISTS (
    SELECT 1 FROM public.wallet_transactions t
    WHERE t.user_id = _user_id AND t.kind = _kind
      AND (_ref IS NULL OR t.ref_id = _ref)
      AND (_ref IS NOT NULL OR t.note = COALESCE(_note, ''))
  ) THEN RETURN 0; END IF;
  _wid := public.wallet_ensure(_user_id);
  UPDATE public.wallets SET balance = balance + _points WHERE id = _wid RETURNING balance INTO _bal;
  INSERT INTO public.wallet_transactions (wallet_id, user_id, kind, amount, balance_after, note, ref_id)
  VALUES (_wid, _user_id, _kind, _points, _bal, COALESCE(_note, ''), _ref);
  RETURN _points;
END; $function$;

CREATE OR REPLACE FUNCTION public.reward_award_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  o record; it record; ofr record; rate numeric; base numeric := 0; bonus numeric := 0; total_pts numeric := 0;
  paid_orders integer; months integer; tier integer; mkey text; month_spend numeric;
  target numeric; inviter uuid; on_flag boolean;
  vend_on boolean; cost_factor numeric; coin_rate numeric;
  line_base numeric; p_pts numeric; o_pts numeric; cost numeric;
BEGIN
  SELECT rewards_enabled, reward_vendor_enabled, reward_vendor_cost_factor, points_per_1000_iqd
    INTO on_flag, vend_on, cost_factor, coin_rate FROM public.store_settings LIMIT 1;
  IF NOT COALESCE(on_flag, false) THEN RETURN; END IF;
  cost_factor := COALESCE(cost_factor, 1);
  coin_rate := GREATEST(COALESCE(coin_rate, 100), 1);

  SELECT id, user_id, total, paid_at FROM public.orders WHERE id = _order_id INTO o;
  IF o.id IS NULL OR o.user_id IS NULL THEN RETURN; END IF;
  IF NOT public.can_order(o.user_id) THEN RETURN; END IF;

  rate := public.reward_rule('purchase_per_1000_iqd');
  base := floor(GREATEST(COALESCE(o.total, 0), 0) / 1000.0 * rate);

  FOR it IN
    SELECT i.id, i.product_id, i.vendor_id, i.unit_price, i.quantity,
           COALESCE(p.reward_multiplier, 1) AS p_mult, COALESCE(p.reward_bonus_points, 0) AS p_bonus
      FROM public.order_items i
      LEFT JOIN public.products p ON p.id = i.product_id
     WHERE i.order_id = _order_id
  LOOP
    line_base := floor(COALESCE(it.unit_price, 0) * COALESCE(it.quantity, 0) / 1000.0 * rate);
    p_pts := floor(line_base * GREATEST(it.p_mult - 1, 0) + it.p_bonus * COALESCE(it.quantity, 0));

    ofr := NULL;
    o_pts := 0;
    IF it.product_id IS NOT NULL THEN
      SELECT * INTO ofr FROM public.reward_offer_for_product(it.product_id);
      IF ofr.id IS NOT NULL THEN
        o_pts := floor(line_base * GREATEST(COALESCE(ofr.reward_multiplier, 1) - 1, 0)
                       + COALESCE(ofr.reward_bonus_points, 0) * COALESCE(it.quantity, 0));
      END IF;
    END IF;

    bonus := bonus + p_pts + o_pts;

    IF COALESCE(vend_on, true) AND it.vendor_id IS NOT NULL THEN
      IF p_pts > 0 THEN
        cost := round(p_pts / coin_rate * 1000.0 * cost_factor);
        INSERT INTO public.vendor_reward_points
          (vendor_id, order_id, order_item_id, product_id, user_id, source, points, cost, note)
        VALUES (it.vendor_id, _order_id, it.id, it.product_id, o.user_id, 'product', p_pts, cost, 'product boost')
        ON CONFLICT (order_item_id, source) DO NOTHING;
      END IF;
      IF o_pts > 0 THEN
        cost := round(o_pts / coin_rate * 1000.0 * cost_factor);
        INSERT INTO public.vendor_reward_points
          (vendor_id, order_id, order_item_id, product_id, offer_id, user_id, source, points, cost, note)
        VALUES (it.vendor_id, _order_id, it.id, it.product_id, ofr.id, o.user_id, 'offer', o_pts, cost, 'offer boost')
        ON CONFLICT (order_item_id, source) DO NOTHING;
      END IF;
    END IF;
  END LOOP;

  total_pts := floor(base + bonus);
  IF total_pts > 0 THEN
    PERFORM public.reward_grant(o.user_id, 'earn_purchase', total_pts, '', _order_id, true);
    UPDATE public.orders SET coins_earned = total_pts WHERE id = _order_id;
  END IF;

  SELECT count(*) INTO paid_orders FROM public.orders
   WHERE user_id = o.user_id AND payment_status = 'paid';

  IF paid_orders = 1 THEN
    PERFORM public.reward_grant(o.user_id, 'earn_first_order', public.reward_rule('first_order'), '', _order_id, true);
    SELECT referred_by INTO inviter FROM public.profiles WHERE id = o.user_id;
    IF inviter IS NOT NULL THEN
      PERFORM public.reward_grant(inviter, 'earn_referral', public.reward_rule('referral_inviter'), '', o.user_id, true);
      PERFORM public.reward_grant(o.user_id, 'earn_referral', public.reward_rule('referral_invitee'), '', o.user_id, true);
    END IF;
  END IF;

  SELECT count(*) INTO months FROM (
    SELECT date_trunc('month', COALESCE(paid_at, created_at)) AS m,
           row_number() OVER (ORDER BY date_trunc('month', COALESCE(paid_at, created_at)) DESC) AS rn
    FROM (SELECT DISTINCT date_trunc('month', COALESCE(paid_at, created_at)) AS paid_at, created_at
            FROM public.orders WHERE user_id = o.user_id AND payment_status = 'paid') d
  ) x WHERE m = date_trunc('month', now()) - ((rn - 1) || ' months')::interval;

  FOREACH tier IN ARRAY ARRAY[12, 6, 3] LOOP
    IF months >= tier THEN
      PERFORM public.reward_grant(o.user_id, 'earn_streak', public.reward_rule('streak_' || tier),
        tier || 'm:' || to_char(now(), 'YYYY-MM'), NULL, true);
      EXIT;
    END IF;
  END LOOP;

  target := public.reward_rule('challenge_target_iqd');
  IF target > 0 THEN
    SELECT COALESCE(SUM(total), 0) INTO month_spend FROM public.orders
     WHERE user_id = o.user_id AND payment_status = 'paid'
       AND COALESCE(paid_at, created_at) >= date_trunc('month', now());
    IF month_spend >= target THEN
      mkey := to_char(now(), 'YYYY-MM');
      PERFORM public.reward_grant(o.user_id, 'earn_challenge', public.reward_rule('challenge_bonus'), mkey, NULL, true);
    END IF;
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.reward_claim_profile()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE p record; got numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.can_order(auth.uid()) THEN RETURN 0; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  IF p.id IS NULL THEN RETURN 0; END IF;
  IF btrim(COALESCE(p.clinic_name, '')) <> '' THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_clinic_name'), 'clinic_name', NULL, true); END IF;
  IF btrim(COALESCE(p.specialty, '')) <> '' THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_specialty'), 'specialty', NULL, true); END IF;
  IF btrim(COALESCE(p.city, '')) <> '' THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_city'), 'city', NULL, true); END IF;
  IF COALESCE(array_length(p.preferred_categories, 1), 0) > 0 THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_categories'), 'categories', NULL, true); END IF;
  IF btrim(COALESCE(p.clinic_name, '')) <> '' AND btrim(COALESCE(p.specialty, '')) <> ''
     AND btrim(COALESCE(p.city, '')) <> '' AND COALESCE(array_length(p.preferred_categories, 1), 0) > 0 THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_complete'), 'complete', NULL, true); END IF;
  RETURN got;
END; $function$;

CREATE OR REPLACE FUNCTION public.reward_on_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE pts numeric;
BEGIN
  IF NOT public.can_order(NEW.user_id) THEN RETURN NULL; END IF;
  pts := public.reward_rule(CASE WHEN COALESCE(NEW.image_url, '') <> '' THEN 'review_photo' ELSE 'review' END);
  PERFORM public.reward_grant(NEW.user_id, 'earn_review', pts, '', NEW.product_id, true);
  RETURN NULL;
END; $function$;