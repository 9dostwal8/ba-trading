-- 1. Reward rules (admin controlled)
CREATE TABLE public.reward_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  points numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reward_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_rules TO authenticated;
GRANT ALL ON public.reward_rules TO service_role;
ALTER TABLE public.reward_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reward_rules_read" ON public.reward_rules FOR SELECT USING (true);
CREATE POLICY "reward_rules_admin_write" ON public.reward_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER reward_rules_touch BEFORE UPDATE ON public.reward_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.reward_rules (key, points, sort_order) VALUES
  ('purchase_per_1000_iqd', 1, 10),
  ('first_order', 500, 20),
  ('review', 50, 30),
  ('review_photo', 100, 40),
  ('referral_inviter', 500, 50),
  ('referral_invitee', 500, 60),
  ('streak_3', 500, 70),
  ('streak_6', 1500, 80),
  ('streak_12', 5000, 90),
  ('challenge_target_iqd', 500000, 100),
  ('challenge_bonus', 1000, 110),
  ('profile_clinic_name', 50, 120),
  ('profile_specialty', 50, 130),
  ('profile_city', 50, 140),
  ('profile_categories', 50, 150),
  ('profile_complete', 200, 160);

-- 2. Store settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS rewards_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS points_per_1000_iqd numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS rewards_max_redeem_percent numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS rewards_note_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rewards_note_ku text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rewards_note_en text NOT NULL DEFAULT '';

-- 3. Products: coin boosts
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS reward_multiplier numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reward_bonus_points integer NOT NULL DEFAULT 0;

-- 4. Orders: coin spend / earn
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coins_spent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_earned integer NOT NULL DEFAULT 0;

-- 5. Profiles: clinic data + referrals
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS clinic_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS specialty text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS preferred_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS referral_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS referred_by uuid;

CREATE OR REPLACE FUNCTION public.profiles_fill_referral_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.referral_code, '') = '' THEN
    NEW.referral_code := 'DK' || upper(left(replace(NEW.id::text, '-', ''), 6));
  END IF;
  IF NEW.referred_by = NEW.id THEN NEW.referred_by := NULL; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_referral_code BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_fill_referral_code();
UPDATE public.profiles SET referral_code = 'DK' || upper(left(replace(id::text, '-', ''), 6))
  WHERE COALESCE(referral_code, '') = '';
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles (referral_code);

-- 6. Product reviews (purchased products only)
CREATE OR REPLACE FUNCTION public.user_bought_product(_user_id uuid, _product_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items i
    JOIN public.orders o ON o.id = i.order_id
    WHERE i.product_id = _product_id AND o.user_id = _user_id AND o.payment_status = 'paid'
  )
$$;
REVOKE ALL ON FUNCTION public.user_bought_product(uuid, uuid) FROM public;

CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  comment text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT ON public.product_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_read" ON public.product_reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_own_purchase" ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.user_bought_product(auth.uid(), product_id));
CREATE POLICY "reviews_update_own" ON public.product_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews_delete_own_or_admin" ON public.product_reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER product_reviews_touch BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 7. Reward helpers
CREATE OR REPLACE FUNCTION public.reward_rule(_key text)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT r.points FROM public.reward_rules r WHERE r.key = _key AND r.is_active), 0)
$$;
REVOKE ALL ON FUNCTION public.reward_rule(text) FROM public;

CREATE OR REPLACE FUNCTION public.reward_grant(_user_id uuid, _kind text, _points numeric, _note text DEFAULT '', _ref uuid DEFAULT NULL, _once boolean DEFAULT false)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid; _bal numeric;
BEGIN
  IF _user_id IS NULL OR COALESCE(_points, 0) <= 0 THEN RETURN 0; END IF;
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
END; $$;
REVOKE ALL ON FUNCTION public.reward_grant(uuid, text, numeric, text, uuid, boolean) FROM public;

-- 8. Award coins when an order becomes paid
CREATE OR REPLACE FUNCTION public.reward_award_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o record; rate numeric; base numeric := 0; bonus numeric := 0; total_pts numeric := 0;
  paid_orders integer; months integer; tier integer; mkey text; month_spend numeric;
  target numeric; inviter uuid; on_flag boolean;
BEGIN
  SELECT rewards_enabled INTO on_flag FROM public.store_settings LIMIT 1;
  IF NOT COALESCE(on_flag, false) THEN RETURN; END IF;

  SELECT id, user_id, total, paid_at FROM public.orders WHERE id = _order_id INTO o;
  IF o.id IS NULL OR o.user_id IS NULL THEN RETURN; END IF;

  rate := public.reward_rule('purchase_per_1000_iqd');
  base := floor(GREATEST(COALESCE(o.total, 0), 0) / 1000.0 * rate);

  SELECT COALESCE(SUM(
      floor(i.unit_price * i.quantity / 1000.0 * rate) * GREATEST(COALESCE(p.reward_multiplier, 1) - 1, 0)
      + COALESCE(p.reward_bonus_points, 0) * i.quantity), 0)
    INTO bonus
  FROM public.order_items i LEFT JOIN public.products p ON p.id = i.product_id
  WHERE i.order_id = _order_id;

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

  -- consecutive months with a paid order, ending this month
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

  -- monthly challenge
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
END; $$;
REVOKE ALL ON FUNCTION public.reward_award_order(uuid) FROM public;

CREATE OR REPLACE FUNCTION public.reward_on_order_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND COALESCE(OLD.payment_status, '') <> 'paid' THEN
    PERFORM public.reward_award_order(NEW.id);
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER orders_reward_award AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.reward_on_order_paid();

