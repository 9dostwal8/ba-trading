-- 1. role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'brand_manager';

-- 2. vendors
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand_key text NOT NULL DEFAULT '',
  logo_domain text,
  logo_url text,
  commission_type text NOT NULL DEFAULT 'percent' CHECK (commission_type IN ('percent','fixed_per_item')),
  commission_value numeric NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.vendor_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_members TO authenticated;
GRANT ALL ON public.vendor_members TO service_role;
ALTER TABLE public.vendor_members ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER vendors_touch BEFORE UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. helper
CREATE OR REPLACE FUNCTION public.my_vendor_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT vendor_id FROM public.vendor_members WHERE user_id = auth.uid()
$$;

CREATE POLICY "admins manage vendors" ON public.vendors FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "vendors read own" ON public.vendors FOR SELECT TO authenticated
USING (id IN (SELECT public.my_vendor_ids()));

CREATE POLICY "admins manage vendor members" ON public.vendor_members FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "vendor members read own team" ON public.vendor_members FOR SELECT TO authenticated
USING (vendor_id IN (SELECT public.my_vendor_ids()));

-- 4. ownership columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;
ALTER TABLE public.flash_deals ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'new';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS commission_type text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS commission_value numeric;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS commission_amount numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS products_vendor_idx ON public.products(vendor_id);
CREATE INDEX IF NOT EXISTS order_items_vendor_idx ON public.order_items(vendor_id);

-- 5. commission snapshot on order lines
CREATE OR REPLACE FUNCTION public.snapshot_order_item_vendor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; c_type text; c_value numeric;
BEGIN
  SELECT p.vendor_id INTO v_id FROM public.products p WHERE p.id = NEW.product_id;
  IF v_id IS NULL THEN RETURN NEW; END IF;
  SELECT vendors.commission_type, vendors.commission_value INTO c_type, c_value
  FROM public.vendors WHERE id = v_id;
  NEW.vendor_id := v_id;
  NEW.commission_type := c_type;
  NEW.commission_value := c_value;
  NEW.commission_amount := CASE
    WHEN c_type = 'fixed_per_item' THEN COALESCE(c_value,0) * NEW.quantity
    ELSE ROUND(NEW.unit_price * NEW.quantity * COALESCE(c_value,0) / 100)
  END;
  RETURN NEW;
END; $$;

CREATE TRIGGER order_items_vendor_snapshot BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.snapshot_order_item_vendor();

-- 6. vendor-scoped policies
CREATE POLICY "vendors manage own products" ON public.products FOR ALL TO authenticated
USING (vendor_id IN (SELECT public.my_vendor_ids()))
WITH CHECK (vendor_id IN (SELECT public.my_vendor_ids()));

CREATE POLICY "vendors manage own offers" ON public.offers FOR ALL TO authenticated
USING (vendor_id IN (SELECT public.my_vendor_ids()))
WITH CHECK (vendor_id IN (SELECT public.my_vendor_ids()));

CREATE POLICY "vendors manage own flash deals" ON public.flash_deals FOR ALL TO authenticated
USING (vendor_id IN (SELECT public.my_vendor_ids()))
WITH CHECK (vendor_id IN (SELECT public.my_vendor_ids()));

CREATE POLICY "vendors manage own tiers" ON public.product_tiers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_tiers.product_id AND p.vendor_id IN (SELECT public.my_vendor_ids())))
WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_tiers.product_id AND p.vendor_id IN (SELECT public.my_vendor_ids())));

CREATE POLICY "vendors manage own offer products" ON public.offer_products FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_products.offer_id AND o.vendor_id IN (SELECT public.my_vendor_ids())))
WITH CHECK (EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_products.offer_id AND o.vendor_id IN (SELECT public.my_vendor_ids())));

CREATE POLICY "vendors read own order items" ON public.order_items FOR SELECT TO authenticated
USING (vendor_id IN (SELECT public.my_vendor_ids()));
CREATE POLICY "vendors update own order items" ON public.order_items FOR UPDATE TO authenticated
USING (vendor_id IN (SELECT public.my_vendor_ids()))
WITH CHECK (vendor_id IN (SELECT public.my_vendor_ids()));

CREATE POLICY "vendors read orders with their items" ON public.orders FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = orders.id AND i.vendor_id IN (SELECT public.my_vendor_ids())));

-- 7. admin needs to look up users to assign as brand managers
DROP POLICY IF EXISTS "admins read profiles" ON public.profiles;
CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));