ALTER TABLE public.vendor_members
  ADD COLUMN IF NOT EXISTS commission_type text,
  ADD COLUMN IF NOT EXISTS commission_value numeric;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS commission_scope text;

DROP POLICY IF EXISTS "admins manage vendor members" ON public.vendor_members;
CREATE POLICY "admins manage vendor members" ON public.vendor_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

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

  SELECT vm.commission_type, vm.commission_value INTO c_type, c_value
  FROM public.vendor_members vm
  WHERE vm.vendor_id = v_id AND vm.commission_type IS NOT NULL
  ORDER BY vm.created_at
  LIMIT 1;

  IF c_type IS NULL THEN
    SELECT v.commission_type, v.commission_value INTO c_type, c_value
    FROM public.vendors v WHERE v.id = v_id;
  END IF;

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