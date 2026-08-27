-- Vendor-level guards
ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_commission_type_chk,
  DROP CONSTRAINT IF EXISTS vendors_commission_value_chk;

ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_commission_type_chk
    CHECK (commission_type IN ('percent', 'fixed_per_item', 'fixed_per_order')),
  ADD CONSTRAINT vendors_commission_value_chk
    CHECK (
      commission_value >= 0
      AND (commission_type <> 'percent' OR commission_value <= 100)
    );

-- Order-line guards
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_commission_type_chk,
  DROP CONSTRAINT IF EXISTS order_items_commission_amount_chk;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_commission_type_chk
    CHECK (commission_type IS NULL OR commission_type IN ('percent', 'fixed_per_item', 'fixed_per_order')),
  ADD CONSTRAINT order_items_commission_amount_chk
    CHECK (commission_amount >= 0);

-- Snapshot trigger: explicit modes only, clamped amounts
CREATE OR REPLACE FUNCTION public.snapshot_order_item_vendor()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  c_type text;
  c_value numeric;
  line_total numeric;
  amt numeric;
BEGIN
  SELECT p.vendor_id INTO v_id FROM public.products p WHERE p.id = NEW.product_id;
  IF v_id IS NULL THEN
    NEW.vendor_id := NULL;
    NEW.commission_type := NULL;
    NEW.commission_value := NULL;
    NEW.commission_scope := NULL;
    NEW.commission_amount := 0;
    RETURN NEW;
  END IF;

  SELECT v.commission_type, v.commission_value INTO c_type, c_value
  FROM public.vendors v WHERE v.id = v_id;

  c_value := GREATEST(COALESCE(c_value, 0), 0);
  line_total := COALESCE(NEW.unit_price, 0) * GREATEST(COALESCE(NEW.quantity, 0), 0);

  IF c_type = 'percent' OR c_type IS NULL THEN
    c_type := 'percent';
    c_value := LEAST(c_value, 100);
    amt := ROUND(line_total * c_value / 100);
  ELSIF c_type = 'fixed_per_item' THEN
    amt := c_value * GREATEST(COALESCE(NEW.quantity, 0), 0);
  ELSIF c_type = 'fixed_per_order' THEN
    -- provisional; normalized to once per vendor per order by the statement trigger
    amt := c_value;
  ELSE
    RAISE EXCEPTION 'Unsupported vendor commission mode: %', c_type;
  END IF;

  NEW.vendor_id := v_id;
  NEW.commission_type := c_type;
  NEW.commission_value := c_value;
  NEW.commission_scope := c_type;
  NEW.commission_amount := GREATEST(COALESCE(amt, 0), 0);

  RETURN NEW;
END; $function$;
