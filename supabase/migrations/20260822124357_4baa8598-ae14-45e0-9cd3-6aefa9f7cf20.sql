CREATE TABLE IF NOT EXISTS public.vendor_shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  city text NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  free_over numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS vendor_shipping_rates_key
  ON public.vendor_shipping_rates (vendor_id, lower(btrim(city)));

GRANT SELECT ON public.vendor_shipping_rates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_shipping_rates TO authenticated;
GRANT ALL ON public.vendor_shipping_rates TO service_role;

ALTER TABLE public.vendor_shipping_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vsr_public_read ON public.vendor_shipping_rates;
CREATE POLICY vsr_public_read ON public.vendor_shipping_rates
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS vsr_vendor_manage ON public.vendor_shipping_rates;
CREATE POLICY vsr_vendor_manage ON public.vendor_shipping_rates
  FOR ALL TO authenticated
  USING (vendor_id IN (SELECT public.my_vendor_ids()))
  WITH CHECK (vendor_id IN (SELECT public.my_vendor_ids()));

DROP POLICY IF EXISTS vsr_admin_manage ON public.vendor_shipping_rates;
CREATE POLICY vsr_admin_manage ON public.vendor_shipping_rates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS vsr_touch ON public.vendor_shipping_rates;
CREATE TRIGGER vsr_touch BEFORE UPDATE ON public.vendor_shipping_rates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Shipping cost for one vendor in one city, falling back to the vendor's
-- default row ('*') and then to the store-wide delivery settings.
CREATE OR REPLACE FUNCTION public.vendor_shipping_cost(
  _vendor_id uuid, _city text, _vendor_subtotal numeric
) RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; fee numeric; fover numeric;
BEGIN
  SELECT COALESCE(delivery_fee, 0), COALESCE(free_delivery_over, 0)
    INTO fee, fover FROM public.store_settings LIMIT 1;

  IF _vendor_id IS NOT NULL THEN
    SELECT * INTO r FROM public.vendor_shipping_rates
     WHERE vendor_id = _vendor_id AND is_active
       AND lower(btrim(city)) = lower(btrim(COALESCE(_city, '')))
     LIMIT 1;
    IF r.id IS NULL THEN
      SELECT * INTO r FROM public.vendor_shipping_rates
       WHERE vendor_id = _vendor_id AND is_active AND btrim(city) = '*'
       LIMIT 1;
    END IF;
    IF r.id IS NOT NULL THEN
      fee := COALESCE(r.fee, 0);
      fover := COALESCE(r.free_over, 0);
    END IF;
  END IF;

  IF fover > 0 AND COALESCE(_vendor_subtotal, 0) >= fover THEN
    RETURN 0;
  END IF;
  RETURN GREATEST(0, fee);
END; $$;

CREATE OR REPLACE FUNCTION public.recalc_order_money(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sub numeric := 0; disc numeric := 0; ship numeric := 0; after_disc numeric := 0;
  code text; c record; coin numeric := 0; gross numeric := 0;
  ocity text; free_over numeric := 0; v record; ratio numeric := 1;
BEGIN
  SELECT COALESCE(SUM(unit_price * quantity), 0) INTO sub
  FROM public.order_items WHERE order_id = _order_id;

  SELECT coupon_code, COALESCE(coins_discount, 0), city
    INTO code, coin, ocity
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

  after_disc := GREATEST(0, sub - disc);
  IF sub > 0 THEN ratio := after_disc / sub; END IF;

  FOR v IN
    SELECT vendor_id, COALESCE(SUM(unit_price * quantity), 0) AS vsub
      FROM public.order_items WHERE order_id = _order_id
     GROUP BY vendor_id
  LOOP
    ship := ship + public.vendor_shipping_cost(v.vendor_id, ocity, round(v.vsub * ratio));
  END LOOP;

  -- A store-wide free-delivery threshold still overrides everything.
  SELECT COALESCE(free_delivery_over, 0) INTO free_over FROM public.store_settings LIMIT 1;
  IF free_over > 0 AND after_disc >= free_over THEN ship := 0; END IF;

  gross := after_disc + round(ship);
  coin := LEAST(GREATEST(coin, 0), gross);

  UPDATE public.orders
     SET subtotal = sub,
         discount = disc + coin,
         total = GREATEST(0, gross - coin)
   WHERE id = _order_id;
END; $$;