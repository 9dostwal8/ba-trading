-- 1) Row trigger: stop relying on same-statement visibility for the per-order fee.
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
BEGIN
  SELECT p.vendor_id INTO v_id FROM public.products p WHERE p.id = NEW.product_id;
  IF v_id IS NULL THEN RETURN NEW; END IF;

  SELECT v.commission_type, v.commission_value INTO c_type, c_value
  FROM public.vendors v WHERE v.id = v_id;

  NEW.vendor_id := v_id;
  NEW.commission_type := c_type;
  NEW.commission_value := c_value;
  NEW.commission_scope := c_type;

  IF c_type = 'fixed_per_order' THEN
    -- provisional: normalized to once per vendor per order by the statement trigger below
    NEW.commission_amount := COALESCE(c_value, 0);
  ELSIF c_type = 'fixed_per_item' THEN
    NEW.commission_amount := COALESCE(c_value, 0) * NEW.quantity;
  ELSE
    NEW.commission_amount := ROUND(NEW.unit_price * NEW.quantity * COALESCE(c_value, 0) / 100);
  END IF;

  RETURN NEW;
END; $function$;

-- 2) Statement trigger: keep the fee on exactly one line per (order, vendor).
CREATE OR REPLACE FUNCTION public.normalize_per_order_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.order_items oi
     SET commission_amount = CASE
           WHEN oi.id = (
             SELECT o2.id FROM public.order_items o2
              WHERE o2.order_id = oi.order_id
                AND o2.vendor_id = oi.vendor_id
                AND o2.commission_type = 'fixed_per_order'
              ORDER BY o2.id
              LIMIT 1)
           THEN COALESCE(oi.commission_value, 0)
           ELSE 0 END
   WHERE oi.commission_type = 'fixed_per_order'
     AND oi.vendor_id IS NOT NULL
     AND (oi.order_id, oi.vendor_id) IN (
           SELECT n.order_id, n.vendor_id FROM newrows n
            WHERE n.commission_type = 'fixed_per_order' AND n.vendor_id IS NOT NULL);
  RETURN NULL;
END; $function$;

DROP TRIGGER IF EXISTS order_items_per_order_commission ON public.order_items;
CREATE TRIGGER order_items_per_order_commission
AFTER INSERT ON public.order_items
REFERENCING NEW TABLE AS newrows
FOR EACH STATEMENT EXECUTE FUNCTION public.normalize_per_order_commission();

-- 3) Backfill existing orders.
UPDATE public.order_items oi
   SET commission_amount = CASE
         WHEN oi.id = (
           SELECT o2.id FROM public.order_items o2
            WHERE o2.order_id = oi.order_id
              AND o2.vendor_id = oi.vendor_id
              AND o2.commission_type = 'fixed_per_order'
            ORDER BY o2.id
            LIMIT 1)
         THEN COALESCE(oi.commission_value, 0)
         ELSE 0 END
 WHERE oi.commission_type = 'fixed_per_order'
   AND oi.vendor_id IS NOT NULL;
