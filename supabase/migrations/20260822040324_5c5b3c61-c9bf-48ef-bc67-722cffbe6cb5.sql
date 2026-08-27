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
  tier_min numeric;
BEGIN
  SELECT p.price, p.category_id, p.brand, p.clearance_kind, p.expiry_date
    INTO base, cat, brd, kind, exp
  FROM public.products p WHERE p.id = _product_id;
  IF base IS NULL THEN RETURN 0; END IF;

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

  -- wholesale quantity tiers
  SELECT MIN(t.price) INTO tier_min
  FROM public.product_tiers t WHERE t.product_id = _product_id;
  IF tier_min IS NOT NULL THEN
    floor_price := LEAST(floor_price, GREATEST(0, tier_min));
  END IF;

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

REVOKE ALL ON FUNCTION public.order_item_price_floor(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.order_item_price_floor(uuid, uuid) TO postgres, service_role;