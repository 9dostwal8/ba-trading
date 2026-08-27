ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS clearance_kind text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS stocked_since date,
  ADD COLUMN IF NOT EXISTS batch_no text;

DO $$ BEGIN
  ALTER TABLE public.products ADD CONSTRAINT products_clearance_kind_chk
    CHECK (clearance_kind IN ('none','near_expiry','outlet'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.bundles
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'lot',
  ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

CREATE TABLE IF NOT EXISTS public.clearance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  months_left integer NOT NULL,
  discount_percent numeric NOT NULL DEFAULT 0,
  label_ar text NOT NULL DEFAULT '',
  label_ku text NOT NULL DEFAULT '',
  hue numeric NOT NULL DEFAULT 25,
  chroma numeric NOT NULL DEFAULT 0.14,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.clearance_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clearance_rules TO authenticated;
GRANT ALL ON public.clearance_rules TO service_role;
ALTER TABLE public.clearance_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "clearance rules public read" ON public.clearance_rules FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "admins manage clearance rules" ON public.clearance_rules FOR ALL TO authenticated
    USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO public.clearance_rules (months_left, discount_percent, label_ar, label_ku, hue, sort_order)
SELECT * FROM (VALUES
  (12, 15, 'قريب الانتهاء', 'نزیک بەسەرچوون', 95, 1),
  (6, 30, 'أقل من 6 أشهر', 'کەمتر لە 6 مانگ', 55, 2),
  (3, 45, 'أقل من 3 أشهر', 'کەمتر لە 3 مانگ', 40, 3),
  (1, 60, 'الشهر الأخير', 'مانگی کۆتایی', 25, 4)
) v WHERE NOT EXISTS (SELECT 1 FROM public.clearance_rules);

INSERT INTO public.home_sections (kind, title_ar, title_ku, layout, item_limit, show_title, sort_order, is_active)
SELECT 'expiring', 'ينتهي قريباً — خصومات كبيرة', 'بەم زووانە کۆتایی دێت — داشکاندنی گەورە', 'rail', 8, true, -2, true
WHERE NOT EXISTS (SELECT 1 FROM public.home_sections WHERE kind = 'expiring');

INSERT INTO public.home_sections (kind, title_ar, title_ku, layout, item_limit, show_title, sort_order, is_active)
SELECT 'outlet', 'أوتلت — مخزون راكد بأسعار مخفضة', 'ئاوتلێت — کۆگای کۆن بە نرخی کەم', 'grid', 8, true, -1, true
WHERE NOT EXISTS (SELECT 1 FROM public.home_sections WHERE kind = 'outlet');