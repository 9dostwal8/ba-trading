-- BANNER PLACEMENTS (paid ad slots)
CREATE TABLE IF NOT EXISTS public.banner_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_ku text NOT NULL,
  desc_ar text,
  desc_ku text,
  price numeric NOT NULL DEFAULT 0,
  max_banners int NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banner_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banner_slots TO authenticated;
GRANT ALL ON public.banner_slots TO service_role;
ALTER TABLE public.banner_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banner_slots read" ON public.banner_slots FOR SELECT USING (true);
CREATE POLICY "banner_slots admin" ON public.banner_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.banner_slots (slot_key, name_ar, name_ku, desc_ar, desc_ku, price, sort_order) VALUES
  ('home_hero', 'أعلى الصفحة الرئيسية', 'سەرەوەی پەڕەی سەرەکی', 'أول ما يراه الزبون عند فتح التطبيق', 'یەکەم شت کە کڕیار دەبینێت', 15000, 1),
  ('home_below_hero', 'تحت الهيرو', 'ژێر هیرۆ', 'شريط عريض تحت قسم العروض السريعة', 'شریتی فراوان ژێر ئۆفەری خێرا', 10000, 2),
  ('home_mid', 'وسط الصفحة الرئيسية', 'ناوەڕاستی پەڕەی سەرەکی', 'بين أقسام المنتجات', 'لە نێوان بەشەکانی بەرهەم', 6000, 3),
  ('home_footer', 'أسفل الصفحة الرئيسية', 'خوارووی پەڕەی سەرەکی', 'آخر الصفحة الرئيسية', 'کۆتایی پەڕەی سەرەکی', 3000, 4),
  ('cart', 'صفحة السلة', 'پەڕەی سەبەتە', 'يظهر قبل إتمام الشراء', 'پێش تەواوکردنی کڕین دەردەکەوێت', 5000, 5),
  ('products_top', 'أعلى صفحة المنتجات', 'سەرەوەی پەڕەی بەرهەمەکان', 'أعلى قائمة المنتجات', 'سەرەوەی لیستی بەرهەمەکان', 7000, 6),
  ('offers_page', 'صفحة العروض', 'پەڕەی ئۆفەرەکان', 'أعلى صفحة العروض', 'سەرەوەی پەڕەی ئۆفەرەکان', 4000, 7),
  ('product_page', 'صفحة المنتج', 'پەڕەی بەرهەم', 'تحت تفاصيل المنتج', 'ژێر وردەکاری بەرهەم', 4000, 8),
  ('orders_page', 'صفحة الطلبات', 'پەڕەی داواکاریەکان', 'داخل صفحة طلبات الزبون', 'ناو پەڕەی داواکاری کڕیار', 2000, 9)
ON CONFLICT (slot_key) DO NOTHING;

-- BANNERS: rich creative + placement + vendor ownership
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS slot_key text NOT NULL DEFAULT 'home_hero',
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS subtitle_ar text,
  ADD COLUMN IF NOT EXISTS subtitle_ku text,
  ADD COLUMN IF NOT EXISTS cta_ar text,
  ADD COLUMN IF NOT EXISTS cta_ku text,
  ADD COLUMN IF NOT EXISTS bg_color text,
  ADD COLUMN IF NOT EXISTS text_color text,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

CREATE INDEX IF NOT EXISTS banners_slot_idx ON public.banners (slot_key, sort_order);
CREATE INDEX IF NOT EXISTS banners_vendor_idx ON public.banners (vendor_id);

DROP POLICY IF EXISTS "banners vendor read" ON public.banners;
CREATE POLICY "banners vendor read" ON public.banners FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT public.my_vendor_ids()));
DROP POLICY IF EXISTS "banners vendor insert" ON public.banners;
CREATE POLICY "banners vendor insert" ON public.banners FOR INSERT TO authenticated
  WITH CHECK (vendor_id IN (SELECT public.my_vendor_ids()));
DROP POLICY IF EXISTS "banners vendor update" ON public.banners;
CREATE POLICY "banners vendor update" ON public.banners FOR UPDATE TO authenticated
  USING (vendor_id IN (SELECT public.my_vendor_ids()))
  WITH CHECK (vendor_id IN (SELECT public.my_vendor_ids()));
DROP POLICY IF EXISTS "banners vendor delete" ON public.banners;
CREATE POLICY "banners vendor delete" ON public.banners FOR DELETE TO authenticated
  USING (vendor_id IN (SELECT public.my_vendor_ids()));

-- Bill vendors for banner placements using per-slot pricing
CREATE OR REPLACE FUNCTION public.charge_banner_slot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  amt numeric;
  slot_name text;
BEGIN
  IF NEW.vendor_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.slot_key = NEW.slot_key THEN RETURN NEW; END IF;
  SELECT price, name_ar INTO amt, slot_name FROM public.banner_slots WHERE slot_key = NEW.slot_key;
  IF COALESCE(amt, 0) <= 0 THEN RETURN NEW; END IF;
  INSERT INTO public.vendor_charges (vendor_id, kind, ref_id, label, amount)
  VALUES (NEW.vendor_id, 'banner', NEW.id,
          COALESCE(NULLIF(NEW.title_ar, ''), 'Banner') || ' — ' || COALESCE(slot_name, NEW.slot_key), amt);
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.charge_banner_slot() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.charge_banner_slot() FROM anon;
REVOKE ALL ON FUNCTION public.charge_banner_slot() FROM authenticated;

DROP TRIGGER IF EXISTS banners_charge ON public.banners;
CREATE TRIGGER banners_charge AFTER INSERT OR UPDATE OF slot_key ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.charge_banner_slot();