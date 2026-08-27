-- 1) Record which bundle a line belongs to (needed for server-side kit pricing)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS bundle_id uuid REFERENCES public.bundles(id) ON DELETE SET NULL;

-- 2) Lowest legitimate unit price for a product (clearance ladder, flash deals, offers, kits)
CREATE OR REPLACE FUNCTION public.order_item_price_floor(_product_id uuid, _bundle_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base numeric;
  cat uuid;
  brd text;
  kind text;
  exp date;
  months numeric;
  pct numeric := 0;
  floor_price numeric;
  cand numeric;
  bundle_price numeric;
  bundle_sum numeric;
BEGIN
  SELECT p.price, p.category_id, p.brand, p.clearance_kind, p.expiry_date
    INTO base, cat, brd, kind, exp
  FROM public.products p WHERE p.id = _product_id;
  IF base IS NULL THEN RETURN 0; END IF;

  -- automatic near-expiry markdown ladder
  IF kind = 'near_expiry' AND exp IS NOT NULL THEN
    months := floor(GREATEST(0, (exp - CURRENT_DATE)) / 30.44);
    SELECT LEAST(90, GREATEST(0, COALESCE(r.discount_percent, 0)))
      INTO pct
    FROM public.clearance_rules r
    WHERE r.is_active AND months <= r.months_left
    ORDER BY r.months_left ASC
    LIMIT 1;
    pct := COALESCE(pct, 0);
  END IF;

  floor_price := GREATEST(0, base - (base * pct / 100));

  -- active flash deals on this product
  FOR cand IN
    SELECT CASE
             WHEN d.discount_type = 'percent'
               THEN floor_price - LEAST(COALESCE(d.max_discount, 1e18), floor_price * LEAST(GREATEST(COALESCE(d.discount_value,0),0), 100) / 100)
             WHEN d.discount_type = 'fixed'
               THEN floor_price - LEAST(COALESCE(d.max_discount, 1e18), GREATEST(COALESCE(d.discount_value,0),0))
             ELSE floor_price
           END
    FROM public.flash_deals d
    WHERE d.is_active
      AND d.product_id = _product_id
      AND d.starts_at <= now()
      AND (d.ends_at IS NULL OR d.ends_at > now())
  LOOP
    floor_price := LEAST(floor_price, GREATEST(0, cand));
  END LOOP;

  -- active offers reaching this product (all / category / brand / explicit products), incl. BXGY
  FOR cand IN
    SELECT CASE
             WHEN o.discount_type = 'percent'
               THEN floor_price - LEAST(COALESCE(o.max_discount, 1e18), floor_price * LEAST(GREATEST(COALESCE(o.discount_value,0),0), 100) / 100)
             WHEN o.discount_type = 'fixed'
               THEN floor_price - LEAST(COALESCE(o.max_discount, 1e18), GREATEST(COALESCE(o.discount_value,0),0))
             WHEN o.discount_type = 'bxgy'
               THEN floor_price * GREATEST(COALESCE(o.buy_qty,1),1)::numeric
                    / GREATEST(COALESCE(o.buy_qty,1) + GREATEST(COALESCE(o.get_qty,0),0), 1)::numeric
             ELSE floor_price
           END
    FROM public.offers o
    WHERE o.is_active
      AND o.starts_at <= now()
      AND (o.ends_at IS NULL OR o.ends_at > now())
      AND (
        o.scope = 'all'
        OR (o.scope = 'category' AND o.category_id IS NOT NULL AND o.category_id = cat)
        OR (o.scope = 'brand' AND o.brand <> '' AND lower(o.brand) = lower(COALESCE(brd, '')))
        OR (o.scope = 'products' AND EXISTS (
              SELECT 1 FROM public.offer_products op
              WHERE op.offer_id = o.id AND op.product_id = _product_id))
      )
  LOOP
    floor_price := LEAST(floor_price, GREATEST(0, cand));
  END LOOP;

  -- kit (bundle) pricing: the line may carry its pro-rated share of the kit price
  IF _bundle_id IS NOT NULL THEN
    SELECT b.price INTO bundle_price
    FROM public.bundles b
    WHERE b.id = _bundle_id
      AND b.is_active
      AND (b.ends_at IS NULL OR b.ends_at > now())
      AND _product_id::text = ANY (b.product_ids);
    IF bundle_price IS NOT NULL THEN
      SELECT COALESCE(SUM(p.price), 0) INTO bundle_sum
      FROM public.products p
      WHERE p.id::text = ANY ((SELECT b.product_ids FROM public.bundles b WHERE b.id = _bundle_id));
      IF bundle_sum > 0 THEN
        floor_price := LEAST(floor_price, GREATEST(0, base * bundle_price / bundle_sum));
      END IF;
    END IF;
  END IF;

  RETURN GREATEST(0, floor_price);
END;
$$;

REVOKE ALL ON FUNCTION public.order_item_price_floor(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.order_item_price_floor(uuid, uuid) TO service_role;

-- 3) Enforce line price + product snapshot fields server-side
CREATE OR REPLACE FUNCTION public.enforce_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  floor_price numeric;
  ceil_price numeric;
BEGIN
  NEW.quantity := GREATEST(1, COALESCE(NEW.quantity, 1));

  SELECT id, price, name_ar, name_ku, image_url INTO p
  FROM public.products WHERE id = NEW.product_id;

  IF p.id IS NULL THEN
    -- no catalog row: never trust a client price
    NEW.unit_price := GREATEST(0, COALESCE(NEW.unit_price, 0));
    RETURN NEW;
  END IF;

  NEW.name_ar := p.name_ar;
  NEW.name_ku := p.name_ku;
  NEW.image_url := p.image_url;

  ceil_price := GREATEST(0, COALESCE(p.price, 0));
  floor_price := public.order_item_price_floor(NEW.product_id, NEW.bundle_id);

  IF COALESCE(NEW.unit_price, 0) > ceil_price THEN
    NEW.unit_price := ceil_price;
  ELSIF COALESCE(NEW.unit_price, 0) < floor_price - 1 THEN
    NEW.unit_price := floor_price;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_enforce_price ON public.order_items;
CREATE TRIGGER order_items_enforce_price
BEFORE INSERT OR UPDATE OF unit_price, quantity, product_id, bundle_id ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_item_price();

-- 4) Recompute order money from the real lines, store settings and a validated coupon
CREATE OR REPLACE FUNCTION public.recalc_order_money(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub numeric := 0;
  disc numeric := 0;
  vendors int := 1;
  fee numeric := 0;
  free_over numeric := 0;
  ship numeric := 0;
  after_disc numeric := 0;
  code text;
  c record;
BEGIN
  SELECT COALESCE(SUM(unit_price * quantity), 0),
         GREATEST(1, COUNT(DISTINCT COALESCE(vendor_id::text, 'none')))
    INTO sub, vendors
  FROM public.order_items WHERE order_id = _order_id;

  SELECT coupon_code INTO code FROM public.orders WHERE id = _order_id;

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

  UPDATE public.orders
     SET subtotal = sub,
         discount = disc,
         total = after_disc + ship
   WHERE id = _order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recalc_order_money(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalc_order_money(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.order_items_recalc_money()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT order_id FROM (
      SELECT order_id FROM changed_rows
    ) x
  LOOP
    PERFORM public.recalc_order_money(r.order_id);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS order_items_money_ins ON public.order_items;
CREATE TRIGGER order_items_money_ins
AFTER INSERT ON public.order_items
REFERENCING NEW TABLE AS changed_rows
FOR EACH STATEMENT EXECUTE FUNCTION public.order_items_recalc_money();

DROP TRIGGER IF EXISTS order_items_money_upd ON public.order_items;
CREATE TRIGGER order_items_money_upd
AFTER UPDATE ON public.order_items
REFERENCING NEW TABLE AS changed_rows
FOR EACH STATEMENT EXECUTE FUNCTION public.order_items_recalc_money();

DROP TRIGGER IF EXISTS order_items_money_del ON public.order_items;
CREATE TRIGGER order_items_money_del
AFTER DELETE ON public.order_items
REFERENCING OLD TABLE AS changed_rows
FOR EACH STATEMENT EXECUTE FUNCTION public.order_items_recalc_money();

-- 5) Never trust client-supplied money / status on a new order
CREATE OR REPLACE FUNCTION public.sanitize_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.subtotal := 0;
  NEW.discount := 0;
  NEW.total := 0;
  NEW.status := 'new';
  NEW.payment_status := 'unpaid';
  NEW.paid_at := NULL;
  NEW.qi_payment_id := NULL;
  NEW.qi_request_id := NULL;
  NEW.qi_status := NULL;
  NEW.qi_form_url := NULL;

  IF NEW.coupon_code IS NOT NULL AND btrim(NEW.coupon_code) <> '' THEN
    NEW.coupon_code := upper(btrim(NEW.coupon_code));
    IF NOT EXISTS (
      SELECT 1 FROM public.coupons c
      WHERE c.code = NEW.coupon_code
        AND c.is_active
        AND (c.ends_at IS NULL OR c.ends_at > now())
        AND (c.max_uses IS NULL OR c.used_count < c.max_uses)
    ) THEN
      NEW.coupon_code := NULL;
    END IF;
  ELSE
    NEW.coupon_code := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_sanitize_insert ON public.orders;
CREATE TRIGGER orders_sanitize_insert
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sanitize_new_order();

-- 6) Controlled cleanup path for line items while the order is still waiting
DROP POLICY IF EXISTS "own order items delete before fulfillment" ON public.order_items;
CREATE POLICY "own order items delete before fulfillment"
ON public.order_items FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.status = 'new'
      AND o.payment_status <> 'paid'
      AND (
        o.user_id = auth.uid()
        OR order_items.vendor_id IN (SELECT public.my_vendor_ids())
      )
  )
);

-- 7) Vendor order counts must not be readable by anonymous visitors
REVOKE ALL ON FUNCTION public.vendor_order_counts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vendor_order_counts() FROM anon;
GRANT EXECUTE ON FUNCTION public.vendor_order_counts() TO authenticated, service_role;