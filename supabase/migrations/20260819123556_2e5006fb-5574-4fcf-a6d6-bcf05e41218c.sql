
CREATE TABLE public.flash_deals (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null default '',
  title_ku text not null default '',
  subtitle_ar text not null default '',
  subtitle_ku text not null default '',
  badge_ar text not null default '',
  badge_ku text not null default '',
  product_id uuid references public.products(id) on delete set null,
  image_url text,
  discount_type text not null default 'percent',
  discount_value numeric not null default 0,
  ends_at timestamptz,
  hue numeric not null default 264,
  chroma numeric not null default 0.18,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.flash_deals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flash_deals TO authenticated;
GRANT ALL ON public.flash_deals TO service_role;
ALTER TABLE public.flash_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flash deals public read" ON public.flash_deals FOR SELECT USING (true);
CREATE POLICY "admins manage flash deals" ON public.flash_deals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.bundles (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null default '',
  title_ku text not null default '',
  subtitle_ar text not null default '',
  subtitle_ku text not null default '',
  product_ids uuid[] not null default '{}',
  price numeric not null default 0,
  compare_price numeric,
  image_url text,
  hue numeric not null default 150,
  chroma numeric not null default 0.14,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.bundles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bundles TO authenticated;
GRANT ALL ON public.bundles TO service_role;
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bundles public read" ON public.bundles FOR SELECT USING (true);
CREATE POLICY "admins manage bundles" ON public.bundles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.product_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  min_qty int not null default 2,
  price numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, min_qty)
);
GRANT SELECT ON public.product_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_tiers TO authenticated;
GRANT ALL ON public.product_tiers TO service_role;
ALTER TABLE public.product_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product tiers public read" ON public.product_tiers FOR SELECT USING (true);
CREATE POLICY "admins manage product tiers" ON public.product_tiers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER flash_deals_updated_at BEFORE UPDATE ON public.flash_deals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER bundles_updated_at BEFORE UPDATE ON public.bundles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.home_sections (kind, title_ar, title_ku, layout, item_limit, hue, chroma, show_title, sort_order, is_active)
VALUES
  ('hero', 'صفقة اليوم', 'ماملەی ئەمڕۆ', 'grid', 3, 264, 0.18, false, -1, true),
  ('bundles', 'باقات موفرة', 'پاکێجی خەسڵەتدار', 'grid', 6, 150, 0.14, true, 2, true);

INSERT INTO public.flash_deals (title_ar, title_ku, subtitle_ar, subtitle_ku, badge_ar, badge_ku, product_id, image_url, discount_type, discount_value, ends_at, hue, chroma, sort_order)
SELECT 'خصم اليوم على ' || p.name_ar, 'داشکاندنی ئەمڕۆ لەسەر ' || p.name_ku,
       'كمية محدودة — اطلب الآن قبل انتهاء الوقت', 'ژمارەی سنووردار — ئێستا داوا بکە',
       'صفقة اليوم', 'ماملەی ئەمڕۆ', p.id, p.image_url, 'percent', 20, now() + interval '2 days', 264, 0.18, 0
FROM public.products p WHERE p.is_active = true ORDER BY p.created_at DESC LIMIT 1;

INSERT INTO public.product_tiers (product_id, min_qty, price)
SELECT p.id, v.q, round(p.price * v.f)
FROM (SELECT id, price FROM public.products WHERE is_active = true ORDER BY created_at DESC LIMIT 12) p,
     (VALUES (3, 0.93), (6, 0.87), (12, 0.8)) AS v(q, f);

INSERT INTO public.bundles (title_ar, title_ku, subtitle_ar, subtitle_ku, product_ids, price, compare_price, sort_order)
SELECT 'باقة العيادة الأساسية', 'پاکێجی بنەڕەتی کلینیک',
       'ثلاث منتجات أساسية بسعر واحد موفر', 'سێ بەرهەمی سەرەکی بە نرخێکی خەسڵەتدار',
       array_agg(p.id), round(sum(p.price) * 0.85), sum(p.price), 0
FROM (SELECT id, price FROM public.products WHERE is_active = true ORDER BY created_at DESC LIMIT 3) p;
