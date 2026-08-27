-- 1. Settings for vendor-sponsored reward points
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS reward_vendor_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reward_vendor_max_multiplier numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS reward_vendor_max_bonus integer NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS reward_vendor_cost_factor numeric NOT NULL DEFAULT 1;

-- 2. Offers can sponsor reward points too
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS reward_multiplier numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reward_bonus_points integer NOT NULL DEFAULT 0;

-- 3. Clamp vendor-set reward values to admin caps
CREATE OR REPLACE FUNCTION public.clamp_reward_sponsorship()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _max_m numeric; _max_b numeric; _on boolean;
BEGIN
  SELECT reward_vendor_enabled, reward_vendor_max_multiplier, reward_vendor_max_bonus
    INTO _on, _max_m, _max_b FROM public.store_settings LIMIT 1;
  _max_m := COALESCE(_max_m, 5);
  _max_b := COALESCE(_max_b, 2000);
  NEW.reward_multiplier := LEAST(GREATEST(COALESCE(NEW.reward_multiplier, 1), 1), GREATEST(_max_m, 1));
  NEW.reward_bonus_points := LEAST(GREATEST(COALESCE(NEW.reward_bonus_points, 0), 0), GREATEST(_max_b, 0))::integer;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.clamp_reward_sponsorship() FROM anon, authenticated;

DROP TRIGGER IF EXISTS products_clamp_reward ON public.products;
CREATE TRIGGER products_clamp_reward BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.clamp_reward_sponsorship();
DROP TRIGGER IF EXISTS offers_clamp_reward ON public.offers;
CREATE TRIGGER offers_clamp_reward BEFORE INSERT OR UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.clamp_reward_sponsorship();

-- 4. Ledger of vendor-sponsored points
CREATE TABLE IF NOT EXISTS public.vendor_reward_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'product',
  points numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vendor_reward_points_vendor_idx ON public.vendor_reward_points (vendor_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS vendor_reward_points_item_key ON public.vendor_reward_points (order_item_id, source);

GRANT SELECT ON public.vendor_reward_points TO authenticated;
GRANT ALL ON public.vendor_reward_points TO service_role;
ALTER TABLE public.vendor_reward_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendor_reward_points_read_admin" ON public.vendor_reward_points FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "vendor_reward_points_read_vendor" ON public.vendor_reward_points FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT public.my_vendor_ids()));
CREATE POLICY "vendor_reward_points_read_own" ON public.vendor_reward_points FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5. Best matching sponsored offer for a product
CREATE OR REPLACE FUNCTION public.reward_offer_for_product(_product_id uuid)
RETURNS public.offers LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.* FROM public.offers o
  JOIN public.products p ON p.id = _product_id
  WHERE o.is_active
    AND (o.reward_bonus_points > 0 OR o.reward_multiplier > 1)
    AND o.starts_at <= now() AND (o.ends_at IS NULL OR o.ends_at > now())
    AND (o.vendor_id IS NULL OR o.vendor_id = p.vendor_id)
    AND (
      o.scope = 'all'
      OR (o.scope = 'category' AND o.category_id = p.category_id)
      OR (o.scope = 'brand' AND lower(o.brand) = lower(p.brand))
      OR (o.scope = 'products' AND EXISTS (
            SELECT 1 FROM public.offer_products op WHERE op.offer_id = o.id AND op.product_id = p.id))
    )
  ORDER BY o.priority DESC, o.reward_bonus_points DESC
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.reward_offer_for_product(uuid) FROM anon, authenticated;

-- 6. Award coins on paid order, attributing sponsored points to vendors
CREATE OR REPLACE FUNCTION public.reward_award_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
END; $$;
REVOKE ALL ON FUNCTION public.reward_award_order(uuid) FROM public, anon, authenticated;

-- 7. Bill vendors for sponsored points
CREATE OR REPLACE FUNCTION public.charge_vendor_reward_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.cost, 0) > 0 THEN
    INSERT INTO public.vendor_charges (vendor_id, kind, ref_id, label, amount, status)
    VALUES (NEW.vendor_id, 'reward_points', NEW.id,
            'Reward points ' || round(NEW.points)::text || ' (' || NEW.source || ')',
            NEW.cost, 'unpaid');
  END IF;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.charge_vendor_reward_points() FROM anon, authenticated;

DROP TRIGGER IF EXISTS vendor_reward_points_charge ON public.vendor_reward_points;
CREATE TRIGGER vendor_reward_points_charge AFTER INSERT ON public.vendor_reward_points
  FOR EACH ROW EXECUTE FUNCTION public.charge_vendor_reward_points();