ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS brands text[] NOT NULL DEFAULT '{}';

UPDATE public.vendors SET brands = ARRAY[name] WHERE cardinality(brands) = 0;

ALTER TABLE public.vendor_members DROP COLUMN IF EXISTS commission_type;
ALTER TABLE public.vendor_members DROP COLUMN IF EXISTS commission_value;

ALTER TABLE public.bundles ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "vendors manage own bundles" ON public.bundles;
CREATE POLICY "vendors manage own bundles" ON public.bundles
  FOR ALL TO authenticated
  USING (vendor_id IN (SELECT public.my_vendor_ids()))
  WITH CHECK (vendor_id IN (SELECT public.my_vendor_ids()));

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
  already boolean;
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
    SELECT EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = NEW.order_id AND oi.vendor_id = v_id
    ) INTO already;
    NEW.commission_amount := CASE WHEN already THEN 0 ELSE COALESCE(c_value, 0) END;
  ELSIF c_type = 'fixed_per_item' THEN
    NEW.commission_amount := COALESCE(c_value, 0) * NEW.quantity;
  ELSE
    NEW.commission_amount := ROUND(NEW.unit_price * NEW.quantity * COALESCE(c_value, 0) / 100);
  END IF;

  RETURN NEW;
END; $function$;