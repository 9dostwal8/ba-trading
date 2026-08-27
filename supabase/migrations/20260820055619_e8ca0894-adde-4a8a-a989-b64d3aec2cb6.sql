ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS price_flash_deal numeric NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS price_offer numeric NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS price_bundle numeric NOT NULL DEFAULT 3500,
  ADD COLUMN IF NOT EXISTS price_badge numeric NOT NULL DEFAULT 500;

CREATE TABLE IF NOT EXISTS public.vendor_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  kind text NOT NULL,
  ref_id uuid,
  label text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_charges TO authenticated;
GRANT ALL ON public.vendor_charges TO service_role;

ALTER TABLE public.vendor_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendor_charges_admin_all" ON public.vendor_charges
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "vendor_charges_vendor_read" ON public.vendor_charges
  FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT public.my_vendor_ids()));

CREATE TRIGGER vendor_charges_touch BEFORE UPDATE ON public.vendor_charges
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS vendor_charges_vendor_idx ON public.vendor_charges (vendor_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.marketing_price(_kind text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    CASE _kind
      WHEN 'flash_deal' THEN s.price_flash_deal
      WHEN 'offer' THEN s.price_offer
      WHEN 'bundle' THEN s.price_bundle
      WHEN 'badge' THEN s.price_badge
      ELSE 0
    END, 0)
  FROM public.store_settings s
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.charge_marketing_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
  amt numeric;
  lbl text;
BEGIN
  IF NEW.vendor_id IS NULL THEN RETURN NEW; END IF;
  k := TG_ARGV[0];
  amt := public.marketing_price(k);
  IF amt <= 0 THEN RETURN NEW; END IF;
  lbl := COALESCE(NEW.title_ar, '');
  INSERT INTO public.vendor_charges (vendor_id, kind, ref_id, label, amount)
  VALUES (NEW.vendor_id, k, NEW.id, lbl, amt);
  RETURN NEW;
END; $$;

CREATE TRIGGER flash_deals_charge AFTER INSERT ON public.flash_deals
  FOR EACH ROW EXECUTE FUNCTION public.charge_marketing_item('flash_deal');

CREATE TRIGGER offers_charge AFTER INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.charge_marketing_item('offer');

CREATE TRIGGER bundles_charge AFTER INSERT ON public.bundles
  FOR EACH ROW EXECUTE FUNCTION public.charge_marketing_item('bundle');

CREATE OR REPLACE FUNCTION public.charge_product_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  amt numeric;
  b text;
  old_badges text[] := CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.badges, '{}') ELSE '{}' END;
BEGIN
  IF NEW.vendor_id IS NULL THEN RETURN NEW; END IF;
  amt := public.marketing_price('badge');
  IF amt <= 0 THEN RETURN NEW; END IF;
  FOREACH b IN ARRAY COALESCE(NEW.badges, '{}'::text[]) LOOP
    IF b <> 'discount' AND NOT (b = ANY (old_badges)) THEN
      INSERT INTO public.vendor_charges (vendor_id, kind, ref_id, label, amount)
      VALUES (NEW.vendor_id, 'badge', NEW.id, b, amt);
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

CREATE TRIGGER products_charge_badges AFTER INSERT OR UPDATE OF badges ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.charge_product_badges();