-- 9. Review rewards
CREATE OR REPLACE FUNCTION public.reward_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pts numeric;
BEGIN
  pts := public.reward_rule(CASE WHEN COALESCE(NEW.image_url, '') <> '' THEN 'review_photo' ELSE 'review' END);
  PERFORM public.reward_grant(NEW.user_id, 'earn_review', pts, '', NEW.product_id, true);
  RETURN NULL;
END; $$;
CREATE TRIGGER product_reviews_reward AFTER INSERT ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.reward_on_review();

-- 10. Profile completion rewards
CREATE OR REPLACE FUNCTION public.reward_claim_profile()
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; got numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
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
END; $$;

-- 11. Referral code use
CREATE OR REPLACE FUNCTION public.reward_use_referral(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inviter uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND referred_by IS NOT NULL) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE user_id = auth.uid() AND payment_status = 'paid') THEN RETURN false; END IF;
  SELECT id INTO _inviter FROM public.profiles WHERE referral_code = upper(btrim(_code));
  IF _inviter IS NULL OR _inviter = auth.uid() THEN RETURN false; END IF;
  UPDATE public.profiles SET referred_by = _inviter WHERE id = auth.uid();
  RETURN true;
END; $$;

-- 12. Redeem points as an order discount
CREATE OR REPLACE FUNCTION public.reward_redeem_order(_order_id uuid, _points integer)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o record; _wid uuid; _bal numeric; rate numeric; maxpct numeric; on_flag boolean;
  value numeric; cap numeric; use_pts integer;
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

  use_pts := LEAST(GREATEST(COALESCE(_points, 0), 0), floor(COALESCE(_bal, 0))::integer);
  IF use_pts <= 0 THEN RAISE EXCEPTION 'no points'; END IF;

  cap := round(GREATEST(COALESCE(o.total, 0), 0) * LEAST(GREATEST(COALESCE(maxpct, 0), 0), 100) / 100);
  value := round(use_pts / rate * 1000);
  IF value > cap THEN
    value := cap;
    use_pts := floor(cap * rate / 1000)::integer;
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

-- 13. Include the coin discount in order totals
CREATE OR REPLACE FUNCTION public.recalc_order_money(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sub numeric := 0; disc numeric := 0; vendors int := 1; fee numeric := 0;
  free_over numeric := 0; ship numeric := 0; after_disc numeric := 0;
  code text; c record; coin numeric := 0; gross numeric := 0;
BEGIN
  SELECT COALESCE(SUM(unit_price * quantity), 0),
         GREATEST(1, COUNT(DISTINCT COALESCE(vendor_id::text, 'none')))
    INTO sub, vendors
  FROM public.order_items WHERE order_id = _order_id;

  SELECT coupon_code, COALESCE(coins_discount, 0) INTO code, coin
    FROM public.orders WHERE id = _order_id;

  IF code IS NOT NULL AND btrim(code) <> '' THEN
    SELECT * INTO c FROM public.validate_coupon(code, sub) LIMIT 1;
    IF c.code IS NOT NULL THEN
      disc := CASE
        WHEN c.discount_type = 'fixed' THEN LEAST(GREATEST(COALESCE(c.discount_value,0),0), sub)
        ELSE round(sub * LEAST(GREATEST(COALESCE(c.discount_value,0),0), 100) / 100)
      END;
    END IF;
  END IF;

  SELECT COALESCE(delivery_fee, 0), COALESCE(free_delivery_over, 0)
    INTO fee, free_over FROM public.store_settings LIMIT 1;

  after_disc := GREATEST(0, sub - disc);
  ship := CASE WHEN free_over > 0 AND after_disc >= free_over THEN 0 ELSE fee * vendors END;
  gross := after_disc + ship;
  coin := LEAST(GREATEST(coin, 0), gross);

  UPDATE public.orders
     SET subtotal = sub,
         discount = disc + coin,
         total = GREATEST(0, gross - coin)
   WHERE id = _order_id;
END; $$;

-- 14. My rewards summary
CREATE OR REPLACE FUNCTION public.reward_my_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  bal numeric; month_spend numeric; target numeric; months integer := 0;
  rate numeric; code text; refs integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  PERFORM public.wallet_ensure(auth.uid());
  SELECT balance INTO bal FROM public.wallets WHERE user_id = auth.uid();
  SELECT COALESCE(SUM(total), 0) INTO month_spend FROM public.orders
   WHERE user_id = auth.uid() AND payment_status = 'paid'
     AND COALESCE(paid_at, created_at) >= date_trunc('month', now());
  target := public.reward_rule('challenge_target_iqd');
  SELECT points_per_1000_iqd INTO rate FROM public.store_settings LIMIT 1;
  SELECT referral_code INTO code FROM public.profiles WHERE id = auth.uid();
  SELECT count(*) INTO refs FROM public.profiles p
   WHERE p.referred_by = auth.uid()
     AND EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id = p.id AND o.payment_status = 'paid');

  SELECT count(*) INTO months FROM (
    SELECT m, row_number() OVER (ORDER BY m DESC) AS rn FROM (
      SELECT DISTINCT date_trunc('month', COALESCE(paid_at, created_at)) AS m
        FROM public.orders WHERE user_id = auth.uid() AND payment_status = 'paid') d
  ) x WHERE m = date_trunc('month', now()) - ((rn - 1) || ' months')::interval;

  RETURN jsonb_build_object(
    'balance', COALESCE(bal, 0),
    'month_spend', month_spend,
    'challenge_target', target,
    'challenge_bonus', public.reward_rule('challenge_bonus'),
    'streak_months', months,
    'points_per_1000_iqd', COALESCE(rate, 0),
    'referral_code', COALESCE(code, ''),
    'referrals_done', refs
  );
END; $$;

REVOKE EXECUTE ON FUNCTION public.reward_claim_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.reward_use_referral(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reward_redeem_order(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reward_my_summary() FROM anon;