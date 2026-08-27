ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'package',
  ADD COLUMN IF NOT EXISTS hue numeric NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS chroma numeric NOT NULL DEFAULT 0.16,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS touch_categories_updated_at ON public.categories;
CREATE TRIGGER touch_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.home_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  title_ar text NOT NULL DEFAULT '',
  title_ku text NOT NULL DEFAULT '',
  layout text NOT NULL DEFAULT 'grid',
  item_limit integer NOT NULL DEFAULT 8,
  hue numeric NOT NULL DEFAULT 250,
  chroma numeric NOT NULL DEFAULT 0.16,
  show_title boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.home_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_sections TO authenticated;
GRANT ALL ON public.home_sections TO service_role;
ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home sections public read" ON public.home_sections FOR SELECT USING (true);
CREATE POLICY "admins manage home sections" ON public.home_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_home_sections_updated_at BEFORE UPDATE ON public.home_sections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  primary_hue numeric NOT NULL DEFAULT 250,
  primary_chroma numeric NOT NULL DEFAULT 0.17,
  accent_hue numeric NOT NULL DEFAULT 75,
  accent_chroma numeric NOT NULL DEFAULT 0.16,
  radius_px integer NOT NULL DEFAULT 14,
  show_search boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store settings public read" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "admins manage store settings" ON public.store_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_store_settings_updated_at BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.store_settings (singleton) VALUES (true);

INSERT INTO public.home_sections (kind, title_ar, title_ku, layout, item_limit, hue, chroma, sort_order, is_active) VALUES
  ('categories', 'الأقسام', 'بەشەکان', 'chips', 12, 250, 0.16, 0, true),
  ('offers', 'عروض وخصومات', 'ئۆفەر و داشکاندن', 'grid', 4, 25, 0.18, 1, true),
  ('brands', 'عروض حسب الماركة', 'ئۆفەرەکان بەپێی براند', 'grid', 12, 250, 0.16, 2, true),
  ('featured', 'منتجات مميزة', 'بەرهەمی تایبەت', 'grid', 8, 200, 0.15, 3, false),
  ('newest', 'وصل حديثاً', 'نوێ گەیشتووە', 'grid', 8, 150, 0.14, 4, false);

UPDATE public.categories SET icon = 'sparkles' WHERE icon = 'package';