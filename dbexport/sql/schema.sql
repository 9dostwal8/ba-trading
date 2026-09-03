-- OfferDent consolidated schema (concatenated migrations, in order)
-- Run against a fresh Supabase/Postgres project that already has the auth & storage schemas.

-- ================================================================
-- 20260819092921_f21e7bb0-b9ae-4901-86c3-8ecb1e56bd31.sql
-- ================================================================
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- helper trigger fn
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  lang text NOT NULL DEFAULT 'ar',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.raw_user_meta_data->>'phone',''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ADDRESSES
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  city text NOT NULL,
  address_line text NOT NULL,
  notes text,
  latitude double precision,
  longitude double precision,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON public.addresses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins read addresses" ON public.addresses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_ku text NOT NULL,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name_ar text NOT NULL,
  name_ku text NOT NULL,
  description_ar text NOT NULL DEFAULT '',
  description_ku text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  sku text NOT NULL DEFAULT '',
  price numeric(12,2) NOT NULL DEFAULT 0,
  compare_price numeric(12,2),
  stock int NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT USING (true);
CREATE POLICY "admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- OFFERS
CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  title_ku text NOT NULL,
  subtitle_ar text NOT NULL DEFAULT '',
  subtitle_ku text NOT NULL DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  badge_ar text NOT NULL DEFAULT '',
  badge_ku text NOT NULL DEFAULT '',
  image_url text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.offers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers public read" ON public.offers FOR SELECT USING (true);
CREATE POLICY "admins manage offers" ON public.offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.offer_products (
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (offer_id, product_id)
);
GRANT SELECT ON public.offer_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_products TO authenticated;
GRANT ALL ON public.offer_products TO service_role;
ALTER TABLE public.offer_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offer products public read" ON public.offer_products FOR SELECT USING (true);
CREATE POLICY "admins manage offer products" ON public.offer_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- COUPONS
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  min_order numeric(12,2) NOT NULL DEFAULT 0,
  max_uses int,
  used_count int NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons public read active" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- BANNERS
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL DEFAULT '',
  title_ku text NOT NULL DEFAULT '',
  image_url text,
  link text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners public read" ON public.banners FOR SELECT USING (true);
CREATE POLICY "admins manage banners" ON public.banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_no bigserial,
  customer_name text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  address_line text NOT NULL,
  latitude double precision,
  longitude double precision,
  note text,
  coupon_code text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own orders insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage orders" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name_ar text NOT NULL,
  name_ku text NOT NULL,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  image_url text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own order items read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "own order items insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "admins manage order items" ON public.order_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- SEED
INSERT INTO public.categories (slug, name_ar, name_ku, sort_order) VALUES
 ('instruments','أدوات الأسنان','ئامێرەکانی ددان',1),
 ('materials','المواد الترميمية','ماددەی چاککردنەوە',2),
 ('orthodontics','تقويم الأسنان','ڕێکخستنی ددان',3),
 ('disposables','المستلزمات المستهلكة','پێداویستی بەکارهاتوو',4),
 ('equipment','الأجهزة والمعدات','ئامێر و کەلوپەل',5);

INSERT INTO public.products (category_id, name_ar, name_ku, description_ar, description_ku, brand, sku, price, compare_price, stock, is_featured)
SELECT c.id, p.na, p.nk, p.da, p.dk, p.br, p.sku, p.price, p.cmp, p.stock, p.feat
FROM (VALUES
 ('instruments','طقم أدوات فحص الأسنان','سێتی ئامێری پشکنینی ددان','طقم ستانلس ستيل 5 قطع','سێتی ستەینلێس ستیل ٥ پارچە','DentPro','DP-1001',45000,60000,40,true),
 ('instruments','ملقط جراحي مستقيم','مقاشی نەشتەرگەری ڕاست','ملقط عالي الدقة','مقاشی وردی بەرز','DentPro','DP-1002',18000,25000,60,false),
 ('materials','كومبوزيت ضوئي A2','کۆمپۆزیتی ڕووناکی A2','حشوة ضوئية عالية الجودة','پرکردنەوەی ڕووناکی کوالیتی بەرز','ShineFill','SF-2001',72000,95000,25,true),
 ('materials','أسمنت زجاجي','سیمانی شووشەیی','لاصق للحشوات الدائمة','لکێنەر بۆ پرکردنەوەی هەمیشەیی','ShineFill','SF-2002',54000,NULL,30,false),
 ('orthodontics','حاصرات تقويم معدنية','براکێتی مەتەلی ڕێکخستن','طقم كامل 20 حاصرة','سێتی تەواو ٢٠ براکێت',E'OrthoLine','OL-3001',120000,150000,15,true),
 ('orthodontics','أسلاك تقويم NiTi','وایەری NiTi','مرونة عالية','نەرمی بەرز','OrthoLine','OL-3002',22000,30000,80,false),
 ('disposables','قفازات نتريل (100)','دەستکێشی نایترایل (١٠٠)','خالية من البودرة','بێ پۆدرە','SafeHand','SH-4001',15000,20000,200,true),
 ('disposables','كمامات طبية (50)','ماسکی پزیشکی (٥٠)','ثلاث طبقات','سێ چین','SafeHand','SH-4002',8000,12000,300,false),
 ('equipment','جهاز تعقيم أوتوكلاف 18 لتر','ئامێری دەرمانکردن ئۆتۆکلاڤ ١٨ لیتر','تعقيم سريع وآمن','دەرمانکردنی خێرا و سەلامەت','MediTech','MT-5001',1450000,1800000,5,true),
 ('equipment','ضوء تصليب LED','ڕووناکی توندکردنی LED','بطارية طويلة الأمد','باتریی دوورخایەن','MediTech','MT-5002',185000,240000,12,false)
) AS p(cslug,na,nk,da,dk,br,sku,price,cmp,stock,feat)
JOIN public.categories c ON c.slug = p.cslug;

INSERT INTO public.offers (title_ar, title_ku, subtitle_ar, subtitle_ku, discount_type, discount_value, badge_ar, badge_ku, ends_at, sort_order) VALUES
 ('عروض نهاية الأسبوع','ئۆفەری کۆتایی هەفتە','خصم حتى 25% على أدوات الفحص','داشکاندن تا ٢٥% لەسەر ئامێری پشکنین','percent',25,'خصم 25%','٢٥% داشکاندن', now() + interval '7 days', 1),
 ('صفقة المستلزمات','بازاڕی پێداویستی','وفر على القفازات والكمامات','پاشەکەوت لەسەر دەستکێش و ماسک','percent',15,'خصم 15%','١٥% داشکاندن', now() + interval '14 days', 2);

INSERT INTO public.offer_products (offer_id, product_id)
SELECT o.id, p.id FROM public.offers o, public.products p
WHERE (o.sort_order = 1 AND p.sku IN ('DP-1001','DP-1002','MT-5002'))
   OR (o.sort_order = 2 AND p.sku IN ('SH-4001','SH-4002'));

INSERT INTO public.coupons (code, discount_type, discount_value, min_order, ends_at) VALUES
 ('DENTAL10','percent',10,50000, now() + interval '30 days'),
 ('WELCOME5000','fixed',5000,100000, now() + interval '30 days');
-- ================================================================
-- 20260819092931_2246d6e6-6323-4d33-b1e6-36d31fce02c2.sql
-- ================================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
-- ================================================================
-- 20260819093717_791426c6-e56b-4eb5-8b22-92c46da00451.sql
-- ================================================================
CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END; $$;

REVOKE EXECUTE ON FUNCTION public.claim_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;
-- ================================================================
-- 20260819112134_2d931ca5-cc1a-4eee-a589-7df30c53ece2.sql
-- ================================================================
CREATE TABLE IF NOT EXISTS public.brand_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mark TEXT NOT NULL DEFAULT '',
  match_key TEXT NOT NULL DEFAULT '',
  logo_domain TEXT,
  logo_url TEXT,
  hue NUMERIC NOT NULL DEFAULT 250,
  chroma NUMERIC NOT NULL DEFAULT 0.17,
  product_ids UUID[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.brand_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_cards TO authenticated;
GRANT ALL ON public.brand_cards TO service_role;

ALTER TABLE public.brand_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand cards public read" ON public.brand_cards;
CREATE POLICY "brand cards public read" ON public.brand_cards FOR SELECT USING (true);
DROP POLICY IF EXISTS "admins manage brand cards" ON public.brand_cards;
CREATE POLICY "admins manage brand cards" ON public.brand_cards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS brand_cards_touch ON public.brand_cards;
CREATE TRIGGER brand_cards_touch BEFORE UPDATE ON public.brand_cards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.brand_cards (name, mark, match_key, logo_domain, hue, chroma, sort_order) VALUES
  ('3M', '3M', '3m', '3m.com', 25, 0.21, 1),
  ('GC', 'GC', 'gc', 'gc.dental', 15, 0.20, 2),
  ('Tokuyama', 'TK', 'tokuyama', 'tokuyama-dental.com', 340, 0.17, 3),
  ('BISCO', 'BS', 'bisco', 'bisco.com', 250, 0.18, 4),
  ('Orodeka', 'OD', 'orodeka', 'orodeka.com', 195, 0.16, 5),
  ('Eighteeth', '8T', 'eighteeth', 'eighteeth.com', 275, 0.18, 6),
  ('Dentsply Sirona', 'DS', 'dentsply', 'dentsplysirona.com', 155, 0.14, 7),
  ('Ivoclar', 'IV', 'ivoclar', 'ivoclar.com', 40, 0.16, 8),
  ('Kerr', 'KR', 'kerr', 'kerrdental.com', 255, 0.19, 9),
  ('VOCO', 'VC', 'voco', 'voco.dental', 205, 0.15, 10),
  ('Coltene', 'CL', 'coltene', 'coltene.com', 140, 0.14, 11),
  ('NSK', 'NSK', 'nsk', 'nsk-dental.com', 265, 0.18, 12),
  ('Woodpecker', 'WP', 'woodpecker', 'woodpeckerdental.com', 50, 0.16, 13),
  ('Meta Biomed', 'MB', 'meta', 'meta-biomed.com', 230, 0.17, 14),
  ('Septodont', 'SP', 'septodont', 'septodont.com', 10, 0.19, 15),
  ('Vericom', 'VR', 'vericom', 'vericom.co.kr', 190, 0.15, 16);
-- ================================================================
-- 20260819113436_02079dfb-200e-4a91-bda9-6cad4a72cad1.sql
-- ================================================================
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
-- ================================================================
-- 20260819113950_37f11663-e4e3-432b-8a5c-93634c5c6b8a.sql
-- ================================================================
UPDATE public.categories SET icon = 'wrench', hue = 250, chroma = 0.16 WHERE slug ILIKE '%instrument%' OR slug ILIKE '%tool%' OR name_ar LIKE '%أدوات%';
UPDATE public.categories SET icon = 'gem', hue = 305, chroma = 0.15 WHERE slug ILIKE '%restor%' OR name_ar LIKE '%ترميم%';
UPDATE public.categories SET icon = 'brush', hue = 200, chroma = 0.14 WHERE slug ILIKE '%ortho%' OR name_ar LIKE '%تقويم%';
UPDATE public.categories SET icon = 'shield', hue = 155, chroma = 0.14 WHERE slug ILIKE '%consum%' OR name_ar LIKE '%مستلزمات%';
UPDATE public.categories SET icon = 'syringe', hue = 25, chroma = 0.16 WHERE slug ILIKE '%endo%' OR name_ar LIKE '%لبية%' OR name_ar LIKE '%جذور%';
UPDATE public.categories SET icon = 'droplets', hue = 220, chroma = 0.15 WHERE slug ILIKE '%hygien%' OR slug ILIKE '%steril%' OR name_ar LIKE '%تعقيم%';
UPDATE public.categories SET icon = 'microscope', hue = 275, chroma = 0.15 WHERE slug ILIKE '%equip%' OR name_ar LIKE '%أجهزة%';
UPDATE public.categories SET icon = 'smile', hue = 340, chroma = 0.15 WHERE slug ILIKE '%prosth%' OR name_ar LIKE '%تعويض%';
UPDATE public.categories SET icon = 'sparkles', hue = 95, chroma = 0.15 WHERE icon IS NULL OR icon = '' OR icon = 'sparkles';
-- ================================================================
-- 20260819123556_2e5006fb-5574-4fcf-a6d6-bcf05e41218c.sql
-- ================================================================

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

-- ================================================================
-- 20260819130802_22a5ce14-dd2a-47bf-aa5b-8b8452db871e.sql
-- ================================================================
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
-- ================================================================
-- 20260819130818_5dd02d6f-21be-4406-b4f7-4e3bff258cc4.sql
-- ================================================================
REVOKE ALL ON FUNCTION public.my_vendor_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_vendor_ids() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.snapshot_order_item_vendor() FROM PUBLIC, anon, authenticated;
-- ================================================================
-- 20260819132349_4e96ef43-a38b-4902-bda2-d29a48678da2.sql
-- ================================================================
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
-- ================================================================
-- 20260819135517_66d09bd6-5d41-4f35-8953-1b1bf5797b12.sql
-- ================================================================
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
-- ================================================================
-- 20260819140411_29273317-91c3-4916-af3d-651159766a53.sql
-- ================================================================
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

-- ================================================================
-- 20260819140427_582e9c9a-313f-4244-b884-0c770b1d92e6.sql
-- ================================================================
REVOKE ALL ON FUNCTION public.normalize_per_order_commission() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.snapshot_order_item_vendor() FROM PUBLIC, anon, authenticated;

-- ================================================================
-- 20260819140649_5d4515f7-9c2b-433c-8bc0-13eb03c42f7b.sql
-- ================================================================
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

-- ================================================================
-- 20260819142205_8b0766f2-f886-41f4-a1ab-1979423ac1cd.sql
-- ================================================================
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'products',
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS min_qty integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_discount numeric,
  ADD COLUMN IF NOT EXISTS buy_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS get_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.offers SET scope = 'products' WHERE scope NOT IN ('products','category','brand','all');

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_scope_check;
ALTER TABLE public.offers ADD CONSTRAINT offers_scope_check
  CHECK (scope IN ('products','category','brand','all'));

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_discount_type_check;
ALTER TABLE public.offers ADD CONSTRAINT offers_discount_type_check
  CHECK (discount_type IN ('percent','fixed','fixed_price','bxgy'));

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_values_check;
ALTER TABLE public.offers ADD CONSTRAINT offers_values_check
  CHECK (
    discount_value >= 0
    AND min_qty >= 1
    AND buy_qty >= 0
    AND get_qty >= 0
    AND (max_discount IS NULL OR max_discount >= 0)
    AND (discount_type <> 'percent' OR discount_value <= 100)
    AND (discount_type <> 'bxgy' OR (buy_qty >= 1 AND get_qty >= 1))
  );

DROP TRIGGER IF EXISTS offers_touch ON public.offers;
CREATE TRIGGER offers_touch BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
-- ================================================================
-- 20260819145637_46b007a4-420c-4bc5-816e-10a36d196388.sql
-- ================================================================
ALTER TABLE public.flash_deals
  ADD COLUMN IF NOT EXISTS starts_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS min_qty integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_discount numeric,
  ADD COLUMN IF NOT EXISTS max_qty_per_order integer,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

ALTER TABLE public.flash_deals DROP CONSTRAINT IF EXISTS flash_deals_discount_type_check;
ALTER TABLE public.flash_deals ADD CONSTRAINT flash_deals_discount_type_check
  CHECK (discount_type IN ('percent','fixed','fixed_price'));

ALTER TABLE public.flash_deals DROP CONSTRAINT IF EXISTS flash_deals_values_check;
ALTER TABLE public.flash_deals ADD CONSTRAINT flash_deals_values_check
  CHECK (
    discount_value >= 0
    AND (discount_type <> 'percent' OR discount_value <= 100)
    AND min_qty >= 1
    AND (max_discount IS NULL OR max_discount >= 0)
    AND (max_qty_per_order IS NULL OR max_qty_per_order >= 1)
  );
-- ================================================================
-- 20260819180529_38dfd239-2729-4c73-9095-52ab49e23612.sql
-- ================================================================
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS hue numeric NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS chroma numeric NOT NULL DEFAULT 0.14;
-- ================================================================
-- 20260819185748_49346c1e-4363-448b-b55c-f9f5f944d4c0.sql
-- ================================================================
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS site_name_ar text NOT NULL DEFAULT 'دنتال ستور',
  ADD COLUMN IF NOT EXISTS site_name_ku text NOT NULL DEFAULT 'دەنتاڵ ستۆر',
  ADD COLUMN IF NOT EXISTS tagline_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tagline_ku text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_title_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_title_ku text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_description_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS meta_description_ku text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS logo_emoji text NOT NULL DEFAULT '🦷',
  ADD COLUMN IF NOT EXISTS contact_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS address_ku text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS instagram_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telegram_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS default_lang text NOT NULL DEFAULT 'ar',
  ADD COLUMN IF NOT EXISTS currency_ar text NOT NULL DEFAULT 'د.ع',
  ADD COLUMN IF NOT EXISTS currency_ku text NOT NULL DEFAULT 'د.ع',
  ADD COLUMN IF NOT EXISTS min_order_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_delivery_over numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS announcement_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS announcement_ku text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS show_announcement boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS maintenance_note_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS maintenance_note_ku text NOT NULL DEFAULT '';
-- ================================================================
-- 20260820041719_9cbdcbc3-136b-4434-a502-31e0361e1a32.sql
-- ================================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS badges text[] NOT NULL DEFAULT '{}'::text[];
-- ================================================================
-- 20260820043101_a876f2ac-8d60-4f6b-a1e5-2dc585ef05ed.sql
-- ================================================================
CREATE TABLE public.usp_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  icon text NOT NULL DEFAULT 'badge-check',
  title_ar text NOT NULL DEFAULT '',
  title_ku text NOT NULL DEFAULT '',
  hue numeric NOT NULL DEFAULT 250,
  chroma numeric NOT NULL DEFAULT 0.16,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.usp_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usp_items TO authenticated;
GRANT ALL ON public.usp_items TO service_role;

ALTER TABLE public.usp_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active highlights" ON public.usp_items
  FOR SELECT USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage highlights" ON public.usp_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER usp_items_touch BEFORE UPDATE ON public.usp_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.usp_items (icon, title_ar, title_ku, hue, chroma, sort_order) VALUES
  ('badge-check', 'منتجات أصلية', 'بەرهەمی ڕەسەن', 250, 0.16, 1),
  ('truck', 'توصيل لكل العراق', 'گەیاندن بۆ هەموو عێراق', 160, 0.14, 2),
  ('wallet', 'أسعار الجملة', 'نرخی کۆ', 40, 0.16, 3),
  ('headphones', 'دعم واتساب', 'پشتگیری واتساب', 300, 0.15, 4);
-- ================================================================
-- 20260820044728_69921f23-fae4-464e-ad8f-3ce20d91cb9d.sql
-- ================================================================
create or replace function public.owns_order(_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.orders o where o.id = _order_id and o.user_id = auth.uid())
$$;

create or replace function public.order_has_my_vendor_items(_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.order_items i
    where i.order_id = _order_id and i.vendor_id in (select public.my_vendor_ids())
  )
$$;

drop policy if exists "vendors read orders with their items" on public.orders;
create policy "vendors read orders with their items" on public.orders
for select to authenticated using (public.order_has_my_vendor_items(id));

drop policy if exists "own order items read" on public.order_items;
create policy "own order items read" on public.order_items
for select to authenticated using (public.owns_order(order_id));

drop policy if exists "own order items insert" on public.order_items;
create policy "own order items insert" on public.order_items
for insert to authenticated with check (public.owns_order(order_id));
-- ================================================================
-- 20260820055619_e8ca0894-adde-4a8a-a989-b64d3aec2cb6.sql
-- ================================================================
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
-- ================================================================
-- 20260820055634_0d59ac63-51cf-4be8-9693-2571b2f620e0.sql
-- ================================================================
REVOKE ALL ON FUNCTION public.marketing_price(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.charge_marketing_item() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.charge_product_badges() FROM anon, authenticated;
-- ================================================================
-- 20260820102943_c1b1e335-43d9-4f63-82fb-a9580066ca99.sql
-- ================================================================
-- Trigger-only / internal SECURITY DEFINER functions must not be callable via the API
REVOKE EXECUTE ON FUNCTION public.charge_marketing_item() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.charge_product_badges() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.snapshot_order_item_vendor() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_per_order_commission() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.marketing_price(text) FROM anon, authenticated;

-- Helper functions used by RLS policies / app RPCs: signed-in only, never anonymous
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_vendor_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.owns_order(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.order_has_my_vendor_items(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_admin() FROM anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_vendor_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_has_my_vendor_items(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;
-- ================================================================
-- 20260820103011_c07a030e-7aad-4bf1-ab2e-cc0b65159ca9.sql
-- ================================================================
REVOKE EXECUTE ON FUNCTION public.charge_marketing_item() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.charge_product_badges() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.snapshot_order_item_vendor() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.normalize_per_order_commission() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.marketing_price(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_vendor_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.owns_order(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.order_has_my_vendor_items(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_vendor_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_has_my_vendor_items(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;
-- ================================================================
-- 20260820143721_81e2d3bb-f66f-41bd-a052-e8a1f1be171e.sql
-- ================================================================
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
-- ================================================================
-- 20260820150929_2b55e18d-c75d-4cbd-b02e-8add5f11e0bf.sql
-- ================================================================
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS tagline_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tagline_ku text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS about_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS about_ku text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hue numeric NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS chroma numeric NOT NULL DEFAULT 0.12;

CREATE OR REPLACE FUNCTION public.vendor_slugify(_name text, _id uuid)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(nullif(regexp_replace(lower(trim(_name)), '[^a-z0-9]+', '-', 'g'), '-'), '') || '-' || left(replace(_id::text, '-', ''), 6)
$$;

UPDATE public.vendors SET slug = public.vendor_slugify(name, id) WHERE slug IS NULL OR slug = '';
UPDATE public.vendors SET code = 'V' || upper(left(replace(id::text, '-', ''), 8)) WHERE code IS NULL OR code = '';

ALTER TABLE public.vendors ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.vendors ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS vendors_slug_key ON public.vendors (slug);
CREATE UNIQUE INDEX IF NOT EXISTS vendors_code_key ON public.vendors (code);

CREATE OR REPLACE FUNCTION public.vendors_fill_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.vendor_slugify(NEW.name, NEW.id);
  END IF;
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'V' || upper(left(replace(NEW.id::text, '-', ''), 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_fill_identity_trg ON public.vendors;
CREATE TRIGGER vendors_fill_identity_trg BEFORE INSERT OR UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.vendors_fill_identity();

DROP POLICY IF EXISTS "vendors public read active" ON public.vendors;
CREATE POLICY "vendors public read active" ON public.vendors
FOR SELECT TO anon, authenticated USING (is_active = true);

GRANT SELECT ON public.vendors TO anon;
GRANT SELECT ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
REVOKE EXECUTE ON FUNCTION public.vendor_slugify(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.vendors_fill_identity() FROM PUBLIC, anon;
-- ================================================================
-- 20260820150959_bd460846-0634-4aa3-9ad8-37e50c301dda.sql
-- ================================================================
ALTER TABLE public.vendors ALTER COLUMN slug SET DEFAULT '';
ALTER TABLE public.vendors ALTER COLUMN code SET DEFAULT '';
-- ================================================================
-- 20260820153717_5c04eded-447d-4d07-a844-f23ad5fdae08.sql
-- ================================================================
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.vendor_order_counts()
RETURNS TABLE(vendor_id uuid, orders bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oi.vendor_id, count(DISTINCT oi.order_id) AS orders
  FROM public.order_items oi
  WHERE oi.vendor_id IS NOT NULL
  GROUP BY oi.vendor_id
$$;

GRANT EXECUTE ON FUNCTION public.vendor_order_counts() TO anon, authenticated, service_role;
-- ================================================================
-- 20260820173101_c932e252-3e0c-4651-becc-79a8431abe6c.sql
-- ================================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('paid','unpaid'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.vendor_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  period text NOT NULL,
  commission_total numeric NOT NULL DEFAULT 0,
  marketing_total numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid','unpaid')),
  note text NOT NULL DEFAULT '',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, period)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_settlements TO authenticated;
GRANT ALL ON public.vendor_settlements TO service_role;
ALTER TABLE public.vendor_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendor_settlements_admin_all ON public.vendor_settlements;
CREATE POLICY vendor_settlements_admin_all ON public.vendor_settlements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS vendor_settlements_vendor_read ON public.vendor_settlements;
CREATE POLICY vendor_settlements_vendor_read ON public.vendor_settlements FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT my_vendor_ids()));

DROP TRIGGER IF EXISTS touch_vendor_settlements ON public.vendor_settlements;
CREATE TRIGGER touch_vendor_settlements BEFORE UPDATE ON public.vendor_settlements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
-- ================================================================
-- 20260820174033_db604479-5a46-45c2-9f22-d5f9b295ad4b.sql
-- ================================================================
CREATE POLICY "banner_images_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'banners');
CREATE POLICY "banner_images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banners');
CREATE POLICY "banner_images_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'banners') WITH CHECK (bucket_id = 'banners');
CREATE POLICY "banner_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banners');
-- ================================================================
-- 20260820175039_c654af96-12bb-4dc8-9972-1f98375b7aac.sql
-- ================================================================
CREATE OR REPLACE FUNCTION public.mark_order_paid_on_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.fulfillment_status IN ('confirmed', 'shipped', 'done')
     AND (TG_OP = 'INSERT' OR OLD.fulfillment_status IS DISTINCT FROM NEW.fulfillment_status) THEN
    UPDATE public.orders o
       SET payment_status = 'paid',
           paid_at = COALESCE(o.paid_at, now())
     WHERE o.id = NEW.order_id
       AND o.payment_status <> 'paid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_mark_paid ON public.order_items;
CREATE TRIGGER order_items_mark_paid
AFTER INSERT OR UPDATE OF fulfillment_status ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.mark_order_paid_on_confirm();

UPDATE public.orders o
   SET payment_status = 'paid', paid_at = COALESCE(o.paid_at, now())
 WHERE o.payment_status <> 'paid'
   AND EXISTS (
     SELECT 1 FROM public.order_items i
      WHERE i.order_id = o.id
        AND i.fulfillment_status IN ('confirmed', 'shipped', 'done')
   );
-- ================================================================
-- 20260820175053_7ba1600d-c56e-4413-a915-d09b23d2f327.sql
-- ================================================================
REVOKE EXECUTE ON FUNCTION public.mark_order_paid_on_confirm() FROM anon, authenticated, PUBLIC;
-- ================================================================
-- 20260820180234_3771724b-b687-4d89-b226-0d75c475d1f1.sql
-- ================================================================
CREATE TABLE public.ui_texts (
  key text PRIMARY KEY,
  section text NOT NULL DEFAULT 'other',
  ar text NOT NULL DEFAULT '',
  ku text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ui_texts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ui_texts TO authenticated;
GRANT ALL ON public.ui_texts TO service_role;

ALTER TABLE public.ui_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ui_texts_public_read" ON public.ui_texts FOR SELECT USING (true);
CREATE POLICY "ui_texts_admin_write" ON public.ui_texts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ui_texts_touch BEFORE UPDATE ON public.ui_texts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
-- ================================================================
-- 20260820181932_ee174574-ae40-4810-95c4-2ee3d5c30afb.sql
-- ================================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS qi_payment_id text,
  ADD COLUMN IF NOT EXISTS qi_request_id text,
  ADD COLUMN IF NOT EXISTS qi_status text,
  ADD COLUMN IF NOT EXISTS qi_form_url text;

CREATE INDEX IF NOT EXISTS orders_qi_payment_id_idx ON public.orders (qi_payment_id);
-- ================================================================
-- 20260821094605_4a20ada3-fb0a-4cd1-bfb3-81ee4a951604.sql
-- ================================================================
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
-- ================================================================
-- 20260821095803_247e5475-dec8-43a1-a260-39d42a311a2b.sql
-- ================================================================
GRANT SELECT ON public.clearance_rules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clearance_rules TO authenticated;
GRANT ALL ON public.clearance_rules TO service_role;
-- ================================================================
-- 20260821095838_14ac7b69-a367-40a1-bef3-b2e2e9579397.sql
-- ================================================================
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY vendor_id ORDER BY created_at) AS rn
  FROM public.products WHERE is_active = true
)
UPDATE public.products p SET
  clearance_kind = 'near_expiry',
  expiry_date = (now() + ((CASE r.rn % 4 WHEN 0 THEN 1 WHEN 1 THEN 3 WHEN 2 THEN 6 ELSE 11 END) * INTERVAL '1 month'))::date,
  batch_no = 'B' || lpad((1000 + r.rn)::text, 4, '0'),
  compare_price = COALESCE(p.compare_price, round(p.price * 1.25))
FROM ranked r WHERE r.id = p.id AND r.rn <= 4;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY vendor_id ORDER BY created_at) AS rn
  FROM public.products WHERE is_active = true
)
UPDATE public.products p SET
  clearance_kind = 'outlet',
  stocked_since = (now() - INTERVAL '14 months')::date,
  compare_price = COALESCE(p.compare_price, round(p.price * 1.35)),
  price = round(p.price * 0.8)
FROM ranked r WHERE r.id = p.id AND r.rn BETWEEN 5 AND 7;
-- ================================================================
-- 20260821165210_d18cd2a6-88a7-44c4-9b01-80a6621fb31d.sql
-- ================================================================
UPDATE public.store_settings SET primary_hue = 17, primary_chroma = 0.183, accent_hue = 92, accent_chroma = 0.16, radius_px = 8;
-- ================================================================
-- 20260821171414_dbfb5388-1fc5-40dc-9ca1-49ef963c4aff.sql
-- ================================================================
-- 1) Banner files: only the uploader (or an admin) can change/remove them
DROP POLICY IF EXISTS banner_images_insert ON storage.objects;
DROP POLICY IF EXISTS banner_images_update ON storage.objects;
DROP POLICY IF EXISTS banner_images_delete ON storage.objects;

CREATE POLICY banner_images_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'banners' AND owner = auth.uid());

CREATE POLICY banner_images_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'banners' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (bucket_id = 'banners' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY banner_images_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'banners' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

-- 2) Coupons: no longer readable/scrapeable; validated through a function
DROP POLICY IF EXISTS "coupons public read active" ON public.coupons;
REVOKE SELECT ON public.coupons FROM anon;

CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _subtotal numeric)
RETURNS TABLE (code text, discount_type text, discount_value numeric, min_order numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.code, c.discount_type, c.discount_value, c.min_order
  FROM public.coupons c
  WHERE c.code = upper(btrim(_code))
    AND c.is_active = true
    AND (c.ends_at IS NULL OR c.ends_at > now())
    AND (c.max_uses IS NULL OR c.used_count < c.max_uses)
    AND _subtotal >= c.min_order
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO authenticated;
-- ================================================================
-- 20260821171941_f7c57e6f-f671-4417-8b10-db6174e69e2d.sql
-- ================================================================
-- products bucket: vendors upload only inside their own vendor folder; admins anywhere
CREATE POLICY "product_images_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'products'
  AND owner = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (storage.foldername(name))[1] IN (SELECT public.my_vendor_ids()::text)
  )
);

CREATE POLICY "product_images_read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'products');

CREATE POLICY "product_images_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'products' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')))
WITH CHECK (bucket_id = 'products' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "product_images_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'products' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));

-- banners bucket: restrict uploads to vendors and admins
DROP POLICY IF EXISTS "banner_images_insert" ON storage.objects;
CREATE POLICY "banner_images_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'banners'
  AND owner = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.vendor_members m WHERE m.user_id = auth.uid())
  )
);
-- ================================================================
-- 20260821172853_78eb227e-1b36-4b0b-8a29-a7bebd5e9fae.sql
-- ================================================================
update public.categories set image_url = '/__l5e/assets-v1/8996515f-6a7b-4146-ab4e-fa77d4e4b97d/cat-instruments.png' where slug='instruments';
update public.categories set image_url = '/__l5e/assets-v1/b200476f-7aac-4219-adc8-6dc5efec08cc/cat-materials.png' where slug='materials';
update public.categories set image_url = '/__l5e/assets-v1/175c46a8-caf4-4174-bdea-f1b271ff6101/cat-orthodontics.png' where slug='orthodontics';
update public.categories set image_url = '/__l5e/assets-v1/67d4ce14-c048-4842-8763-3f53a5b9e0d1/cat-disposables.png' where slug='disposables';
update public.categories set image_url = '/__l5e/assets-v1/e3d3c83f-d176-4a59-8432-ef943dc7d758/cat-equipment.png' where slug='equipment';

insert into public.categories (slug, name_ar, name_ku, icon, hue, chroma, sort_order, image_url, is_active) values
('restorative','الحشوات والترميم','پڕکردنەوە و چاککردنەوە','gem',350,0.14,6,'/__l5e/assets-v1/861908ae-efef-4b67-b19a-b2610ff0ce80/cat-restorative.png',true),
('endodontics','علاج العصب (اللبية)','چارەسەری ڕەگ','brush',45,0.15,7,'/__l5e/assets-v1/1b26b895-4dc1-4224-a0a1-f11bdaa90671/cat-endodontics.png',true),
('anesthesia','التخدير','بێهۆشکردن','shield',10,0.14,8,'/__l5e/assets-v1/d47006e6-1f9a-49db-9f74-d20fe2a971fb/cat-anesthesia.png',true),
('surgery','جراحة الفم','نەشتەرگەری دەم','wrench',25,0.16,9,'/__l5e/assets-v1/66a43dfa-9a54-4f7e-aba0-40d3ac110366/cat-surgery.png',true),
('implants','الزرعات','ئیمپلانت','microscope',220,0.13,10,'/__l5e/assets-v1/83a1fe1b-d31c-40bd-afc5-edd47a1717ce/cat-implants.png',true),
('prosthetics','التركيبات والأطقم','پرۆتێز و تاج','gem',60,0.14,11,'/__l5e/assets-v1/67510181-2628-4620-830c-4feed620e156/cat-prosthetics.png',true),
('prevention','الوقاية والعناية','پاراستن و چاودێری','shield',145,0.14,12,'/__l5e/assets-v1/4851d545-b5ac-49a7-9853-ade40eefa309/cat-prevention.png',true),
('imaging','الأشعة والتصوير','تیشک و وێنەگرتن','microscope',235,0.15,13,'/__l5e/assets-v1/4e0375c2-9204-4cac-a6f5-5507e5bd0fef/cat-imaging.png',true),
('sterilization','التعقيم','ستەریلایزکردن','shield',185,0.13,14,'/__l5e/assets-v1/d86d911a-4500-4105-a537-7db3e0baf271/cat-sterilization.png',true),
('handpieces','التوربينات والفريزات','تۆربین و فرێز','wrench',195,0.15,15,'/__l5e/assets-v1/2d696dab-f563-4056-8da6-d190c690edf8/cat-handpieces.png',true)
on conflict (slug) do update set image_url = excluded.image_url, name_ar = excluded.name_ar, name_ku = excluded.name_ku, hue = excluded.hue, chroma = excluded.chroma, sort_order = excluded.sort_order;
-- ================================================================
-- 20260821174321_72228cdc-ab43-42fd-92f3-f68af771827b.sql
-- ================================================================
update public.categories set image_url = m.url, icon = m.icon from (values
 ('instruments','/__l5e/assets-v1/fd0ea017-9d9c-4f1d-850b-5aa23ec73c17/cat2-instruments.png','wrench'),
 ('materials','/__l5e/assets-v1/923b3dc8-3dbd-4a12-86de-19be8326cad7/cat2-materials.png','flask'),
 ('orthodontics','/__l5e/assets-v1/66df0fba-4e41-4c4d-8885-98c8adc3e3f8/cat2-orthodontics.png','layers'),
 ('disposables','/__l5e/assets-v1/2c5abb20-0a60-4860-a491-03190dda10ed/cat2-disposables.png','package'),
 ('equipment','/__l5e/assets-v1/bc098a58-0bb7-405a-b26c-33ea5d880c0b/cat2-equipment.png','stethoscope'),
 ('restorative','/__l5e/assets-v1/c81d2093-3f61-4fad-b7e9-ec773043cb5b/cat2-restorative.png','smile'),
 ('endodontics','/__l5e/assets-v1/79df4b17-37df-4fb0-b2b0-db0e488279f5/cat2-endodontics.png','activity'),
 ('anesthesia','/__l5e/assets-v1/90f7e152-caba-40df-a1fa-31b1461141f2/cat2-anesthesia.png','syringe'),
 ('surgery','/__l5e/assets-v1/b946f507-22f3-4e39-8759-8befea90407e/cat2-surgery.png','scissors'),
 ('implants','/__l5e/assets-v1/13bf204c-d7c2-4943-b877-d6218cb44c46/cat2-implants.png','bolt'),
 ('prosthetics','/__l5e/assets-v1/6266e08d-e6ab-4770-b48c-ea1f69ac77f5/cat2-prosthetics.png','gem'),
 ('prevention','/__l5e/assets-v1/177dfd9d-0cbd-4dca-affc-5ec576938a3a/cat2-prevention.png','shield'),
 ('imaging','/__l5e/assets-v1/2a7e28a9-5318-46a9-ab07-5854a04f0d70/cat2-imaging.png','eye'),
 ('sterilization','/__l5e/assets-v1/a7e0a929-5ba4-44d8-98b2-b2e496f343a7/cat2-sterilization.png','thermometer'),
 ('handpieces','/__l5e/assets-v1/703d6a7f-a4c5-4cdc-ab3a-efcb54de0b17/cat2-handpieces.png','zap')
) as m(slug,url,icon) where categories.slug = m.slug;
-- ================================================================
-- 20260821184154_a53764d8-43dd-4014-95d9-736a7eb79929.sql
-- ================================================================
insert into public.bundles (title_ar, title_ku, subtitle_ar, subtitle_ku, kind, price, compare_price, stock, is_active, sort_order, product_ids, hue, chroma)
select 'كِت اختبار ١٠ منتجات', 'کیتی تاقیکردنەوە ١٠ بەرهەم', 'حزمة تجريبية تحتوي ١٠ منتجات', 'پاکێجی تاقیکردنەوە بە ١٠ بەرهەم',
 'bundle', 249000, 390000, 20, true, 0,
 array(select id from public.products where is_active = true order by created_at limit 10),
 15, 0.16
where (select count(*) from public.products where is_active = true) >= 10;
-- ================================================================
-- 20260821194415_21bc1198-5e19-481e-a7ab-f336dfaeb495.sql
-- ================================================================
DROP POLICY IF EXISTS "banners vendor insert" ON public.banners;
DROP POLICY IF EXISTS "banners vendor update" ON public.banners;
DROP POLICY IF EXISTS "banners vendor delete" ON public.banners;
-- ================================================================
-- 20260821202043_4e3c1f0a-1883-4113-b63d-6dc3da2046c2.sql
-- ================================================================
CREATE TABLE public.marketing_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind text NOT NULL UNIQUE,
  price numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  vendor_allowed boolean NOT NULL DEFAULT true,
  note_ar text NOT NULL DEFAULT '',
  note_ku text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketing_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_plans TO authenticated;
GRANT ALL ON public.marketing_plans TO service_role;

ALTER TABLE public.marketing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_plans_read" ON public.marketing_plans
  FOR SELECT USING (true);

CREATE POLICY "marketing_plans_admin_write" ON public.marketing_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER marketing_plans_touch BEFORE UPDATE ON public.marketing_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.marketing_plans (kind, price, duration_days, sort_order, note_ar, note_ku)
SELECT 'flash_deal', COALESCE(s.price_flash_deal, 0), 30, 1, '', '' FROM public.store_settings s LIMIT 1;
INSERT INTO public.marketing_plans (kind, price, duration_days, sort_order, note_ar, note_ku)
SELECT 'offer', COALESCE(s.price_offer, 0), 30, 2, '', '' FROM public.store_settings s LIMIT 1;
INSERT INTO public.marketing_plans (kind, price, duration_days, sort_order, note_ar, note_ku)
SELECT 'bundle', COALESCE(s.price_bundle, 0), 30, 3, '', '' FROM public.store_settings s LIMIT 1;
INSERT INTO public.marketing_plans (kind, price, duration_days, sort_order, note_ar, note_ku)
SELECT 'badge', COALESCE(s.price_badge, 0), 30, 4, '', '' FROM public.store_settings s LIMIT 1;
INSERT INTO public.marketing_plans (kind, price, duration_days, sort_order, note_ar, note_ku)
VALUES ('near_expiry', 0, 30, 5, '', ''), ('outlet', 0, 30, 6, '', '');

CREATE OR REPLACE FUNCTION public.marketing_price(_kind text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.price FROM public.marketing_plans p WHERE p.kind = _kind),
    (SELECT CASE _kind
      WHEN 'flash_deal' THEN s.price_flash_deal
      WHEN 'offer' THEN s.price_offer
      WHEN 'bundle' THEN s.price_bundle
      WHEN 'badge' THEN s.price_badge
      ELSE 0
    END FROM public.store_settings s LIMIT 1),
    0)
$$;

REVOKE EXECUTE ON FUNCTION public.marketing_price(text) FROM PUBLIC, anon, authenticated;
-- ================================================================
-- 20260821202917_d1553aad-0907-4a8b-afb6-f6ca303d6f69.sql
-- ================================================================
CREATE OR REPLACE FUNCTION public.charge_product_clearance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
  amt numeric;
  dur integer;
  exists_recent boolean;
BEGIN
  IF NEW.vendor_id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.clearance_kind, 'none') NOT IN ('near_expiry', 'outlet') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.clearance_kind, 'none') = COALESCE(NEW.clearance_kind, 'none') THEN
    RETURN NEW;
  END IF;

  k := NEW.clearance_kind;
  amt := public.marketing_price(k);
  IF amt <= 0 THEN RETURN NEW; END IF;

  SELECT COALESCE((SELECT p.duration_days FROM public.marketing_plans p WHERE p.kind = k), 30)
  INTO dur;
  IF dur IS NULL OR dur <= 0 THEN dur := 30; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.vendor_charges c
    WHERE c.vendor_id = NEW.vendor_id
      AND c.kind = k
      AND c.ref_id = NEW.id
      AND c.created_at > now() - (dur || ' days')::interval
  ) INTO exists_recent;
  IF exists_recent THEN RETURN NEW; END IF;

  INSERT INTO public.vendor_charges (vendor_id, kind, ref_id, label, amount)
  VALUES (NEW.vendor_id, k, NEW.id, COALESCE(NEW.name_ar, NEW.sku, ''), amt);

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS products_charge_clearance ON public.products;
CREATE TRIGGER products_charge_clearance
AFTER INSERT OR UPDATE OF clearance_kind ON public.products
FOR EACH ROW EXECUTE FUNCTION public.charge_product_clearance();
-- ================================================================
-- 20260821202932_66d3d24b-e95f-4549-80c7-eec9ead90654.sql
-- ================================================================
REVOKE EXECUTE ON FUNCTION public.charge_product_clearance() FROM PUBLIC, anon, authenticated;
-- ================================================================
-- 20260822030653_640a53d1-2178-42a5-b13b-4e06c02eac3c.sql
-- ================================================================
-- 1. settings toggles
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS wallet_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wallet_max_balance numeric NOT NULL DEFAULT 5000000,
  ADD COLUMN IF NOT EXISTS wallet_note_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS wallet_note_ku text NOT NULL DEFAULT '';

-- 2. wallets
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  is_frozen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets_select_own" ON public.wallets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "wallets_admin_all" ON public.wallets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER wallets_touch BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. transactions
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'admin_credit',
  amount numeric NOT NULL,
  balance_after numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  ref_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wallet_tx_user_idx ON public.wallet_transactions (user_id, created_at DESC);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_tx_select_own" ON public.wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 4. cards / codes
CREATE TABLE public.wallet_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  amount numeric NOT NULL CHECK (amount > 0),
  batch text NOT NULL DEFAULT '',
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_cards TO authenticated;
GRANT ALL ON public.wallet_cards TO service_role;
ALTER TABLE public.wallet_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_cards_admin_all" ON public.wallet_cards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER wallet_cards_touch BEFORE UPDATE ON public.wallet_cards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.wallet_card_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.wallet_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (card_id, user_id)
);
GRANT SELECT ON public.wallet_card_redemptions TO authenticated;
GRANT ALL ON public.wallet_card_redemptions TO service_role;
ALTER TABLE public.wallet_card_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_redemptions_select_own" ON public.wallet_card_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 5. helpers
CREATE OR REPLACE FUNCTION public.wallet_ensure(_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  SELECT id INTO _id FROM public.wallets WHERE user_id = _user_id;
  IF _id IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (_user_id) RETURNING id INTO _id;
  END IF;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.wallet_my_balance()
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  PERFORM public.wallet_ensure(auth.uid());
  SELECT balance INTO _b FROM public.wallets WHERE user_id = auth.uid();
  RETURN COALESCE(_b, 0);
END; $$;

-- admin add / remove balance
CREATE OR REPLACE FUNCTION public.wallet_admin_adjust(_user_id uuid, _amount numeric, _note text DEFAULT '')
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid; _bal numeric; _max numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _amount = 0 THEN RAISE EXCEPTION 'amount required'; END IF;
  _wid := public.wallet_ensure(_user_id);
  SELECT wallet_max_balance INTO _max FROM public.store_settings LIMIT 1;
  UPDATE public.wallets SET balance = balance + _amount WHERE id = _wid RETURNING balance INTO _bal;
  IF _bal < 0 THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  IF _max IS NOT NULL AND _bal > _max THEN RAISE EXCEPTION 'over max balance'; END IF;
  INSERT INTO public.wallet_transactions (wallet_id, user_id, kind, amount, balance_after, note, created_by)
  VALUES (_wid, _user_id, CASE WHEN _amount > 0 THEN 'admin_credit' ELSE 'admin_debit' END,
          _amount, _bal, COALESCE(_note, ''), auth.uid());
  RETURN _bal;
END; $$;

-- customer redeems a card code
CREATE OR REPLACE FUNCTION public.wallet_redeem_card(_code text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _card public.wallet_cards; _wid uuid; _bal numeric; _on boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT wallet_enabled INTO _on FROM public.store_settings LIMIT 1;
  IF NOT COALESCE(_on, false) THEN RAISE EXCEPTION 'wallet disabled'; END IF;
  SELECT * INTO _card FROM public.wallet_cards
    WHERE code = upper(btrim(_code)) FOR UPDATE;
  IF _card.id IS NULL THEN RAISE EXCEPTION 'invalid code'; END IF;
  IF NOT _card.is_active THEN RAISE EXCEPTION 'code inactive'; END IF;
  IF _card.expires_at IS NOT NULL AND _card.expires_at < now() THEN RAISE EXCEPTION 'code expired'; END IF;
  IF _card.used_count >= _card.max_uses THEN RAISE EXCEPTION 'code used'; END IF;
  IF EXISTS (SELECT 1 FROM public.wallet_card_redemptions WHERE card_id = _card.id AND user_id = auth.uid())
    THEN RAISE EXCEPTION 'already redeemed'; END IF;

  _wid := public.wallet_ensure(auth.uid());
  IF (SELECT is_frozen FROM public.wallets WHERE id = _wid) THEN RAISE EXCEPTION 'wallet frozen'; END IF;

  UPDATE public.wallet_cards SET used_count = used_count + 1 WHERE id = _card.id;
  INSERT INTO public.wallet_card_redemptions (card_id, user_id, amount) VALUES (_card.id, auth.uid(), _card.amount);
  UPDATE public.wallets SET balance = balance + _card.amount WHERE id = _wid RETURNING balance INTO _bal;
  INSERT INTO public.wallet_transactions (wallet_id, user_id, kind, amount, balance_after, note, ref_id)
  VALUES (_wid, auth.uid(), 'card_redeem', _card.amount, _bal, _card.code, _card.id);
  RETURN _bal;
END; $$;

-- pay an order from balance
CREATE OR REPLACE FUNCTION public.wallet_pay_order(_order_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid; _bal numeric; _total numeric; _on boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT wallet_enabled INTO _on FROM public.store_settings LIMIT 1;
  IF NOT COALESCE(_on, false) THEN RAISE EXCEPTION 'wallet disabled'; END IF;
  SELECT total INTO _total FROM public.orders
    WHERE id = _order_id AND user_id = auth.uid() AND payment_status <> 'paid';
  IF _total IS NULL THEN RAISE EXCEPTION 'order not payable'; END IF;
  _wid := public.wallet_ensure(auth.uid());
  IF (SELECT is_frozen FROM public.wallets WHERE id = _wid) THEN RAISE EXCEPTION 'wallet frozen'; END IF;
  UPDATE public.wallets SET balance = balance - _total WHERE id = _wid RETURNING balance INTO _bal;
  IF _bal < 0 THEN RAISE EXCEPTION 'insufficient balance'; END IF;
  UPDATE public.orders SET payment_status = 'paid', paid_at = now(), payment_method = 'wallet'
    WHERE id = _order_id;
  INSERT INTO public.wallet_transactions (wallet_id, user_id, kind, amount, balance_after, note, ref_id)
  VALUES (_wid, auth.uid(), 'order_payment', -_total, _bal, '', _order_id);
  RETURN _bal;
END; $$;

REVOKE ALL ON FUNCTION public.wallet_ensure(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_my_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_redeem_card(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_pay_order(uuid) TO authenticated;
-- ================================================================
-- 20260822030712_e872a86c-8fdc-4d37-8cd9-9629eee960be.sql
-- ================================================================
REVOKE ALL ON FUNCTION public.wallet_ensure(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_my_balance() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wallet_redeem_card(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wallet_pay_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wallet_my_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_redeem_card(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_pay_order(uuid) TO authenticated;
-- ================================================================
-- 20260822032118_c6528a64-5c83-4ca6-8937-d0d0fe2a78a8.sql
-- ================================================================
GRANT SELECT ON public.wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_cards TO authenticated;
GRANT ALL ON public.wallet_cards TO service_role;

GRANT SELECT ON public.wallet_card_redemptions TO authenticated;
GRANT ALL ON public.wallet_card_redemptions TO service_role;

GRANT EXECUTE ON FUNCTION public.wallet_my_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_redeem_card(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_pay_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_ensure(uuid) TO service_role;
-- ================================================================
-- 20260822040142_03256068-cfa8-4aec-be95-612e04c104cf.sql
-- ================================================================
-- 1) Record which bundle a line belongs to (needed for server-side kit pricing)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS bundle_id uuid REFERENCES public.bundles(id) ON DELETE SET NULL;

-- 2) Lowest legitimate unit price for a product (clearance ladder, flash deals, offers, kits)
CREATE OR REPLACE FUNCTION public.order_item_price_floor(_product_id uuid, _bundle_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base numeric;
  cat uuid;
  brd text;
  kind text;
  exp date;
  months numeric;
  pct numeric := 0;
  floor_price numeric;
  cand numeric;
  bundle_price numeric;
  bundle_sum numeric;
BEGIN
  SELECT p.price, p.category_id, p.brand, p.clearance_kind, p.expiry_date
    INTO base, cat, brd, kind, exp
  FROM public.products p WHERE p.id = _product_id;
  IF base IS NULL THEN RETURN 0; END IF;

  -- automatic near-expiry markdown ladder
  IF kind = 'near_expiry' AND exp IS NOT NULL THEN
    months := floor(GREATEST(0, (exp - CURRENT_DATE)) / 30.44);
    SELECT LEAST(90, GREATEST(0, COALESCE(r.discount_percent, 0)))
      INTO pct
    FROM public.clearance_rules r
    WHERE r.is_active AND months <= r.months_left
    ORDER BY r.months_left ASC
    LIMIT 1;
    pct := COALESCE(pct, 0);
  END IF;

  floor_price := GREATEST(0, base - (base * pct / 100));

  -- active flash deals on this product
  FOR cand IN
    SELECT CASE
             WHEN d.discount_type = 'percent'
               THEN floor_price - LEAST(COALESCE(d.max_discount, 1e18), floor_price * LEAST(GREATEST(COALESCE(d.discount_value,0),0), 100) / 100)
             WHEN d.discount_type = 'fixed'
               THEN floor_price - LEAST(COALESCE(d.max_discount, 1e18), GREATEST(COALESCE(d.discount_value,0),0))
             ELSE floor_price
           END
    FROM public.flash_deals d
    WHERE d.is_active
      AND d.product_id = _product_id
      AND d.starts_at <= now()
      AND (d.ends_at IS NULL OR d.ends_at > now())
  LOOP
    floor_price := LEAST(floor_price, GREATEST(0, cand));
  END LOOP;

  -- active offers reaching this product (all / category / brand / explicit products), incl. BXGY
  FOR cand IN
    SELECT CASE
             WHEN o.discount_type = 'percent'
               THEN floor_price - LEAST(COALESCE(o.max_discount, 1e18), floor_price * LEAST(GREATEST(COALESCE(o.discount_value,0),0), 100) / 100)
             WHEN o.discount_type = 'fixed'
               THEN floor_price - LEAST(COALESCE(o.max_discount, 1e18), GREATEST(COALESCE(o.discount_value,0),0))
             WHEN o.discount_type = 'bxgy'
               THEN floor_price * GREATEST(COALESCE(o.buy_qty,1),1)::numeric
                    / GREATEST(COALESCE(o.buy_qty,1) + GREATEST(COALESCE(o.get_qty,0),0), 1)::numeric
             ELSE floor_price
           END
    FROM public.offers o
    WHERE o.is_active
      AND o.starts_at <= now()
      AND (o.ends_at IS NULL OR o.ends_at > now())
      AND (
        o.scope = 'all'
        OR (o.scope = 'category' AND o.category_id IS NOT NULL AND o.category_id = cat)
        OR (o.scope = 'brand' AND o.brand <> '' AND lower(o.brand) = lower(COALESCE(brd, '')))
        OR (o.scope = 'products' AND EXISTS (
              SELECT 1 FROM public.offer_products op
              WHERE op.offer_id = o.id AND op.product_id = _product_id))
      )
  LOOP
    floor_price := LEAST(floor_price, GREATEST(0, cand));
  END LOOP;

  -- kit (bundle) pricing: the line may carry its pro-rated share of the kit price
  IF _bundle_id IS NOT NULL THEN
    SELECT b.price INTO bundle_price
    FROM public.bundles b
    WHERE b.id = _bundle_id
      AND b.is_active
      AND (b.ends_at IS NULL OR b.ends_at > now())
      AND _product_id::text = ANY (b.product_ids);
    IF bundle_price IS NOT NULL THEN
      SELECT COALESCE(SUM(p.price), 0) INTO bundle_sum
      FROM public.products p
      WHERE p.id::text = ANY ((SELECT b.product_ids FROM public.bundles b WHERE b.id = _bundle_id));
      IF bundle_sum > 0 THEN
        floor_price := LEAST(floor_price, GREATEST(0, base * bundle_price / bundle_sum));
      END IF;
    END IF;
  END IF;

  RETURN GREATEST(0, floor_price);
END;
$$;

REVOKE ALL ON FUNCTION public.order_item_price_floor(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.order_item_price_floor(uuid, uuid) TO service_role;

-- 3) Enforce line price + product snapshot fields server-side
CREATE OR REPLACE FUNCTION public.enforce_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  floor_price numeric;
  ceil_price numeric;
BEGIN
  NEW.quantity := GREATEST(1, COALESCE(NEW.quantity, 1));

  SELECT id, price, name_ar, name_ku, image_url INTO p
  FROM public.products WHERE id = NEW.product_id;

  IF p.id IS NULL THEN
    -- no catalog row: never trust a client price
    NEW.unit_price := GREATEST(0, COALESCE(NEW.unit_price, 0));
    RETURN NEW;
  END IF;

  NEW.name_ar := p.name_ar;
  NEW.name_ku := p.name_ku;
  NEW.image_url := p.image_url;

  ceil_price := GREATEST(0, COALESCE(p.price, 0));
  floor_price := public.order_item_price_floor(NEW.product_id, NEW.bundle_id);

  IF COALESCE(NEW.unit_price, 0) > ceil_price THEN
    NEW.unit_price := ceil_price;
  ELSIF COALESCE(NEW.unit_price, 0) < floor_price - 1 THEN
    NEW.unit_price := floor_price;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_enforce_price ON public.order_items;
CREATE TRIGGER order_items_enforce_price
BEFORE INSERT OR UPDATE OF unit_price, quantity, product_id, bundle_id ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_item_price();

-- 4) Recompute order money from the real lines, store settings and a validated coupon
CREATE OR REPLACE FUNCTION public.recalc_order_money(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub numeric := 0;
  disc numeric := 0;
  vendors int := 1;
  fee numeric := 0;
  free_over numeric := 0;
  ship numeric := 0;
  after_disc numeric := 0;
  code text;
  c record;
BEGIN
  SELECT COALESCE(SUM(unit_price * quantity), 0),
         GREATEST(1, COUNT(DISTINCT COALESCE(vendor_id::text, 'none')))
    INTO sub, vendors
  FROM public.order_items WHERE order_id = _order_id;

  SELECT coupon_code INTO code FROM public.orders WHERE id = _order_id;

  IF code IS NOT NULL AND btrim(code) <> '' THEN
    SELECT * INTO c FROM public.validate_coupon(code, sub) LIMIT 1;
    IF c.code IS NOT NULL THEN
      disc := CASE
        WHEN c.discount_type = 'fixed' THEN LEAST(GREATEST(COALESCE(c.discount_value,0),0), sub)
        ELSE round(sub * LEAST(GREATEST(COALESCE(c.discount_value,0),0), 100) / 100)
      END;
    END IF;
  END IF;

  SELECT COALESCE(delivery_fee, 0), COALESCE(free_delivery_over, 0)
    INTO fee, free_over FROM public.store_settings LIMIT 1;

  after_disc := GREATEST(0, sub - disc);
  ship := CASE WHEN free_over > 0 AND after_disc >= free_over THEN 0 ELSE fee * vendors END;

  UPDATE public.orders
     SET subtotal = sub,
         discount = disc,
         total = after_disc + ship
   WHERE id = _order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recalc_order_money(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalc_order_money(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.order_items_recalc_money()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT order_id FROM (
      SELECT order_id FROM changed_rows
    ) x
  LOOP
    PERFORM public.recalc_order_money(r.order_id);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS order_items_money_ins ON public.order_items;
CREATE TRIGGER order_items_money_ins
AFTER INSERT ON public.order_items
REFERENCING NEW TABLE AS changed_rows
FOR EACH STATEMENT EXECUTE FUNCTION public.order_items_recalc_money();

DROP TRIGGER IF EXISTS order_items_money_upd ON public.order_items;
CREATE TRIGGER order_items_money_upd
AFTER UPDATE ON public.order_items
REFERENCING NEW TABLE AS changed_rows
FOR EACH STATEMENT EXECUTE FUNCTION public.order_items_recalc_money();

DROP TRIGGER IF EXISTS order_items_money_del ON public.order_items;
CREATE TRIGGER order_items_money_del
AFTER DELETE ON public.order_items
REFERENCING OLD TABLE AS changed_rows
FOR EACH STATEMENT EXECUTE FUNCTION public.order_items_recalc_money();

-- 5) Never trust client-supplied money / status on a new order
CREATE OR REPLACE FUNCTION public.sanitize_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.subtotal := 0;
  NEW.discount := 0;
  NEW.total := 0;
  NEW.status := 'new';
  NEW.payment_status := 'unpaid';
  NEW.paid_at := NULL;
  NEW.qi_payment_id := NULL;
  NEW.qi_request_id := NULL;
  NEW.qi_status := NULL;
  NEW.qi_form_url := NULL;

  IF NEW.coupon_code IS NOT NULL AND btrim(NEW.coupon_code) <> '' THEN
    NEW.coupon_code := upper(btrim(NEW.coupon_code));
    IF NOT EXISTS (
      SELECT 1 FROM public.coupons c
      WHERE c.code = NEW.coupon_code
        AND c.is_active
        AND (c.ends_at IS NULL OR c.ends_at > now())
        AND (c.max_uses IS NULL OR c.used_count < c.max_uses)
    ) THEN
      NEW.coupon_code := NULL;
    END IF;
  ELSE
    NEW.coupon_code := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_sanitize_insert ON public.orders;
CREATE TRIGGER orders_sanitize_insert
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sanitize_new_order();

-- 6) Controlled cleanup path for line items while the order is still waiting
DROP POLICY IF EXISTS "own order items delete before fulfillment" ON public.order_items;
CREATE POLICY "own order items delete before fulfillment"
ON public.order_items FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.status = 'new'
      AND o.payment_status <> 'paid'
      AND (
        o.user_id = auth.uid()
        OR order_items.vendor_id IN (SELECT public.my_vendor_ids())
      )
  )
);

-- 7) Vendor order counts must not be readable by anonymous visitors
REVOKE ALL ON FUNCTION public.vendor_order_counts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vendor_order_counts() FROM anon;
GRANT EXECUTE ON FUNCTION public.vendor_order_counts() TO authenticated, service_role;
-- ================================================================
-- 20260822040210_8ceaed48-9fd7-4982-8bc8-97e07d57a6ec.sql
-- ================================================================
REVOKE ALL ON FUNCTION public.enforce_order_item_price() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.order_items_recalc_money() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sanitize_new_order() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.order_item_price_floor(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_order_money(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_order_item_price() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.order_items_recalc_money() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.sanitize_new_order() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.order_item_price_floor(uuid, uuid) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.recalc_order_money(uuid) TO postgres, service_role;
-- ================================================================
-- 20260822040324_5c5b3c61-c9bf-48ef-bc67-722cffbe6cb5.sql
-- ================================================================
CREATE OR REPLACE FUNCTION public.order_item_price_floor(_product_id uuid, _bundle_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base numeric;
  cat uuid;
  brd text;
  kind text;
  exp date;
  months numeric;
  pct numeric := 0;
  floor_price numeric;
  cand numeric;
  bundle_price numeric;
  bundle_sum numeric;
  tier_min numeric;
BEGIN
  SELECT p.price, p.category_id, p.brand, p.clearance_kind, p.expiry_date
    INTO base, cat, brd, kind, exp
  FROM public.products p WHERE p.id = _product_id;
  IF base IS NULL THEN RETURN 0; END IF;

  IF kind = 'near_expiry' AND exp IS NOT NULL THEN
    months := floor(GREATEST(0, (exp - CURRENT_DATE)) / 30.44);
    SELECT LEAST(90, GREATEST(0, COALESCE(r.discount_percent, 0)))
      INTO pct
    FROM public.clearance_rules r
    WHERE r.is_active AND months <= r.months_left
    ORDER BY r.months_left ASC
    LIMIT 1;
    pct := COALESCE(pct, 0);
  END IF;

  floor_price := GREATEST(0, base - (base * pct / 100));

  -- wholesale quantity tiers
  SELECT MIN(t.price) INTO tier_min
  FROM public.product_tiers t WHERE t.product_id = _product_id;
  IF tier_min IS NOT NULL THEN
    floor_price := LEAST(floor_price, GREATEST(0, tier_min));
  END IF;

  FOR cand IN
    SELECT CASE
             WHEN d.discount_type = 'percent'
               THEN floor_price - LEAST(COALESCE(d.max_discount, 1e18), floor_price * LEAST(GREATEST(COALESCE(d.discount_value,0),0), 100) / 100)
             WHEN d.discount_type = 'fixed'
               THEN floor_price - LEAST(COALESCE(d.max_discount, 1e18), GREATEST(COALESCE(d.discount_value,0),0))
             ELSE floor_price
           END
    FROM public.flash_deals d
    WHERE d.is_active
      AND d.product_id = _product_id
      AND d.starts_at <= now()
      AND (d.ends_at IS NULL OR d.ends_at > now())
  LOOP
    floor_price := LEAST(floor_price, GREATEST(0, cand));
  END LOOP;

  FOR cand IN
    SELECT CASE
             WHEN o.discount_type = 'percent'
               THEN floor_price - LEAST(COALESCE(o.max_discount, 1e18), floor_price * LEAST(GREATEST(COALESCE(o.discount_value,0),0), 100) / 100)
             WHEN o.discount_type = 'fixed'
               THEN floor_price - LEAST(COALESCE(o.max_discount, 1e18), GREATEST(COALESCE(o.discount_value,0),0))
             WHEN o.discount_type = 'bxgy'
               THEN floor_price * GREATEST(COALESCE(o.buy_qty,1),1)::numeric
                    / GREATEST(COALESCE(o.buy_qty,1) + GREATEST(COALESCE(o.get_qty,0),0), 1)::numeric
             ELSE floor_price
           END
    FROM public.offers o
    WHERE o.is_active
      AND o.starts_at <= now()
      AND (o.ends_at IS NULL OR o.ends_at > now())
      AND (
        o.scope = 'all'
        OR (o.scope = 'category' AND o.category_id IS NOT NULL AND o.category_id = cat)
        OR (o.scope = 'brand' AND o.brand <> '' AND lower(o.brand) = lower(COALESCE(brd, '')))
        OR (o.scope = 'products' AND EXISTS (
              SELECT 1 FROM public.offer_products op
              WHERE op.offer_id = o.id AND op.product_id = _product_id))
      )
  LOOP
    floor_price := LEAST(floor_price, GREATEST(0, cand));
  END LOOP;

  IF _bundle_id IS NOT NULL THEN
    SELECT b.price INTO bundle_price
    FROM public.bundles b
    WHERE b.id = _bundle_id
      AND b.is_active
      AND (b.ends_at IS NULL OR b.ends_at > now())
      AND _product_id::text = ANY (b.product_ids);
    IF bundle_price IS NOT NULL THEN
      SELECT COALESCE(SUM(p.price), 0) INTO bundle_sum
      FROM public.products p
      WHERE p.id::text = ANY ((SELECT b.product_ids FROM public.bundles b WHERE b.id = _bundle_id));
      IF bundle_sum > 0 THEN
        floor_price := LEAST(floor_price, GREATEST(0, base * bundle_price / bundle_sum));
      END IF;
    END IF;
  END IF;

  RETURN GREATEST(0, floor_price);
END;
$$;

REVOKE ALL ON FUNCTION public.order_item_price_floor(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.order_item_price_floor(uuid, uuid) TO postgres, service_role;
-- ================================================================
-- 20260822041150_d278ea8e-4df7-44a3-8a66-d77e4df5174d.sql
-- ================================================================
DROP POLICY IF EXISTS "banner_images_insert" ON storage.objects;
CREATE POLICY "banner_images_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'banners'
  AND owner = auth.uid()
  AND public.has_role(auth.uid(), 'admin')
);
-- ================================================================
-- 20260822042505_fe0558b7-2265-41f9-8e65-10e244944a11.sql
-- ================================================================
CREATE TABLE public.catalog_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_key text NOT NULL UNIQUE,
  name_ar text NOT NULL DEFAULT '',
  name_ku text NOT NULL DEFAULT '',
  description_ar text NOT NULL DEFAULT '',
  description_ku text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  sku text NOT NULL DEFAULT '',
  image_url text,
  category_id uuid REFERENCES public.categories(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.catalog_items TO anon;
GRANT SELECT, INSERT ON public.catalog_items TO authenticated;
GRANT ALL ON public.catalog_items TO service_role;

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_items_read_all" ON public.catalog_items FOR SELECT USING (true);
CREATE POLICY "catalog_items_insert_signed_in" ON public.catalog_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "catalog_items_admin_update" ON public.catalog_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "catalog_items_admin_delete" ON public.catalog_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER catalog_items_touch BEFORE UPDATE ON public.catalog_items
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.products ADD COLUMN catalog_item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.catalog_key(_brand text, _name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(lower(btrim(coalesce(_brand, ''))), '\s+', ' ', 'g')
      || '|' ||
      regexp_replace(lower(btrim(coalesce(_name, ''))), '\s+', ' ', 'g')
$$;

REVOKE EXECUTE ON FUNCTION public.catalog_key(text, text) FROM anon;

-- backfill shared catalog items from existing products
INSERT INTO public.catalog_items (match_key, name_ar, name_ku, description_ar, description_ku, brand, sku, image_url, category_id)
SELECT DISTINCT ON (public.catalog_key(p.brand, p.name_ar))
       public.catalog_key(p.brand, p.name_ar),
       p.name_ar, p.name_ku, p.description_ar, p.description_ku, p.brand, p.sku, p.image_url, p.category_id
FROM public.products p
WHERE btrim(coalesce(p.name_ar, '')) <> ''
ORDER BY public.catalog_key(p.brand, p.name_ar), p.created_at
ON CONFLICT (match_key) DO NOTHING;

UPDATE public.products p
   SET catalog_item_id = c.id
  FROM public.catalog_items c
 WHERE c.match_key = public.catalog_key(p.brand, p.name_ar)
   AND p.catalog_item_id IS NULL;

CREATE OR REPLACE FUNCTION public.products_link_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
  cid uuid;
BEGIN
  IF NEW.catalog_item_id IS NOT NULL THEN RETURN NEW; END IF;
  IF btrim(coalesce(NEW.name_ar, '')) = '' THEN RETURN NEW; END IF;

  k := public.catalog_key(NEW.brand, NEW.name_ar);
  SELECT id INTO cid FROM public.catalog_items WHERE match_key = k;
  IF cid IS NULL THEN
    INSERT INTO public.catalog_items (match_key, name_ar, name_ku, description_ar, description_ku, brand, sku, image_url, category_id)
    VALUES (k, NEW.name_ar, coalesce(NEW.name_ku, ''), coalesce(NEW.description_ar, ''), coalesce(NEW.description_ku, ''),
            coalesce(NEW.brand, ''), coalesce(NEW.sku, ''), NEW.image_url, NEW.category_id)
    ON CONFLICT (match_key) DO UPDATE SET updated_at = now()
    RETURNING id INTO cid;
  END IF;
  NEW.catalog_item_id := cid;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.products_link_catalog() FROM anon, authenticated;

CREATE TRIGGER products_link_catalog_trg BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_link_catalog();

-- one listing per vendor per catalog item
CREATE UNIQUE INDEX products_vendor_catalog_uniq
  ON public.products (vendor_id, catalog_item_id)
  WHERE vendor_id IS NOT NULL AND catalog_item_id IS NOT NULL;

CREATE INDEX products_catalog_item_idx ON public.products (catalog_item_id);
-- ================================================================
-- 20260822042530_993b9fce-16a1-46cb-bf8b-b0f1047b15ff.sql
-- ================================================================
REVOKE ALL ON FUNCTION public.products_link_catalog() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.catalog_key(text, text) FROM PUBLIC, anon;
-- ================================================================
-- 20260822045611_13d7862f-81eb-4884-9039-73d98a7ef05f.sql
-- ================================================================
ALTER TABLE public.ui_texts ADD COLUMN IF NOT EXISTS en text;
-- ================================================================
-- 20260822050720_0d9cdaeb-6f1a-4be6-93ba-5827f29d3901.sql
-- ================================================================
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS lang_ar_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lang_ku_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lang_en_enabled boolean NOT NULL DEFAULT true;
-- ================================================================
-- 20260822062626_ee77059d-d13d-48e7-beae-57951b885bcf.sql
-- ================================================================
-- 1. Reward rules (admin controlled)
CREATE TABLE public.reward_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  points numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reward_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_rules TO authenticated;
GRANT ALL ON public.reward_rules TO service_role;
ALTER TABLE public.reward_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reward_rules_read" ON public.reward_rules FOR SELECT USING (true);
CREATE POLICY "reward_rules_admin_write" ON public.reward_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER reward_rules_touch BEFORE UPDATE ON public.reward_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.reward_rules (key, points, sort_order) VALUES
  ('purchase_per_1000_iqd', 1, 10),
  ('first_order', 500, 20),
  ('review', 50, 30),
  ('review_photo', 100, 40),
  ('referral_inviter', 500, 50),
  ('referral_invitee', 500, 60),
  ('streak_3', 500, 70),
  ('streak_6', 1500, 80),
  ('streak_12', 5000, 90),
  ('challenge_target_iqd', 500000, 100),
  ('challenge_bonus', 1000, 110),
  ('profile_clinic_name', 50, 120),
  ('profile_specialty', 50, 130),
  ('profile_city', 50, 140),
  ('profile_categories', 50, 150),
  ('profile_complete', 200, 160);

-- 2. Store settings
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS rewards_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS points_per_1000_iqd numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS rewards_max_redeem_percent numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS rewards_note_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rewards_note_ku text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rewards_note_en text NOT NULL DEFAULT '';

-- 3. Products: coin boosts
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS reward_multiplier numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reward_bonus_points integer NOT NULL DEFAULT 0;

-- 4. Orders: coin spend / earn
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coins_spent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coins_earned integer NOT NULL DEFAULT 0;

-- 5. Profiles: clinic data + referrals
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS clinic_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS specialty text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS preferred_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS referral_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS referred_by uuid;

CREATE OR REPLACE FUNCTION public.profiles_fill_referral_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.referral_code, '') = '' THEN
    NEW.referral_code := 'DK' || upper(left(replace(NEW.id::text, '-', ''), 6));
  END IF;
  IF NEW.referred_by = NEW.id THEN NEW.referred_by := NULL; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER profiles_referral_code BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_fill_referral_code();
UPDATE public.profiles SET referral_code = 'DK' || upper(left(replace(id::text, '-', ''), 6))
  WHERE COALESCE(referral_code, '') = '';
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles (referral_code);

-- 6. Product reviews (purchased products only)
CREATE OR REPLACE FUNCTION public.user_bought_product(_user_id uuid, _product_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items i
    JOIN public.orders o ON o.id = i.order_id
    WHERE i.product_id = _product_id AND o.user_id = _user_id AND o.payment_status = 'paid'
  )
$$;
REVOKE ALL ON FUNCTION public.user_bought_product(uuid, uuid) FROM public;

CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  comment text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT ON public.product_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_read" ON public.product_reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_own_purchase" ON public.product_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.user_bought_product(auth.uid(), product_id));
CREATE POLICY "reviews_update_own" ON public.product_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews_delete_own_or_admin" ON public.product_reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER product_reviews_touch BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 7. Reward helpers
CREATE OR REPLACE FUNCTION public.reward_rule(_key text)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT r.points FROM public.reward_rules r WHERE r.key = _key AND r.is_active), 0)
$$;
REVOKE ALL ON FUNCTION public.reward_rule(text) FROM public;

CREATE OR REPLACE FUNCTION public.reward_grant(_user_id uuid, _kind text, _points numeric, _note text DEFAULT '', _ref uuid DEFAULT NULL, _once boolean DEFAULT false)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _wid uuid; _bal numeric;
BEGIN
  IF _user_id IS NULL OR COALESCE(_points, 0) <= 0 THEN RETURN 0; END IF;
  IF _once AND EXISTS (
    SELECT 1 FROM public.wallet_transactions t
    WHERE t.user_id = _user_id AND t.kind = _kind
      AND (_ref IS NULL OR t.ref_id = _ref)
      AND (_ref IS NOT NULL OR t.note = COALESCE(_note, ''))
  ) THEN RETURN 0; END IF;
  _wid := public.wallet_ensure(_user_id);
  UPDATE public.wallets SET balance = balance + _points WHERE id = _wid RETURNING balance INTO _bal;
  INSERT INTO public.wallet_transactions (wallet_id, user_id, kind, amount, balance_after, note, ref_id)
  VALUES (_wid, _user_id, _kind, _points, _bal, COALESCE(_note, ''), _ref);
  RETURN _points;
END; $$;
REVOKE ALL ON FUNCTION public.reward_grant(uuid, text, numeric, text, uuid, boolean) FROM public;

-- 8. Award coins when an order becomes paid
CREATE OR REPLACE FUNCTION public.reward_award_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o record; rate numeric; base numeric := 0; bonus numeric := 0; total_pts numeric := 0;
  paid_orders integer; months integer; tier integer; mkey text; month_spend numeric;
  target numeric; inviter uuid; on_flag boolean;
BEGIN
  SELECT rewards_enabled INTO on_flag FROM public.store_settings LIMIT 1;
  IF NOT COALESCE(on_flag, false) THEN RETURN; END IF;

  SELECT id, user_id, total, paid_at FROM public.orders WHERE id = _order_id INTO o;
  IF o.id IS NULL OR o.user_id IS NULL THEN RETURN; END IF;

  rate := public.reward_rule('purchase_per_1000_iqd');
  base := floor(GREATEST(COALESCE(o.total, 0), 0) / 1000.0 * rate);

  SELECT COALESCE(SUM(
      floor(i.unit_price * i.quantity / 1000.0 * rate) * GREATEST(COALESCE(p.reward_multiplier, 1) - 1, 0)
      + COALESCE(p.reward_bonus_points, 0) * i.quantity), 0)
    INTO bonus
  FROM public.order_items i LEFT JOIN public.products p ON p.id = i.product_id
  WHERE i.order_id = _order_id;

  total_pts := floor(base + bonus);
  IF total_pts > 0 THEN
    PERFORM public.reward_grant(o.user_id, 'earn_purchase', total_pts, '', _order_id, true);
    UPDATE public.orders SET coins_earned = total_pts WHERE id = _order_id;
  END IF;

  SELECT count(*) INTO paid_orders FROM public.orders
   WHERE user_id = o.user_id AND payment_status = 'paid';

  IF paid_orders = 1 THEN
    PERFORM public.reward_grant(o.user_id, 'earn_first_order', public.reward_rule('first_order'), '', _order_id, true);
    SELECT referred_by INTO inviter FROM public.profiles WHERE id = o.user_id;
    IF inviter IS NOT NULL THEN
      PERFORM public.reward_grant(inviter, 'earn_referral', public.reward_rule('referral_inviter'), '', o.user_id, true);
      PERFORM public.reward_grant(o.user_id, 'earn_referral', public.reward_rule('referral_invitee'), '', o.user_id, true);
    END IF;
  END IF;

  -- consecutive months with a paid order, ending this month
  SELECT count(*) INTO months FROM (
    SELECT date_trunc('month', COALESCE(paid_at, created_at)) AS m,
           row_number() OVER (ORDER BY date_trunc('month', COALESCE(paid_at, created_at)) DESC) AS rn
    FROM (SELECT DISTINCT date_trunc('month', COALESCE(paid_at, created_at)) AS paid_at, created_at
            FROM public.orders WHERE user_id = o.user_id AND payment_status = 'paid') d
  ) x WHERE m = date_trunc('month', now()) - ((rn - 1) || ' months')::interval;

  FOREACH tier IN ARRAY ARRAY[12, 6, 3] LOOP
    IF months >= tier THEN
      PERFORM public.reward_grant(o.user_id, 'earn_streak', public.reward_rule('streak_' || tier),
        tier || 'm:' || to_char(now(), 'YYYY-MM'), NULL, true);
      EXIT;
    END IF;
  END LOOP;

  -- monthly challenge
  target := public.reward_rule('challenge_target_iqd');
  IF target > 0 THEN
    SELECT COALESCE(SUM(total), 0) INTO month_spend FROM public.orders
     WHERE user_id = o.user_id AND payment_status = 'paid'
       AND COALESCE(paid_at, created_at) >= date_trunc('month', now());
    IF month_spend >= target THEN
      mkey := to_char(now(), 'YYYY-MM');
      PERFORM public.reward_grant(o.user_id, 'earn_challenge', public.reward_rule('challenge_bonus'), mkey, NULL, true);
    END IF;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.reward_award_order(uuid) FROM public;

CREATE OR REPLACE FUNCTION public.reward_on_order_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND COALESCE(OLD.payment_status, '') <> 'paid' THEN
    PERFORM public.reward_award_order(NEW.id);
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER orders_reward_award AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.reward_on_order_paid();

-- 9. Review rewards
CREATE OR REPLACE FUNCTION public.reward_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pts numeric;
BEGIN
  pts := public.reward_rule(CASE WHEN COALESCE(NEW.image_url, '') <> '' THEN 'review_photo' ELSE 'review' END);
  PERFORM public.reward_grant(NEW.user_id, 'earn_review', pts, '', NEW.product_id, true);
  RETURN NULL;
END; $$;
CREATE TRIGGER product_reviews_reward AFTER INSERT ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.reward_on_review();

-- 10. Profile completion rewards
CREATE OR REPLACE FUNCTION public.reward_claim_profile()
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; got numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  IF p.id IS NULL THEN RETURN 0; END IF;
  IF btrim(COALESCE(p.clinic_name, '')) <> '' THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_clinic_name'), 'clinic_name', NULL, true); END IF;
  IF btrim(COALESCE(p.specialty, '')) <> '' THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_specialty'), 'specialty', NULL, true); END IF;
  IF btrim(COALESCE(p.city, '')) <> '' THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_city'), 'city', NULL, true); END IF;
  IF COALESCE(array_length(p.preferred_categories, 1), 0) > 0 THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_categories'), 'categories', NULL, true); END IF;
  IF btrim(COALESCE(p.clinic_name, '')) <> '' AND btrim(COALESCE(p.specialty, '')) <> ''
     AND btrim(COALESCE(p.city, '')) <> '' AND COALESCE(array_length(p.preferred_categories, 1), 0) > 0 THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_complete'), 'complete', NULL, true); END IF;
  RETURN got;
END; $$;

-- 11. Referral code use
CREATE OR REPLACE FUNCTION public.reward_use_referral(_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inviter uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND referred_by IS NOT NULL) THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE user_id = auth.uid() AND payment_status = 'paid') THEN RETURN false; END IF;
  SELECT id INTO _inviter FROM public.profiles WHERE referral_code = upper(btrim(_code));
  IF _inviter IS NULL OR _inviter = auth.uid() THEN RETURN false; END IF;
  UPDATE public.profiles SET referred_by = _inviter WHERE id = auth.uid();
  RETURN true;
END; $$;

-- 12. Redeem points as an order discount
CREATE OR REPLACE FUNCTION public.reward_redeem_order(_order_id uuid, _points integer)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o record; _wid uuid; _bal numeric; rate numeric; maxpct numeric; on_flag boolean;
  value numeric; cap numeric; use_pts integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT rewards_enabled, points_per_1000_iqd, rewards_max_redeem_percent
    INTO on_flag, rate, maxpct FROM public.store_settings LIMIT 1;
  IF NOT COALESCE(on_flag, false) THEN RAISE EXCEPTION 'rewards disabled'; END IF;
  IF COALESCE(rate, 0) <= 0 THEN RAISE EXCEPTION 'rate not set'; END IF;

  SELECT id, total, coins_spent INTO o FROM public.orders
   WHERE id = _order_id AND user_id = auth.uid() AND payment_status <> 'paid' FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'order not payable'; END IF;
  IF COALESCE(o.coins_spent, 0) > 0 THEN RAISE EXCEPTION 'already redeemed'; END IF;

  _wid := public.wallet_ensure(auth.uid());
  IF (SELECT is_frozen FROM public.wallets WHERE id = _wid) THEN RAISE EXCEPTION 'rewards frozen'; END IF;
  SELECT balance INTO _bal FROM public.wallets WHERE id = _wid;

  use_pts := LEAST(GREATEST(COALESCE(_points, 0), 0), floor(COALESCE(_bal, 0))::integer);
  IF use_pts <= 0 THEN RAISE EXCEPTION 'no points'; END IF;

  cap := round(GREATEST(COALESCE(o.total, 0), 0) * LEAST(GREATEST(COALESCE(maxpct, 0), 0), 100) / 100);
  value := round(use_pts / rate * 1000);
  IF value > cap THEN
    value := cap;
    use_pts := floor(cap * rate / 1000)::integer;
  END IF;
  IF use_pts <= 0 OR value <= 0 THEN RAISE EXCEPTION 'no points'; END IF;

  UPDATE public.wallets SET balance = balance - use_pts WHERE id = _wid RETURNING balance INTO _bal;
  IF _bal < 0 THEN RAISE EXCEPTION 'insufficient points'; END IF;

  INSERT INTO public.wallet_transactions (wallet_id, user_id, kind, amount, balance_after, note, ref_id)
  VALUES (_wid, auth.uid(), 'spend_order', -use_pts, _bal, '', _order_id);

  UPDATE public.orders SET coins_spent = use_pts, coins_discount = value WHERE id = _order_id;
  PERFORM public.recalc_order_money(_order_id);
  RETURN value;
END; $$;

-- 13. Include the coin discount in order totals
CREATE OR REPLACE FUNCTION public.recalc_order_money(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sub numeric := 0; disc numeric := 0; vendors int := 1; fee numeric := 0;
  free_over numeric := 0; ship numeric := 0; after_disc numeric := 0;
  code text; c record; coin numeric := 0; gross numeric := 0;
BEGIN
  SELECT COALESCE(SUM(unit_price * quantity), 0),
         GREATEST(1, COUNT(DISTINCT COALESCE(vendor_id::text, 'none')))
    INTO sub, vendors
  FROM public.order_items WHERE order_id = _order_id;

  SELECT coupon_code, COALESCE(coins_discount, 0) INTO code, coin
    FROM public.orders WHERE id = _order_id;

  IF code IS NOT NULL AND btrim(code) <> '' THEN
    SELECT * INTO c FROM public.validate_coupon(code, sub) LIMIT 1;
    IF c.code IS NOT NULL THEN
      disc := CASE
        WHEN c.discount_type = 'fixed' THEN LEAST(GREATEST(COALESCE(c.discount_value,0),0), sub)
        ELSE round(sub * LEAST(GREATEST(COALESCE(c.discount_value,0),0), 100) / 100)
      END;
    END IF;
  END IF;

  SELECT COALESCE(delivery_fee, 0), COALESCE(free_delivery_over, 0)
    INTO fee, free_over FROM public.store_settings LIMIT 1;

  after_disc := GREATEST(0, sub - disc);
  ship := CASE WHEN free_over > 0 AND after_disc >= free_over THEN 0 ELSE fee * vendors END;
  gross := after_disc + ship;
  coin := LEAST(GREATEST(coin, 0), gross);

  UPDATE public.orders
     SET subtotal = sub,
         discount = disc + coin,
         total = GREATEST(0, gross - coin)
   WHERE id = _order_id;
END; $$;

-- 14. My rewards summary
CREATE OR REPLACE FUNCTION public.reward_my_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  bal numeric; month_spend numeric; target numeric; months integer := 0;
  rate numeric; code text; refs integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  PERFORM public.wallet_ensure(auth.uid());
  SELECT balance INTO bal FROM public.wallets WHERE user_id = auth.uid();
  SELECT COALESCE(SUM(total), 0) INTO month_spend FROM public.orders
   WHERE user_id = auth.uid() AND payment_status = 'paid'
     AND COALESCE(paid_at, created_at) >= date_trunc('month', now());
  target := public.reward_rule('challenge_target_iqd');
  SELECT points_per_1000_iqd INTO rate FROM public.store_settings LIMIT 1;
  SELECT referral_code INTO code FROM public.profiles WHERE id = auth.uid();
  SELECT count(*) INTO refs FROM public.profiles p
   WHERE p.referred_by = auth.uid()
     AND EXISTS (SELECT 1 FROM public.orders o WHERE o.user_id = p.id AND o.payment_status = 'paid');

  SELECT count(*) INTO months FROM (
    SELECT m, row_number() OVER (ORDER BY m DESC) AS rn FROM (
      SELECT DISTINCT date_trunc('month', COALESCE(paid_at, created_at)) AS m
        FROM public.orders WHERE user_id = auth.uid() AND payment_status = 'paid') d
  ) x WHERE m = date_trunc('month', now()) - ((rn - 1) || ' months')::interval;

  RETURN jsonb_build_object(
    'balance', COALESCE(bal, 0),
    'month_spend', month_spend,
    'challenge_target', target,
    'challenge_bonus', public.reward_rule('challenge_bonus'),
    'streak_months', months,
    'points_per_1000_iqd', COALESCE(rate, 0),
    'referral_code', COALESCE(code, ''),
    'referrals_done', refs
  );
END; $$;

REVOKE EXECUTE ON FUNCTION public.reward_claim_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.reward_use_referral(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reward_redeem_order(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reward_my_summary() FROM anon;
-- ================================================================
-- 20260822062645_9f063398-0765-41f1-87e2-86655e3e148f.sql
-- ================================================================
REVOKE ALL ON FUNCTION public.reward_grant(uuid, text, numeric, text, uuid, boolean) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_rule(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_award_order(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.user_bought_product(uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_on_review() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_on_order_paid() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.profiles_fill_referral_code() FROM anon, authenticated;
-- ================================================================
-- 20260822081520_e4c4c5e6-b30b-4277-a09e-925b2ed9ccce.sql
-- ================================================================
-- 1. Settings for vendor-sponsored reward points
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS reward_vendor_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reward_vendor_max_multiplier numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS reward_vendor_max_bonus integer NOT NULL DEFAULT 2000,
  ADD COLUMN IF NOT EXISTS reward_vendor_cost_factor numeric NOT NULL DEFAULT 1;

-- 2. Offers can sponsor reward points too
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS reward_multiplier numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reward_bonus_points integer NOT NULL DEFAULT 0;

-- 3. Clamp vendor-set reward values to admin caps
CREATE OR REPLACE FUNCTION public.clamp_reward_sponsorship()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _max_m numeric; _max_b numeric; _on boolean;
BEGIN
  SELECT reward_vendor_enabled, reward_vendor_max_multiplier, reward_vendor_max_bonus
    INTO _on, _max_m, _max_b FROM public.store_settings LIMIT 1;
  _max_m := COALESCE(_max_m, 5);
  _max_b := COALESCE(_max_b, 2000);
  NEW.reward_multiplier := LEAST(GREATEST(COALESCE(NEW.reward_multiplier, 1), 1), GREATEST(_max_m, 1));
  NEW.reward_bonus_points := LEAST(GREATEST(COALESCE(NEW.reward_bonus_points, 0), 0), GREATEST(_max_b, 0))::integer;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.clamp_reward_sponsorship() FROM anon, authenticated;

DROP TRIGGER IF EXISTS products_clamp_reward ON public.products;
CREATE TRIGGER products_clamp_reward BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.clamp_reward_sponsorship();
DROP TRIGGER IF EXISTS offers_clamp_reward ON public.offers;
CREATE TRIGGER offers_clamp_reward BEFORE INSERT OR UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.clamp_reward_sponsorship();

-- 4. Ledger of vendor-sponsored points
CREATE TABLE IF NOT EXISTS public.vendor_reward_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'product',
  points numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vendor_reward_points_vendor_idx ON public.vendor_reward_points (vendor_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS vendor_reward_points_item_key ON public.vendor_reward_points (order_item_id, source);

GRANT SELECT ON public.vendor_reward_points TO authenticated;
GRANT ALL ON public.vendor_reward_points TO service_role;
ALTER TABLE public.vendor_reward_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendor_reward_points_read_admin" ON public.vendor_reward_points FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "vendor_reward_points_read_vendor" ON public.vendor_reward_points FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT public.my_vendor_ids()));
CREATE POLICY "vendor_reward_points_read_own" ON public.vendor_reward_points FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5. Best matching sponsored offer for a product
CREATE OR REPLACE FUNCTION public.reward_offer_for_product(_product_id uuid)
RETURNS public.offers LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.* FROM public.offers o
  JOIN public.products p ON p.id = _product_id
  WHERE o.is_active
    AND (o.reward_bonus_points > 0 OR o.reward_multiplier > 1)
    AND o.starts_at <= now() AND (o.ends_at IS NULL OR o.ends_at > now())
    AND (o.vendor_id IS NULL OR o.vendor_id = p.vendor_id)
    AND (
      o.scope = 'all'
      OR (o.scope = 'category' AND o.category_id = p.category_id)
      OR (o.scope = 'brand' AND lower(o.brand) = lower(p.brand))
      OR (o.scope = 'products' AND EXISTS (
            SELECT 1 FROM public.offer_products op WHERE op.offer_id = o.id AND op.product_id = p.id))
    )
  ORDER BY o.priority DESC, o.reward_bonus_points DESC
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.reward_offer_for_product(uuid) FROM anon, authenticated;

-- 6. Award coins on paid order, attributing sponsored points to vendors
CREATE OR REPLACE FUNCTION public.reward_award_order(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o record; it record; ofr record; rate numeric; base numeric := 0; bonus numeric := 0; total_pts numeric := 0;
  paid_orders integer; months integer; tier integer; mkey text; month_spend numeric;
  target numeric; inviter uuid; on_flag boolean;
  vend_on boolean; cost_factor numeric; coin_rate numeric;
  line_base numeric; p_pts numeric; o_pts numeric; cost numeric;
BEGIN
  SELECT rewards_enabled, reward_vendor_enabled, reward_vendor_cost_factor, points_per_1000_iqd
    INTO on_flag, vend_on, cost_factor, coin_rate FROM public.store_settings LIMIT 1;
  IF NOT COALESCE(on_flag, false) THEN RETURN; END IF;
  cost_factor := COALESCE(cost_factor, 1);
  coin_rate := GREATEST(COALESCE(coin_rate, 100), 1);

  SELECT id, user_id, total, paid_at FROM public.orders WHERE id = _order_id INTO o;
  IF o.id IS NULL OR o.user_id IS NULL THEN RETURN; END IF;

  rate := public.reward_rule('purchase_per_1000_iqd');
  base := floor(GREATEST(COALESCE(o.total, 0), 0) / 1000.0 * rate);

  FOR it IN
    SELECT i.id, i.product_id, i.vendor_id, i.unit_price, i.quantity,
           COALESCE(p.reward_multiplier, 1) AS p_mult, COALESCE(p.reward_bonus_points, 0) AS p_bonus
      FROM public.order_items i
      LEFT JOIN public.products p ON p.id = i.product_id
     WHERE i.order_id = _order_id
  LOOP
    line_base := floor(COALESCE(it.unit_price, 0) * COALESCE(it.quantity, 0) / 1000.0 * rate);
    p_pts := floor(line_base * GREATEST(it.p_mult - 1, 0) + it.p_bonus * COALESCE(it.quantity, 0));

    ofr := NULL;
    o_pts := 0;
    IF it.product_id IS NOT NULL THEN
      SELECT * INTO ofr FROM public.reward_offer_for_product(it.product_id);
      IF ofr.id IS NOT NULL THEN
        o_pts := floor(line_base * GREATEST(COALESCE(ofr.reward_multiplier, 1) - 1, 0)
                       + COALESCE(ofr.reward_bonus_points, 0) * COALESCE(it.quantity, 0));
      END IF;
    END IF;

    bonus := bonus + p_pts + o_pts;

    IF COALESCE(vend_on, true) AND it.vendor_id IS NOT NULL THEN
      IF p_pts > 0 THEN
        cost := round(p_pts / coin_rate * 1000.0 * cost_factor);
        INSERT INTO public.vendor_reward_points
          (vendor_id, order_id, order_item_id, product_id, user_id, source, points, cost, note)
        VALUES (it.vendor_id, _order_id, it.id, it.product_id, o.user_id, 'product', p_pts, cost, 'product boost')
        ON CONFLICT (order_item_id, source) DO NOTHING;
      END IF;
      IF o_pts > 0 THEN
        cost := round(o_pts / coin_rate * 1000.0 * cost_factor);
        INSERT INTO public.vendor_reward_points
          (vendor_id, order_id, order_item_id, product_id, offer_id, user_id, source, points, cost, note)
        VALUES (it.vendor_id, _order_id, it.id, it.product_id, ofr.id, o.user_id, 'offer', o_pts, cost, 'offer boost')
        ON CONFLICT (order_item_id, source) DO NOTHING;
      END IF;
    END IF;
  END LOOP;

  total_pts := floor(base + bonus);
  IF total_pts > 0 THEN
    PERFORM public.reward_grant(o.user_id, 'earn_purchase', total_pts, '', _order_id, true);
    UPDATE public.orders SET coins_earned = total_pts WHERE id = _order_id;
  END IF;

  SELECT count(*) INTO paid_orders FROM public.orders
   WHERE user_id = o.user_id AND payment_status = 'paid';

  IF paid_orders = 1 THEN
    PERFORM public.reward_grant(o.user_id, 'earn_first_order', public.reward_rule('first_order'), '', _order_id, true);
    SELECT referred_by INTO inviter FROM public.profiles WHERE id = o.user_id;
    IF inviter IS NOT NULL THEN
      PERFORM public.reward_grant(inviter, 'earn_referral', public.reward_rule('referral_inviter'), '', o.user_id, true);
      PERFORM public.reward_grant(o.user_id, 'earn_referral', public.reward_rule('referral_invitee'), '', o.user_id, true);
    END IF;
  END IF;

  SELECT count(*) INTO months FROM (
    SELECT date_trunc('month', COALESCE(paid_at, created_at)) AS m,
           row_number() OVER (ORDER BY date_trunc('month', COALESCE(paid_at, created_at)) DESC) AS rn
    FROM (SELECT DISTINCT date_trunc('month', COALESCE(paid_at, created_at)) AS paid_at, created_at
            FROM public.orders WHERE user_id = o.user_id AND payment_status = 'paid') d
  ) x WHERE m = date_trunc('month', now()) - ((rn - 1) || ' months')::interval;

  FOREACH tier IN ARRAY ARRAY[12, 6, 3] LOOP
    IF months >= tier THEN
      PERFORM public.reward_grant(o.user_id, 'earn_streak', public.reward_rule('streak_' || tier),
        tier || 'm:' || to_char(now(), 'YYYY-MM'), NULL, true);
      EXIT;
    END IF;
  END LOOP;

  target := public.reward_rule('challenge_target_iqd');
  IF target > 0 THEN
    SELECT COALESCE(SUM(total), 0) INTO month_spend FROM public.orders
     WHERE user_id = o.user_id AND payment_status = 'paid'
       AND COALESCE(paid_at, created_at) >= date_trunc('month', now());
    IF month_spend >= target THEN
      mkey := to_char(now(), 'YYYY-MM');
      PERFORM public.reward_grant(o.user_id, 'earn_challenge', public.reward_rule('challenge_bonus'), mkey, NULL, true);
    END IF;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.reward_award_order(uuid) FROM public, anon, authenticated;

-- 7. Bill vendors for sponsored points
CREATE OR REPLACE FUNCTION public.charge_vendor_reward_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.cost, 0) > 0 THEN
    INSERT INTO public.vendor_charges (vendor_id, kind, ref_id, label, amount, status)
    VALUES (NEW.vendor_id, 'reward_points', NEW.id,
            'Reward points ' || round(NEW.points)::text || ' (' || NEW.source || ')',
            NEW.cost, 'unpaid');
  END IF;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.charge_vendor_reward_points() FROM anon, authenticated;

DROP TRIGGER IF EXISTS vendor_reward_points_charge ON public.vendor_reward_points;
CREATE TRIGGER vendor_reward_points_charge AFTER INSERT ON public.vendor_reward_points
  FOR EACH ROW EXECUTE FUNCTION public.charge_vendor_reward_points();
-- ================================================================
-- 20260822081550_5641c438-4f83-4e80-9c38-c7a8923fefa8.sql
-- ================================================================
REVOKE ALL ON FUNCTION public.clamp_reward_sponsorship() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.charge_vendor_reward_points() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_offer_for_product(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_on_order_paid() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_on_review() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_award_order(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.reward_claim_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reward_claim_profile() TO authenticated;
REVOKE ALL ON FUNCTION public.reward_my_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reward_my_summary() TO authenticated;
REVOKE ALL ON FUNCTION public.reward_redeem_order(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reward_redeem_order(uuid, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.reward_use_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reward_use_referral(text) TO authenticated;
-- ================================================================
-- 20260822083014_2c39c4e2-9ca1-4259-af23-18cb5b24e632.sql
-- ================================================================
CREATE OR REPLACE FUNCTION public.order_item_price_floor(_product_id uuid, _bundle_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base numeric;
  cat uuid;
  brd text;
  kind text;
  exp date;
  months numeric;
  pct numeric := 0;
  floor_price numeric;
  cand numeric;
  bundle_price numeric;
  bundle_sum numeric;
  tier_min numeric;
BEGIN
  SELECT p.price, p.category_id, p.brand, p.clearance_kind, p.expiry_date
    INTO base, cat, brd, kind, exp
  FROM public.products p WHERE p.id = _product_id;
  IF base IS NULL THEN RETURN 0; END IF;

  IF kind = 'near_expiry' AND exp IS NOT NULL THEN
    months := floor(GREATEST(0, (exp - CURRENT_DATE)) / 30.44);
    SELECT LEAST(90, GREATEST(0, COALESCE(r.discount_percent, 0)))
      INTO pct
    FROM public.clearance_rules r
    WHERE r.is_active AND months <= r.months_left
    ORDER BY r.months_left ASC
    LIMIT 1;
    pct := COALESCE(pct, 0);
  END IF;

  floor_price := GREATEST(0, base - (base * pct / 100));

  SELECT MIN(t.price) INTO tier_min
  FROM public.product_tiers t WHERE t.product_id = _product_id;
  IF tier_min IS NOT NULL THEN
    floor_price := LEAST(floor_price, GREATEST(0, tier_min));
  END IF;

  FOR cand IN
    SELECT CASE
             WHEN d.discount_type = 'percent'
               THEN floor_price - LEAST(COALESCE(d.max_discount, 1e18), floor_price * LEAST(GREATEST(COALESCE(d.discount_value,0),0), 100) / 100)
             WHEN d.discount_type = 'fixed'
               THEN floor_price - LEAST(COALESCE(d.max_discount, 1e18), GREATEST(COALESCE(d.discount_value,0),0))
             ELSE floor_price
           END
    FROM public.flash_deals d
    WHERE d.is_active
      AND d.product_id = _product_id
      AND d.starts_at <= now()
      AND (d.ends_at IS NULL OR d.ends_at > now())
  LOOP
    floor_price := LEAST(floor_price, GREATEST(0, cand));
  END LOOP;

  FOR cand IN
    SELECT CASE
             WHEN o.discount_type = 'percent'
               THEN floor_price - LEAST(COALESCE(o.max_discount, 1e18), floor_price * LEAST(GREATEST(COALESCE(o.discount_value,0),0), 100) / 100)
             WHEN o.discount_type = 'fixed'
               THEN floor_price - LEAST(COALESCE(o.max_discount, 1e18), GREATEST(COALESCE(o.discount_value,0),0))
             WHEN o.discount_type = 'bxgy'
               THEN floor_price * GREATEST(COALESCE(o.buy_qty,1),1)::numeric
                    / GREATEST(COALESCE(o.buy_qty,1) + GREATEST(COALESCE(o.get_qty,0),0), 1)::numeric
             ELSE floor_price
           END
    FROM public.offers o
    WHERE o.is_active
      AND o.starts_at <= now()
      AND (o.ends_at IS NULL OR o.ends_at > now())
      AND (
        o.scope = 'all'
        OR (o.scope = 'category' AND o.category_id IS NOT NULL AND o.category_id = cat)
        OR (o.scope = 'brand' AND o.brand <> '' AND lower(o.brand) = lower(COALESCE(brd, '')))
        OR (o.scope = 'products' AND EXISTS (
              SELECT 1 FROM public.offer_products op
              WHERE op.offer_id = o.id AND op.product_id = _product_id))
      )
  LOOP
    floor_price := LEAST(floor_price, GREATEST(0, cand));
  END LOOP;

  IF _bundle_id IS NOT NULL THEN
    SELECT b.price INTO bundle_price
    FROM public.bundles b
    WHERE b.id = _bundle_id
      AND b.is_active
      AND (b.ends_at IS NULL OR b.ends_at > now())
      AND _product_id = ANY (b.product_ids);
    IF bundle_price IS NOT NULL THEN
      SELECT COALESCE(SUM(p.price), 0) INTO bundle_sum
      FROM public.products p
      WHERE p.id = ANY ((SELECT b.product_ids FROM public.bundles b WHERE b.id = _bundle_id));
      IF bundle_sum > 0 THEN
        floor_price := LEAST(floor_price, GREATEST(0, base * bundle_price / bundle_sum));
      END IF;
    END IF;
  END IF;

  RETURN GREATEST(0, floor_price);
END;
$function$;

REVOKE ALL ON FUNCTION public.order_item_price_floor(uuid, uuid) FROM PUBLIC, anon, authenticated;
-- ================================================================
-- 20260822083406_20743a6b-6bed-4863-a829-687f4d81f2fc.sql
-- ================================================================
CREATE OR REPLACE FUNCTION public.order_item_price_floor(_product_id uuid, _bundle_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base numeric;
  cat uuid;
  brd text;
  kind text;
  exp date;
  months numeric;
  pct numeric := 0;
  floor_price numeric;
  cand numeric;
  bundle_price numeric;
  bundle_sum numeric;
  tier_min numeric;
BEGIN
  SELECT p.price, p.category_id, p.brand, p.clearance_kind, p.expiry_date
    INTO base, cat, brd, kind, exp
  FROM public.products p WHERE p.id = _product_id;
  IF base IS NULL THEN RETURN 0; END IF;

  IF kind = 'near_expiry' AND exp IS NOT NULL THEN
    months := floor(GREATEST(0, (exp - CURRENT_DATE)) / 30.44);
    SELECT LEAST(90, GREATEST(0, COALESCE(r.discount_percent, 0)))
      INTO pct
    FROM public.clearance_rules r
    WHERE r.is_active AND months <= r.months_left
    ORDER BY r.months_left ASC
    LIMIT 1;
    pct := COALESCE(pct, 0);
  END IF;

  floor_price := GREATEST(0, base - (base * pct / 100));

  SELECT MIN(t.price) INTO tier_min
  FROM public.product_tiers t WHERE t.product_id = _product_id;
  IF tier_min IS NOT NULL THEN
    floor_price := LEAST(floor_price, GREATEST(0, tier_min));
  END IF;

  FOR cand IN
    SELECT CASE
             WHEN d.discount_type = 'percent'
               THEN floor_price - LEAST(COALESCE(d.max_discount, 1e18), floor_price * LEAST(GREATEST(COALESCE(d.discount_value,0),0), 100) / 100)
             WHEN d.discount_type = 'fixed'
               THEN floor_price - LEAST(COALESCE(d.max_discount, 1e18), GREATEST(COALESCE(d.discount_value,0),0))
             ELSE floor_price
           END
    FROM public.flash_deals d
    WHERE d.is_active
      AND d.product_id = _product_id
      AND d.starts_at <= now()
      AND (d.ends_at IS NULL OR d.ends_at > now())
  LOOP
    floor_price := LEAST(floor_price, GREATEST(0, cand));
  END LOOP;

  FOR cand IN
    SELECT CASE
             WHEN o.discount_type = 'percent'
               THEN floor_price - LEAST(COALESCE(o.max_discount, 1e18), floor_price * LEAST(GREATEST(COALESCE(o.discount_value,0),0), 100) / 100)
             WHEN o.discount_type = 'fixed'
               THEN floor_price - LEAST(COALESCE(o.max_discount, 1e18), GREATEST(COALESCE(o.discount_value,0),0))
             WHEN o.discount_type = 'bxgy'
               THEN floor_price * GREATEST(COALESCE(o.buy_qty,1),1)::numeric
                    / GREATEST(COALESCE(o.buy_qty,1) + GREATEST(COALESCE(o.get_qty,0),0), 1)::numeric
             ELSE floor_price
           END
    FROM public.offers o
    WHERE o.is_active
      AND o.starts_at <= now()
      AND (o.ends_at IS NULL OR o.ends_at > now())
      AND (
        o.scope = 'all'
        OR (o.scope = 'category' AND o.category_id IS NOT NULL AND o.category_id = cat)
        OR (o.scope = 'brand' AND o.brand <> '' AND lower(o.brand) = lower(COALESCE(brd, '')))
        OR (o.scope = 'products' AND EXISTS (
              SELECT 1 FROM public.offer_products op
              WHERE op.offer_id = o.id AND op.product_id = _product_id))
      )
  LOOP
    floor_price := LEAST(floor_price, GREATEST(0, cand));
  END LOOP;

  IF _bundle_id IS NOT NULL THEN
    SELECT b.price INTO bundle_price
    FROM public.bundles b
    WHERE b.id = _bundle_id
      AND b.is_active
      AND (b.ends_at IS NULL OR b.ends_at > now())
      AND _product_id = ANY (b.product_ids);

    IF bundle_price IS NOT NULL THEN
      SELECT COALESCE(SUM(p.price), 0) INTO bundle_sum
      FROM public.bundles b
      CROSS JOIN LATERAL unnest(b.product_ids) AS bundle_product(product_id)
      JOIN public.products p ON p.id = bundle_product.product_id
      WHERE b.id = _bundle_id;

      IF bundle_sum > 0 THEN
        floor_price := LEAST(floor_price, GREATEST(0, base * bundle_price / bundle_sum));
      END IF;
    END IF;
  END IF;

  RETURN GREATEST(0, floor_price);
END;
$function$;
-- ================================================================
-- 20260822084930_91942f1f-0012-433a-852f-0692373964dd.sql
-- ================================================================
CREATE OR REPLACE FUNCTION public.can_order(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL
     AND NOT public.has_role(_user_id, 'admin')
     AND NOT EXISTS (SELECT 1 FROM public.vendor_members m WHERE m.user_id = _user_id)
$$;

REVOKE ALL ON FUNCTION public.can_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_order(uuid) TO authenticated, service_role;

-- Orders: dentists only for inserts; admins keep read/update/delete
DROP POLICY IF EXISTS "own orders insert" ON public.orders;
CREATE POLICY "buyers insert own orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_order(auth.uid()));

DROP POLICY IF EXISTS "admins manage orders" ON public.orders;
CREATE POLICY "admins read orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete orders" ON public.orders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Order items: same rule
DROP POLICY IF EXISTS "own order items insert" ON public.order_items;
CREATE POLICY "buyers insert own order items" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (public.owns_order(order_id) AND public.can_order(auth.uid()));

DROP POLICY IF EXISTS "admins manage order items" ON public.order_items;
CREATE POLICY "admins read order items" ON public.order_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update order items" ON public.order_items
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete order items" ON public.order_items
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Reward points: admins and vendor members never earn points
CREATE OR REPLACE FUNCTION public.reward_grant(_user_id uuid, _kind text, _points numeric, _note text DEFAULT ''::text, _ref uuid DEFAULT NULL::uuid, _once boolean DEFAULT false)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _wid uuid; _bal numeric;
BEGIN
  IF _user_id IS NULL OR COALESCE(_points, 0) <= 0 THEN RETURN 0; END IF;
  IF NOT public.can_order(_user_id) THEN RETURN 0; END IF;
  IF _once AND EXISTS (
    SELECT 1 FROM public.wallet_transactions t
    WHERE t.user_id = _user_id AND t.kind = _kind
      AND (_ref IS NULL OR t.ref_id = _ref)
      AND (_ref IS NOT NULL OR t.note = COALESCE(_note, ''))
  ) THEN RETURN 0; END IF;
  _wid := public.wallet_ensure(_user_id);
  UPDATE public.wallets SET balance = balance + _points WHERE id = _wid RETURNING balance INTO _bal;
  INSERT INTO public.wallet_transactions (wallet_id, user_id, kind, amount, balance_after, note, ref_id)
  VALUES (_wid, _user_id, _kind, _points, _bal, COALESCE(_note, ''), _ref);
  RETURN _points;
END; $function$;

CREATE OR REPLACE FUNCTION public.reward_award_order(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  o record; it record; ofr record; rate numeric; base numeric := 0; bonus numeric := 0; total_pts numeric := 0;
  paid_orders integer; months integer; tier integer; mkey text; month_spend numeric;
  target numeric; inviter uuid; on_flag boolean;
  vend_on boolean; cost_factor numeric; coin_rate numeric;
  line_base numeric; p_pts numeric; o_pts numeric; cost numeric;
BEGIN
  SELECT rewards_enabled, reward_vendor_enabled, reward_vendor_cost_factor, points_per_1000_iqd
    INTO on_flag, vend_on, cost_factor, coin_rate FROM public.store_settings LIMIT 1;
  IF NOT COALESCE(on_flag, false) THEN RETURN; END IF;
  cost_factor := COALESCE(cost_factor, 1);
  coin_rate := GREATEST(COALESCE(coin_rate, 100), 1);

  SELECT id, user_id, total, paid_at FROM public.orders WHERE id = _order_id INTO o;
  IF o.id IS NULL OR o.user_id IS NULL THEN RETURN; END IF;
  IF NOT public.can_order(o.user_id) THEN RETURN; END IF;

  rate := public.reward_rule('purchase_per_1000_iqd');
  base := floor(GREATEST(COALESCE(o.total, 0), 0) / 1000.0 * rate);

  FOR it IN
    SELECT i.id, i.product_id, i.vendor_id, i.unit_price, i.quantity,
           COALESCE(p.reward_multiplier, 1) AS p_mult, COALESCE(p.reward_bonus_points, 0) AS p_bonus
      FROM public.order_items i
      LEFT JOIN public.products p ON p.id = i.product_id
     WHERE i.order_id = _order_id
  LOOP
    line_base := floor(COALESCE(it.unit_price, 0) * COALESCE(it.quantity, 0) / 1000.0 * rate);
    p_pts := floor(line_base * GREATEST(it.p_mult - 1, 0) + it.p_bonus * COALESCE(it.quantity, 0));

    ofr := NULL;
    o_pts := 0;
    IF it.product_id IS NOT NULL THEN
      SELECT * INTO ofr FROM public.reward_offer_for_product(it.product_id);
      IF ofr.id IS NOT NULL THEN
        o_pts := floor(line_base * GREATEST(COALESCE(ofr.reward_multiplier, 1) - 1, 0)
                       + COALESCE(ofr.reward_bonus_points, 0) * COALESCE(it.quantity, 0));
      END IF;
    END IF;

    bonus := bonus + p_pts + o_pts;

    IF COALESCE(vend_on, true) AND it.vendor_id IS NOT NULL THEN
      IF p_pts > 0 THEN
        cost := round(p_pts / coin_rate * 1000.0 * cost_factor);
        INSERT INTO public.vendor_reward_points
          (vendor_id, order_id, order_item_id, product_id, user_id, source, points, cost, note)
        VALUES (it.vendor_id, _order_id, it.id, it.product_id, o.user_id, 'product', p_pts, cost, 'product boost')
        ON CONFLICT (order_item_id, source) DO NOTHING;
      END IF;
      IF o_pts > 0 THEN
        cost := round(o_pts / coin_rate * 1000.0 * cost_factor);
        INSERT INTO public.vendor_reward_points
          (vendor_id, order_id, order_item_id, product_id, offer_id, user_id, source, points, cost, note)
        VALUES (it.vendor_id, _order_id, it.id, it.product_id, ofr.id, o.user_id, 'offer', o_pts, cost, 'offer boost')
        ON CONFLICT (order_item_id, source) DO NOTHING;
      END IF;
    END IF;
  END LOOP;

  total_pts := floor(base + bonus);
  IF total_pts > 0 THEN
    PERFORM public.reward_grant(o.user_id, 'earn_purchase', total_pts, '', _order_id, true);
    UPDATE public.orders SET coins_earned = total_pts WHERE id = _order_id;
  END IF;

  SELECT count(*) INTO paid_orders FROM public.orders
   WHERE user_id = o.user_id AND payment_status = 'paid';

  IF paid_orders = 1 THEN
    PERFORM public.reward_grant(o.user_id, 'earn_first_order', public.reward_rule('first_order'), '', _order_id, true);
    SELECT referred_by INTO inviter FROM public.profiles WHERE id = o.user_id;
    IF inviter IS NOT NULL THEN
      PERFORM public.reward_grant(inviter, 'earn_referral', public.reward_rule('referral_inviter'), '', o.user_id, true);
      PERFORM public.reward_grant(o.user_id, 'earn_referral', public.reward_rule('referral_invitee'), '', o.user_id, true);
    END IF;
  END IF;

  SELECT count(*) INTO months FROM (
    SELECT date_trunc('month', COALESCE(paid_at, created_at)) AS m,
           row_number() OVER (ORDER BY date_trunc('month', COALESCE(paid_at, created_at)) DESC) AS rn
    FROM (SELECT DISTINCT date_trunc('month', COALESCE(paid_at, created_at)) AS paid_at, created_at
            FROM public.orders WHERE user_id = o.user_id AND payment_status = 'paid') d
  ) x WHERE m = date_trunc('month', now()) - ((rn - 1) || ' months')::interval;

  FOREACH tier IN ARRAY ARRAY[12, 6, 3] LOOP
    IF months >= tier THEN
      PERFORM public.reward_grant(o.user_id, 'earn_streak', public.reward_rule('streak_' || tier),
        tier || 'm:' || to_char(now(), 'YYYY-MM'), NULL, true);
      EXIT;
    END IF;
  END LOOP;

  target := public.reward_rule('challenge_target_iqd');
  IF target > 0 THEN
    SELECT COALESCE(SUM(total), 0) INTO month_spend FROM public.orders
     WHERE user_id = o.user_id AND payment_status = 'paid'
       AND COALESCE(paid_at, created_at) >= date_trunc('month', now());
    IF month_spend >= target THEN
      mkey := to_char(now(), 'YYYY-MM');
      PERFORM public.reward_grant(o.user_id, 'earn_challenge', public.reward_rule('challenge_bonus'), mkey, NULL, true);
    END IF;
  END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.reward_claim_profile()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE p record; got numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT public.can_order(auth.uid()) THEN RETURN 0; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  IF p.id IS NULL THEN RETURN 0; END IF;
  IF btrim(COALESCE(p.clinic_name, '')) <> '' THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_clinic_name'), 'clinic_name', NULL, true); END IF;
  IF btrim(COALESCE(p.specialty, '')) <> '' THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_specialty'), 'specialty', NULL, true); END IF;
  IF btrim(COALESCE(p.city, '')) <> '' THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_city'), 'city', NULL, true); END IF;
  IF COALESCE(array_length(p.preferred_categories, 1), 0) > 0 THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_categories'), 'categories', NULL, true); END IF;
  IF btrim(COALESCE(p.clinic_name, '')) <> '' AND btrim(COALESCE(p.specialty, '')) <> ''
     AND btrim(COALESCE(p.city, '')) <> '' AND COALESCE(array_length(p.preferred_categories, 1), 0) > 0 THEN
    got := got + public.reward_grant(auth.uid(), 'earn_profile', public.reward_rule('profile_complete'), 'complete', NULL, true); END IF;
  RETURN got;
END; $function$;

CREATE OR REPLACE FUNCTION public.reward_on_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE pts numeric;
BEGIN
  IF NOT public.can_order(NEW.user_id) THEN RETURN NULL; END IF;
  pts := public.reward_rule(CASE WHEN COALESCE(NEW.image_url, '') <> '' THEN 'review_photo' ELSE 'review' END);
  PERFORM public.reward_grant(NEW.user_id, 'earn_review', pts, '', NEW.product_id, true);
  RETURN NULL;
END; $function$;
-- ================================================================
-- 20260822085118_8e494c80-20e7-4d23-b9cb-ebe2a6188064.sql
-- ================================================================
GRANT EXECUTE ON FUNCTION public.can_order(uuid) TO postgres;
-- ================================================================
-- 20260822100758_a20c2c80-fdc5-48cd-858b-673c79bdfaaf.sql
-- ================================================================
CREATE TABLE public.vendor_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name text NOT NULL,
  city text NOT NULL DEFAULT '',
  address_line text NOT NULL DEFAULT '',
  phone text NOT NULL,
  user_id uuid,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  note text NOT NULL DEFAULT '',
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX vendor_applications_phone_key ON public.vendor_applications (phone);

GRANT SELECT, UPDATE, DELETE ON public.vendor_applications TO authenticated;
GRANT ALL ON public.vendor_applications TO service_role;

ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read vendor applications"
ON public.vendor_applications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update vendor applications"
ON public.vendor_applications FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete vendor applications"
ON public.vendor_applications FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER vendor_applications_touch
BEFORE UPDATE ON public.vendor_applications
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
-- ================================================================
-- 20260822103500_23f7d372-f4d8-4677-9497-a9bb30db2134.sql
-- ================================================================
-- 1. Table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title_ar text NOT NULL DEFAULT '',
  title_ku text NOT NULL DEFAULT '',
  title_en text NOT NULL DEFAULT '',
  body_ar text NOT NULL DEFAULT '',
  body_ku text NOT NULL DEFAULT '',
  body_en text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  order_id uuid,
  vendor_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own_read" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_admin_read" ON public.notifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON public.notifications (user_id) WHERE is_read = false;

CREATE TRIGGER notifications_touch BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Helpers
CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid, _kind text,
  _title_ar text, _title_ku text, _title_en text,
  _body_ar text DEFAULT '', _body_ku text DEFAULT '', _body_en text DEFAULT '',
  _link text DEFAULT '', _order_id uuid DEFAULT NULL, _vendor_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, kind, title_ar, title_ku, title_en, body_ar, body_ku, body_en, link, order_id, vendor_id)
  VALUES (_user_id, _kind, _title_ar, _title_ku, _title_en, coalesce(_body_ar,''), coalesce(_body_ku,''), coalesce(_body_en,''), coalesce(_link,''), _order_id, _vendor_id);
END; $$;

CREATE OR REPLACE FUNCTION public.notify_admins(
  _kind text, _title_ar text, _title_ku text, _title_en text,
  _body_ar text DEFAULT '', _body_ku text DEFAULT '', _body_en text DEFAULT '',
  _link text DEFAULT '', _order_id uuid DEFAULT NULL, _vendor_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title_ar, title_ku, title_en, body_ar, body_ku, body_en, link, order_id, vendor_id)
  SELECT ur.user_id, _kind, _title_ar, _title_ku, _title_en, coalesce(_body_ar,''), coalesce(_body_ku,''), coalesce(_body_en,''), coalesce(_link,''), _order_id, _vendor_id
  FROM public.user_roles ur WHERE ur.role = 'admin';
END; $$;

CREATE OR REPLACE FUNCTION public.notify_vendor(
  _vendor_id uuid, _kind text, _title_ar text, _title_ku text, _title_en text,
  _body_ar text DEFAULT '', _body_ku text DEFAULT '', _body_en text DEFAULT '',
  _link text DEFAULT '', _order_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _vendor_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, kind, title_ar, title_ku, title_en, body_ar, body_ku, body_en, link, order_id, vendor_id)
  SELECT vm.user_id, _kind, _title_ar, _title_ku, _title_en, coalesce(_body_ar,''), coalesce(_body_ku,''), coalesce(_body_en,''), coalesce(_link,''), _order_id, _vendor_id
  FROM public.vendor_members vm WHERE vm.vendor_id = _vendor_id;
END; $$;

CREATE OR REPLACE FUNCTION public.notifications_mark_read(_ids uuid[] DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  UPDATE public.notifications SET is_read = true
  WHERE user_id = auth.uid() AND is_read = false
    AND (_ids IS NULL OR id = ANY(_ids));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

REVOKE ALL ON FUNCTION public.notify_user(uuid,text,text,text,text,text,text,text,text,uuid,uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_admins(text,text,text,text,text,text,text,text,uuid,uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_vendor(uuid,text,text,text,text,text,text,text,text,uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notifications_mark_read(uuid[]) TO authenticated;

-- 3. Order notifications
CREATE OR REPLACE FUNCTION public.notify_on_order_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_user(NEW.user_id, 'order_placed',
    'تم استلام طلبك #' || NEW.order_no,
    'داواکاریت وەرگیرا #' || NEW.order_no,
    'Order #' || NEW.order_no || ' received',
    'سنبلغك عند تأكيد الطلب.', 'کاتی پەسەندکردن ئاگادارت دەکەینەوە.', 'We will notify you once it is confirmed.',
    '/orders/' || NEW.id::text, NEW.id, NULL);
  PERFORM public.notify_admins('order_new',
    'طلب جديد #' || NEW.order_no,
    'داواکاری نوێ #' || NEW.order_no,
    'New order #' || NEW.order_no,
    NEW.customer_name || ' — ' || NEW.city, NEW.customer_name || ' — ' || NEW.city, NEW.customer_name || ' — ' || NEW.city,
    '/admin', NEW.id, NULL);
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_order_insert AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_insert();

CREATE OR REPLACE FUNCTION public.notify_on_order_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v record;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' THEN
      PERFORM public.notify_user(NEW.user_id, 'order_confirmed',
        'تم تأكيد طلبك #' || NEW.order_no, 'داواکاریت پەسەند کرا #' || NEW.order_no, 'Order #' || NEW.order_no || ' confirmed',
        'جارٍ التحضير للتوصيل.', 'ئامادە دەکرێت بۆ گەیاندن.', 'It is being prepared for delivery.',
        '/orders/' || NEW.id::text, NEW.id, NULL);
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM public.notify_user(NEW.user_id, 'order_cancelled',
        'تم إلغاء طلبك #' || NEW.order_no, 'داواکاریت هەڵوەشێنرا #' || NEW.order_no, 'Order #' || NEW.order_no || ' cancelled',
        '', '', '', '/orders/' || NEW.id::text, NEW.id, NULL);
    END IF;
    FOR v IN SELECT DISTINCT vendor_id FROM public.order_items WHERE order_id = NEW.id AND vendor_id IS NOT NULL LOOP
      PERFORM public.notify_vendor(v.vendor_id, 'order_status',
        'تحديث حالة الطلب #' || NEW.order_no, 'نوێکردنەوەی داواکاری #' || NEW.order_no, 'Order #' || NEW.order_no || ' updated',
        'الحالة: ' || NEW.status, 'دۆخ: ' || NEW.status, 'Status: ' || NEW.status,
        '/brand', NEW.id);
    END LOOP;
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status AND NEW.payment_status = 'paid' THEN
    PERFORM public.notify_user(NEW.user_id, 'order_paid',
      'تم تأكيد الدفع #' || NEW.order_no, 'پارەدان پەسەند کرا #' || NEW.order_no, 'Payment received #' || NEW.order_no,
      '', '', '', '/orders/' || NEW.id::text, NEW.id, NULL);
    FOR v IN SELECT DISTINCT vendor_id FROM public.order_items WHERE order_id = NEW.id AND vendor_id IS NOT NULL LOOP
      PERFORM public.notify_vendor(v.vendor_id, 'order_paid',
        'طلب مدفوع #' || NEW.order_no, 'داواکاری پارەدراو #' || NEW.order_no, 'Paid order #' || NEW.order_no,
        '', '', '', '/brand', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_order_update AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_update();

CREATE OR REPLACE FUNCTION public.notify_on_order_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record;
BEGIN
  IF NEW.vendor_id IS NULL THEN RETURN NEW; END IF;
  SELECT order_no, city INTO o FROM public.orders WHERE id = NEW.order_id;
  PERFORM public.notify_vendor(NEW.vendor_id, 'order_item_new',
    'منتج مطلوب في الطلب #' || coalesce(o.order_no::text,''),
    'بەرهەمێکت داواکراوە #' || coalesce(o.order_no::text,''),
    'Your product was ordered #' || coalesce(o.order_no::text,''),
    NEW.name_ar || ' × ' || NEW.quantity, NEW.name_ku || ' × ' || NEW.quantity, NEW.name_ar || ' × ' || NEW.quantity,
    '/brand', NEW.order_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_order_item_insert AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_item();

-- 4. Reward point notifications
CREATE OR REPLACE FUNCTION public.notify_on_wallet_tx()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pts text := trim(to_char(abs(NEW.amount), 'FM999999999'));
BEGIN
  IF NEW.amount > 0 THEN
    PERFORM public.notify_user(NEW.user_id, 'reward_earned',
      'حصلت على ' || pts || ' نقطة مكافأة', pts || ' خاڵی خەڵات بەدەستت هێنا', 'You earned ' || pts || ' reward points',
      coalesce(NEW.note,''), coalesce(NEW.note,''), coalesce(NEW.note,''),
      '/profile/wallet', NULL, NULL);
  ELSIF NEW.amount < 0 THEN
    PERFORM public.notify_user(NEW.user_id, 'reward_spent',
      'تم استخدام ' || pts || ' نقطة مكافأة', pts || ' خاڵی خەڵات بەکارهێنرا', 'You redeemed ' || pts || ' reward points',
      coalesce(NEW.note,''), coalesce(NEW.note,''), coalesce(NEW.note,''),
      '/profile/wallet', NULL, NULL);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_wallet_tx AFTER INSERT ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_wallet_tx();

CREATE OR REPLACE FUNCTION public.notify_on_vendor_reward_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pts text := trim(to_char(NEW.points, 'FM999999999'));
BEGIN
  PERFORM public.notify_vendor(NEW.vendor_id, 'vendor_reward_sponsored',
    'رعيت ' || pts || ' نقطة مكافأة', pts || ' خاڵی خەڵات پاڵپشتی کرا', 'You sponsored ' || pts || ' reward points',
    coalesce(NEW.note,''), coalesce(NEW.note,''), coalesce(NEW.note,''),
    '/brand', NEW.order_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_vendor_reward_points AFTER INSERT ON public.vendor_reward_points
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_vendor_reward_points();

-- 5. Vendor charges
CREATE OR REPLACE FUNCTION public.notify_on_vendor_charge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_vendor(NEW.vendor_id, 'vendor_charge',
    'رسوم جديدة: ' || NEW.label, 'کرێی نوێ: ' || NEW.label, 'New charge: ' || NEW.label,
    trim(to_char(NEW.amount, 'FM999999999')) || ' IQD', trim(to_char(NEW.amount, 'FM999999999')) || ' IQD', trim(to_char(NEW.amount, 'FM999999999')) || ' IQD',
    '/brand', NULL);
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_vendor_charge AFTER INSERT ON public.vendor_charges
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_vendor_charge();

-- 6. Vendor applications
CREATE OR REPLACE FUNCTION public.notify_on_vendor_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins('vendor_application_new',
      'طلب بائع جديد: ' || NEW.store_name, 'داواکاری فرۆشیاری نوێ: ' || NEW.store_name, 'New vendor request: ' || NEW.store_name,
      NEW.city, NEW.city, NEW.city, '/admin', NULL, NEW.vendor_id);
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.user_id IS NOT NULL THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.notify_user(NEW.user_id, 'vendor_approved',
        'تمت الموافقة على متجرك', 'فرۆشگاکەت پەسەند کرا', 'Your store was approved',
        'يمكنك الدخول وإدارة منتجاتك الآن.', 'ئێستا دەتوانی بچیتە ژوورەوە و بەرهەمەکانت بەڕێوە ببەی.', 'You can sign in and manage your products now.',
        '/brand', NULL, NEW.vendor_id);
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.notify_user(NEW.user_id, 'vendor_rejected',
        'تم رفض طلب المتجر', 'داواکاری فرۆشگا ڕەت کرایەوە', 'Store request rejected',
        coalesce(NEW.note,''), coalesce(NEW.note,''), coalesce(NEW.note,''), '/', NULL, NEW.vendor_id);
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_vendor_application_insert AFTER INSERT ON public.vendor_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_vendor_application();
CREATE TRIGGER notify_vendor_application_update AFTER UPDATE ON public.vendor_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_vendor_application();

-- 7. Reviews
CREATE OR REPLACE FUNCTION public.notify_on_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record;
BEGIN
  SELECT vendor_id, name_ar, name_ku INTO p FROM public.products WHERE id = NEW.product_id;
  IF p.vendor_id IS NOT NULL THEN
    PERFORM public.notify_vendor(p.vendor_id, 'product_review',
      'تقييم جديد (' || NEW.rating || '★)', 'هەڵسەنگاندنی نوێ (' || NEW.rating || '★)', 'New review (' || NEW.rating || '★)',
      p.name_ar, p.name_ku, p.name_ar, '/product/' || NEW.product_id::text, NULL);
  END IF;
  PERFORM public.notify_admins('product_review',
    'تقييم جديد (' || NEW.rating || '★)', 'هەڵسەنگاندنی نوێ (' || NEW.rating || '★)', 'New review (' || NEW.rating || '★)',
    coalesce(p.name_ar,''), coalesce(p.name_ku,''), coalesce(p.name_ar,''), '/admin', NULL, p.vendor_id);
  RETURN NEW;
END; $$;

CREATE TRIGGER notify_review_insert AFTER INSERT ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_review();

-- ================================================================
-- 20260822103522_30f585d4-8ad6-451a-a395-6dea1bf4e300.sql
-- ================================================================
REVOKE ALL ON FUNCTION public.notify_on_order_insert() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_order_update() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_order_item() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_wallet_tx() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_vendor_reward_points() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_vendor_charge() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_vendor_application() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_review() FROM anon, authenticated;

-- ================================================================
-- 20260822104731_db9212b6-66b2-4add-86bf-58dbe52dae2a.sql
-- ================================================================
create or replace function public.admin_broadcast_notification(
  _audience text,
  _title_ar text,
  _title_ku text,
  _title_en text,
  _body_ar text,
  _body_ku text,
  _body_en text,
  _link text default '',
  _vendor_id uuid default null,
  _kind text default 'announcement'
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _n integer := 0;
  _u uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;
  if coalesce(_title_ar,'') = '' and coalesce(_title_en,'') = '' and coalesce(_title_ku,'') = '' then
    raise exception 'title required';
  end if;

  for _u in
    select u.id from auth.users u
    where case _audience
      when 'all' then true
      when 'admins' then public.has_role(u.id, 'admin')
      when 'vendors' then exists (select 1 from public.vendor_members m where m.user_id = u.id)
      when 'dentists' then public.can_order(u.id)
      when 'vendor' then exists (
        select 1 from public.vendor_members m
        where m.user_id = u.id and m.vendor_id = _vendor_id
      )
      else false
    end
  loop
    perform public.notify_user(
      _u, _kind,
      coalesce(nullif(_title_ar,''), _title_en, _title_ku),
      coalesce(nullif(_title_ku,''), _title_ar, _title_en),
      coalesce(nullif(_title_en,''), _title_ar, _title_ku),
      coalesce(_body_ar,''), coalesce(_body_ku,''), coalesce(_body_en,''),
      coalesce(_link,''), null, _vendor_id
    );
    _n := _n + 1;
  end loop;

  return _n;
end;
$$;

revoke all on function public.admin_broadcast_notification(text,text,text,text,text,text,text,text,uuid,text) from public;
grant execute on function public.admin_broadcast_notification(text,text,text,text,text,text,text,text,uuid,text) to authenticated;
-- ================================================================
-- 20260822111749_efa4c1b5-50ff-4af4-8c3e-cd9f2daf55d3.sql
-- ================================================================
CREATE OR REPLACE FUNCTION public.reward_redeem_order(_order_id uuid, _points integer)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o record; _wid uuid; _bal numeric; rate numeric; maxpct numeric; on_flag boolean;
  value numeric; allowed_pts integer; use_pts integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT rewards_enabled, points_per_1000_iqd, rewards_max_redeem_percent
    INTO on_flag, rate, maxpct FROM public.store_settings LIMIT 1;
  IF NOT COALESCE(on_flag, false) THEN RAISE EXCEPTION 'rewards disabled'; END IF;
  IF COALESCE(rate, 0) <= 0 THEN RAISE EXCEPTION 'rate not set'; END IF;

  SELECT id, total, coins_spent INTO o FROM public.orders
   WHERE id = _order_id AND user_id = auth.uid() AND payment_status <> 'paid' FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'order not payable'; END IF;
  IF COALESCE(o.coins_spent, 0) > 0 THEN RAISE EXCEPTION 'already redeemed'; END IF;

  _wid := public.wallet_ensure(auth.uid());
  IF (SELECT is_frozen FROM public.wallets WHERE id = _wid) THEN RAISE EXCEPTION 'rewards frozen'; END IF;
  SELECT balance INTO _bal FROM public.wallets WHERE id = _wid;

  allowed_pts := floor(GREATEST(COALESCE(_bal, 0), 0)
                       * LEAST(GREATEST(COALESCE(maxpct, 0), 0), 100) / 100)::integer;
  use_pts := LEAST(GREATEST(COALESCE(_points, 0), 0), allowed_pts);
  IF use_pts <= 0 THEN RAISE EXCEPTION 'no points'; END IF;

  value := round(use_pts / rate * 1000);
  IF value > GREATEST(COALESCE(o.total, 0), 0) THEN
    value := GREATEST(COALESCE(o.total, 0), 0);
    use_pts := floor(value * rate / 1000)::integer;
  END IF;
  IF use_pts <= 0 OR value <= 0 THEN RAISE EXCEPTION 'no points'; END IF;

  UPDATE public.wallets SET balance = balance - use_pts WHERE id = _wid RETURNING balance INTO _bal;
  IF _bal < 0 THEN RAISE EXCEPTION 'insufficient points'; END IF;

  INSERT INTO public.wallet_transactions (wallet_id, user_id, kind, amount, balance_after, note, ref_id)
  VALUES (_wid, auth.uid(), 'spend_order', -use_pts, _bal, '', _order_id);

  UPDATE public.orders SET coins_spent = use_pts, coins_discount = value WHERE id = _order_id;
  PERFORM public.recalc_order_money(_order_id);
  RETURN value;
END; $$;

REVOKE ALL ON FUNCTION public.reward_redeem_order(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reward_redeem_order(uuid, integer) TO authenticated;
-- ================================================================
-- 20260822111800_reward_cap_on_points.sql
-- ================================================================
-- Redemption cap now applies to the dentist's POINTS BALANCE (e.g. 50% of points),
-- not to the order total. The money value is still clamped to the order total.
CREATE OR REPLACE FUNCTION public.reward_redeem_order(_order_id uuid, _points integer)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o record; _wid uuid; _bal numeric; rate numeric; maxpct numeric; on_flag boolean;
  value numeric; allowed_pts integer; use_pts integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT rewards_enabled, points_per_1000_iqd, rewards_max_redeem_percent
    INTO on_flag, rate, maxpct FROM public.store_settings LIMIT 1;
  IF NOT COALESCE(on_flag, false) THEN RAISE EXCEPTION 'rewards disabled'; END IF;
  IF COALESCE(rate, 0) <= 0 THEN RAISE EXCEPTION 'rate not set'; END IF;

  SELECT id, total, coins_spent INTO o FROM public.orders
   WHERE id = _order_id AND user_id = auth.uid() AND payment_status <> 'paid' FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'order not payable'; END IF;
  IF COALESCE(o.coins_spent, 0) > 0 THEN RAISE EXCEPTION 'already redeemed'; END IF;

  _wid := public.wallet_ensure(auth.uid());
  IF (SELECT is_frozen FROM public.wallets WHERE id = _wid) THEN RAISE EXCEPTION 'rewards frozen'; END IF;
  SELECT balance INTO _bal FROM public.wallets WHERE id = _wid;

  -- max share of the balance the dentist may spend at once
  allowed_pts := floor(GREATEST(COALESCE(_bal, 0), 0)
                       * LEAST(GREATEST(COALESCE(maxpct, 0), 0), 100) / 100)::integer;
  use_pts := LEAST(GREATEST(COALESCE(_points, 0), 0), allowed_pts);
  IF use_pts <= 0 THEN RAISE EXCEPTION 'no points'; END IF;

  value := round(use_pts / rate * 1000);
  -- never discount more than the order itself
  IF value > GREATEST(COALESCE(o.total, 0), 0) THEN
    value := GREATEST(COALESCE(o.total, 0), 0);
    use_pts := floor(value * rate / 1000)::integer;
  END IF;
  IF use_pts <= 0 OR value <= 0 THEN RAISE EXCEPTION 'no points'; END IF;

  UPDATE public.wallets SET balance = balance - use_pts WHERE id = _wid RETURNING balance INTO _bal;
  IF _bal < 0 THEN RAISE EXCEPTION 'insufficient points'; END IF;

  INSERT INTO public.wallet_transactions (wallet_id, user_id, kind, amount, balance_after, note, ref_id)
  VALUES (_wid, auth.uid(), 'spend_order', -use_pts, _bal, '', _order_id);

  UPDATE public.orders SET coins_spent = use_pts, coins_discount = value WHERE id = _order_id;
  PERFORM public.recalc_order_money(_order_id);
  RETURN value;
END; $$;

REVOKE ALL ON FUNCTION public.reward_redeem_order(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reward_redeem_order(uuid, integer) TO authenticated;

-- ================================================================
-- 20260822113837_6b822dea-6772-4451-b399-2071952c1d22.sql
-- ================================================================
CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _digits text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT regexp_replace(coalesce(p.phone,''), '\D', '', 'g') INTO _digits
  FROM public.profiles p WHERE p.id = auth.uid();
  IF _digits IS NULL OR right(_digits, 10) <> '7701727117' THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END; $$;

REVOKE EXECUTE ON FUNCTION public.claim_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;
-- ================================================================
-- 20260822115236_224dbdda-4fb2-4b5b-a9e6-49ce15335a00.sql
-- ================================================================
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS show_reward_bar boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reward_bar_link text NOT NULL DEFAULT '/rewards',
  ADD COLUMN IF NOT EXISTS show_vendor_join_cta boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS vendor_join_cta_link text NOT NULL DEFAULT '/vendor-signup';

-- Ensure the single settings row has the new defaults if it was inserted before this migration.
UPDATE public.store_settings
SET show_reward_bar = true,
    reward_bar_link = '/rewards',
    show_vendor_join_cta = true,
    vendor_join_cta_link = '/vendor-signup'
WHERE show_reward_bar IS NULL OR reward_bar_link IS NULL OR show_vendor_join_cta IS NULL OR vendor_join_cta_link IS NULL;
-- ================================================================
-- 20260822121157_a8f94483-440f-48c9-a72b-c629c8799520.sql
-- ================================================================
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS reward_bar_items jsonb NOT NULL DEFAULT '[
    {"icon":"coin","ar":"١٠٠٠ نقطة = ١٠٠٠ د.ع","ku":"١٠٠٠ خاڵ = ١٠٠٠ د.ع","en":"1000 points = 1000 IQD"},
    {"icon":"gift","ar":"هدية أول طلب: ٥٠٠٠","ku":"دیاری یەکەم: ٥٠٠٠","en":"First order: 5000 pts"},
    {"icon":"trend","ar":"نقاط مع كل شراء","ku":"خاڵ لە هەر کڕینێک","en":"Points on every buy"},
    {"icon":"star","ar":"نقاط على كل تقييم","ku":"خاڵ بۆ هەر پێداچوونێک","en":"Points for reviews"},
    {"icon":"users","ar":"ادعُ زملاءك واربح","ku":"هاوڕێ بانگ بکە","en":"Invite colleagues"},
    {"icon":"zap","ar":"تحديات شهرية","ku":"چالاکی مانگانە","en":"Monthly challenges"},
    {"icon":"sparkles","ar":"خصم فوري بالنقاط","ku":"داشکاندنی خێرا","en":"Instant checkout discount"},
    {"icon":"gift","ar":"أكمل ملف العيادة","ku":"تەواوکردنی پرۆفایل","en":"Complete profile"}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS reward_bar_cta jsonb NOT NULL DEFAULT '{"ar":"تفاصيل","ku":"وردەکاری","en":"Details"}'::jsonb,
  ADD COLUMN IF NOT EXISTS reward_bar_icon text NOT NULL DEFAULT 'coin',
  ADD COLUMN IF NOT EXISTS vendor_cta jsonb NOT NULL DEFAULT '{
    "icon":"store",
    "title_ar":"عندك متجر؟ سجّل كبائع",
    "title_ku":"فرۆشگات هەیە؟ وەک فرۆشیار تۆمار بکە",
    "title_en":"Own a store? Sell with us",
    "sub_ar":"٣ خطوات فقط — بعد موافقة الإدارة",
    "sub_ku":"تەنها ٣ هەنگاو — دوای ڕەزامەندی بەڕێوەبەر",
    "sub_en":"3 quick steps — after admin approval"
  }'::jsonb;
-- ================================================================
-- 20260822124357_4baa8598-ae14-45e0-9cd3-6aefa9f7cf20.sql
-- ================================================================
CREATE TABLE IF NOT EXISTS public.vendor_shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  city text NOT NULL,
  fee numeric NOT NULL DEFAULT 0,
  free_over numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS vendor_shipping_rates_key
  ON public.vendor_shipping_rates (vendor_id, lower(btrim(city)));

GRANT SELECT ON public.vendor_shipping_rates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_shipping_rates TO authenticated;
GRANT ALL ON public.vendor_shipping_rates TO service_role;

ALTER TABLE public.vendor_shipping_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vsr_public_read ON public.vendor_shipping_rates;
CREATE POLICY vsr_public_read ON public.vendor_shipping_rates
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS vsr_vendor_manage ON public.vendor_shipping_rates;
CREATE POLICY vsr_vendor_manage ON public.vendor_shipping_rates
  FOR ALL TO authenticated
  USING (vendor_id IN (SELECT public.my_vendor_ids()))
  WITH CHECK (vendor_id IN (SELECT public.my_vendor_ids()));

DROP POLICY IF EXISTS vsr_admin_manage ON public.vendor_shipping_rates;
CREATE POLICY vsr_admin_manage ON public.vendor_shipping_rates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS vsr_touch ON public.vendor_shipping_rates;
CREATE TRIGGER vsr_touch BEFORE UPDATE ON public.vendor_shipping_rates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Shipping cost for one vendor in one city, falling back to the vendor's
-- default row ('*') and then to the store-wide delivery settings.
CREATE OR REPLACE FUNCTION public.vendor_shipping_cost(
  _vendor_id uuid, _city text, _vendor_subtotal numeric
) RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record; fee numeric; fover numeric;
BEGIN
  SELECT COALESCE(delivery_fee, 0), COALESCE(free_delivery_over, 0)
    INTO fee, fover FROM public.store_settings LIMIT 1;

  IF _vendor_id IS NOT NULL THEN
    SELECT * INTO r FROM public.vendor_shipping_rates
     WHERE vendor_id = _vendor_id AND is_active
       AND lower(btrim(city)) = lower(btrim(COALESCE(_city, '')))
     LIMIT 1;
    IF r.id IS NULL THEN
      SELECT * INTO r FROM public.vendor_shipping_rates
       WHERE vendor_id = _vendor_id AND is_active AND btrim(city) = '*'
       LIMIT 1;
    END IF;
    IF r.id IS NOT NULL THEN
      fee := COALESCE(r.fee, 0);
      fover := COALESCE(r.free_over, 0);
    END IF;
  END IF;

  IF fover > 0 AND COALESCE(_vendor_subtotal, 0) >= fover THEN
    RETURN 0;
  END IF;
  RETURN GREATEST(0, fee);
END; $$;

CREATE OR REPLACE FUNCTION public.recalc_order_money(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sub numeric := 0; disc numeric := 0; ship numeric := 0; after_disc numeric := 0;
  code text; c record; coin numeric := 0; gross numeric := 0;
  ocity text; free_over numeric := 0; v record; ratio numeric := 1;
BEGIN
  SELECT COALESCE(SUM(unit_price * quantity), 0) INTO sub
  FROM public.order_items WHERE order_id = _order_id;

  SELECT coupon_code, COALESCE(coins_discount, 0), city
    INTO code, coin, ocity
    FROM public.orders WHERE id = _order_id;

  IF code IS NOT NULL AND btrim(code) <> '' THEN
    SELECT * INTO c FROM public.validate_coupon(code, sub) LIMIT 1;
    IF c.code IS NOT NULL THEN
      disc := CASE
        WHEN c.discount_type = 'fixed' THEN LEAST(GREATEST(COALESCE(c.discount_value,0),0), sub)
        ELSE round(sub * LEAST(GREATEST(COALESCE(c.discount_value,0),0), 100) / 100)
      END;
    END IF;
  END IF;

  after_disc := GREATEST(0, sub - disc);
  IF sub > 0 THEN ratio := after_disc / sub; END IF;

  FOR v IN
    SELECT vendor_id, COALESCE(SUM(unit_price * quantity), 0) AS vsub
      FROM public.order_items WHERE order_id = _order_id
     GROUP BY vendor_id
  LOOP
    ship := ship + public.vendor_shipping_cost(v.vendor_id, ocity, round(v.vsub * ratio));
  END LOOP;

  -- A store-wide free-delivery threshold still overrides everything.
  SELECT COALESCE(free_delivery_over, 0) INTO free_over FROM public.store_settings LIMIT 1;
  IF free_over > 0 AND after_disc >= free_over THEN ship := 0; END IF;

  gross := after_disc + round(ship);
  coin := LEAST(GREATEST(coin, 0), gross);

  UPDATE public.orders
     SET subtotal = sub,
         discount = disc + coin,
         total = GREATEST(0, gross - coin)
   WHERE id = _order_id;
END; $$;
-- ================================================================
-- 20260822124422_d8f28407-4914-465f-b14a-d877c2a4f349.sql
-- ================================================================
REVOKE EXECUTE ON FUNCTION public.vendor_shipping_cost(uuid, text, numeric) FROM anon, authenticated;
-- ================================================================
-- 20260822141455_bce07204-dd00-4845-9d18-6f49dc9c06d3.sql
-- ================================================================
CREATE OR REPLACE FUNCTION public.mark_order_paid_on_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_total int;
  n_conf int;
  n_canc int;
BEGIN
  IF NEW.fulfillment_status IN ('confirmed', 'shipped', 'done')
     AND (TG_OP = 'INSERT' OR OLD.fulfillment_status IS DISTINCT FROM NEW.fulfillment_status) THEN
    UPDATE public.orders o
       SET payment_status = 'paid',
           paid_at = COALESCE(o.paid_at, now())
     WHERE o.id = NEW.order_id
       AND o.payment_status <> 'paid';
  END IF;

  -- reflect vendor decisions on the customer-facing order status
  SELECT count(*),
         count(*) FILTER (WHERE fulfillment_status IN ('confirmed','shipped','done')),
         count(*) FILTER (WHERE fulfillment_status = 'cancelled')
    INTO n_total, n_conf, n_canc
    FROM public.order_items
   WHERE order_id = NEW.order_id;

  IF n_total > 0 AND n_canc = n_total THEN
    UPDATE public.orders SET status = 'cancelled'
     WHERE id = NEW.order_id AND status <> 'cancelled';
  ELSIF n_total > 0 AND n_conf > 0 AND (n_conf + n_canc) = n_total THEN
    UPDATE public.orders SET status = 'confirmed'
     WHERE id = NEW.order_id AND status = 'new';
  END IF;

  RETURN NEW;
END;
$$;

-- backfill existing orders whose vendor decisions were already made
UPDATE public.orders o
   SET status = 'confirmed'
 WHERE o.status = 'new'
   AND EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id AND i.fulfillment_status IN ('confirmed','shipped','done'))
   AND NOT EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id AND i.fulfillment_status NOT IN ('confirmed','shipped','done','cancelled'));

UPDATE public.orders o
   SET status = 'cancelled'
 WHERE o.status <> 'cancelled'
   AND EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id)
   AND NOT EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id AND i.fulfillment_status <> 'cancelled');
-- ================================================================
-- 20260822142846_ea59e563-0552-4301-bc90-a939b09fb878.sql
-- ================================================================
CREATE OR REPLACE FUNCTION public.admin_reset_data(_scope text DEFAULT 'sales')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _kept_users int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _scope NOT IN ('sales', 'all') THEN
    RAISE EXCEPTION 'Invalid scope';
  END IF;

  -- transactional data
  DELETE FROM public.vendor_reward_points;
  DELETE FROM public.notifications;
  DELETE FROM public.product_reviews;
  DELETE FROM public.order_items;
  DELETE FROM public.orders;
  DELETE FROM public.wallet_card_redemptions;
  DELETE FROM public.wallet_transactions;
  DELETE FROM public.wallets;
  DELETE FROM public.wallet_cards;
  DELETE FROM public.addresses;

  IF _scope = 'all' THEN
    DELETE FROM public.offer_products;
    DELETE FROM public.flash_deals;
    DELETE FROM public.offers;
    DELETE FROM public.bundles;
    DELETE FROM public.banners;
    DELETE FROM public.coupons;
    DELETE FROM public.brand_cards;
    DELETE FROM public.product_tiers;
    DELETE FROM public.products;
    DELETE FROM public.catalog_items;
    DELETE FROM public.vendor_charges;
    DELETE FROM public.vendor_settlements;
    DELETE FROM public.vendor_shipping_rates;
    DELETE FROM public.vendor_members;
    DELETE FROM public.vendor_applications;
    DELETE FROM public.vendors;

    DELETE FROM public.user_roles
    WHERE role <> 'admin'
      AND NOT public.has_role(user_id, 'admin');

    DELETE FROM public.profiles
    WHERE NOT public.has_role(id, 'admin');
  END IF;

  SELECT count(*) INTO _kept_users FROM public.profiles;

  RETURN jsonb_build_object('ok', true, 'scope', _scope, 'kept_profiles', _kept_users);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_data(text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_reset_data(text) TO authenticated;
-- ================================================================
-- 20260822144418_605f64ee-0893-431a-80fe-c46086882ea4.sql
-- ================================================================
CREATE INDEX IF NOT EXISTS products_active_created_idx ON public.products (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS products_vendor_idx ON public.products (vendor_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products (category_id);
CREATE INDEX IF NOT EXISTS products_catalog_item_idx ON public.products (catalog_item_id);
CREATE INDEX IF NOT EXISTS vendors_active_name_idx ON public.vendors (is_active, name);
CREATE INDEX IF NOT EXISTS offer_products_offer_idx ON public.offer_products (offer_id);
CREATE INDEX IF NOT EXISTS offer_products_product_idx ON public.offer_products (product_id);
CREATE INDEX IF NOT EXISTS product_tiers_product_idx ON public.product_tiers (product_id, min_qty);
CREATE INDEX IF NOT EXISTS banners_slot_active_idx ON public.banners (slot_key, is_active, sort_order);
CREATE INDEX IF NOT EXISTS flash_deals_active_idx ON public.flash_deals (is_active, priority DESC);
CREATE INDEX IF NOT EXISTS bundles_active_sort_idx ON public.bundles (is_active, sort_order);
ANALYZE public.products;
ANALYZE public.vendors;
-- ================================================================
-- 20260822145117_df31e3f4-b2ee-4b7b-85f0-69e88d168109.sql
-- ================================================================
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS cost_usd_per_credit numeric NOT NULL DEFAULT 0.015,
  ADD COLUMN IF NOT EXISTS cost_subscription_usd numeric NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS cost_fixed_credits numeric NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS cost_credits_per_order numeric NOT NULL DEFAULT 0.9,
  ADD COLUMN IF NOT EXISTS cost_credits_per_vendor numeric NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS cost_credits_per_dentist numeric NOT NULL DEFAULT 0.4,
  ADD COLUMN IF NOT EXISTS cost_usd_iqd_rate numeric NOT NULL DEFAULT 1320;
-- ================================================================
-- 20260823110645_09872224-05c8-43c6-9276-ae9db4f2adc6.sql
-- ================================================================
CREATE TABLE IF NOT EXISTS public.design_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  published jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.design_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.design_settings TO authenticated;
GRANT ALL ON public.design_settings TO service_role;

ALTER TABLE public.design_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS design_settings_read ON public.design_settings;
CREATE POLICY design_settings_read ON public.design_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS design_settings_admin_insert ON public.design_settings;
CREATE POLICY design_settings_admin_insert ON public.design_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS design_settings_admin_update ON public.design_settings;
CREATE POLICY design_settings_admin_update ON public.design_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.design_settings_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS design_settings_updated_at ON public.design_settings;
CREATE TRIGGER design_settings_updated_at BEFORE UPDATE ON public.design_settings
  FOR EACH ROW EXECUTE FUNCTION public.design_settings_touch();

INSERT INTO public.design_settings (draft, published)
SELECT '{}'::jsonb, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.design_settings);
-- ================================================================
-- 20260823113157_cb1141a1-bbaf-49c9-ac06-a81ffdb2e2d9.sql
-- ================================================================
CREATE TABLE public.page_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page text NOT NULL,
  kind text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.page_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_blocks TO authenticated;
GRANT ALL ON public.page_blocks TO service_role;

ALTER TABLE public.page_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_blocks_public_read" ON public.page_blocks
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "page_blocks_admin_write" ON public.page_blocks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX page_blocks_page_sort_idx ON public.page_blocks (page, sort_order);

CREATE OR REPLACE FUNCTION public.page_blocks_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER page_blocks_touch BEFORE UPDATE ON public.page_blocks
  FOR EACH ROW EXECUTE FUNCTION public.page_blocks_touch();

INSERT INTO public.page_blocks (page, kind, sort_order, config) VALUES
  ('home', 'section', 10, '{"section":"banners"}'),
  ('home', 'section', 20, '{"section":"categories"}'),
  ('home', 'section', 30, '{"section":"hero"}'),
  ('home', 'section', 40, '{"section":"usp"}'),
  ('home', 'section', 50, '{"section":"banner_slot","slot":"home_below_hero"}'),
  ('home', 'section', 60, '{"section":"expiring"}'),
  ('home', 'section', 70, '{"section":"outlet"}'),
  ('home', 'section', 80, '{"section":"offers"}'),
  ('home', 'section', 90, '{"section":"banner_slot","slot":"home_mid"}'),
  ('home', 'section', 100, '{"section":"bundles"}'),
  ('home', 'section', 110, '{"section":"brands"}'),
  ('home', 'section', 120, '{"section":"featured"}'),
  ('home', 'section', 130, '{"section":"newest"}'),
  ('home', 'section', 140, '{"section":"vendor_rail"}'),
  ('home', 'section', 150, '{"section":"how_it_works"}'),
  ('home', 'section', 160, '{"section":"help_cta"}'),
  ('home', 'section', 170, '{"section":"banner_slot","slot":"home_footer"}');
-- ================================================================
-- 20260823122353_a43e6b7f-5413-4fe8-ba48-d3e6d1473699.sql
-- ================================================================
CREATE TABLE public.page_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page text NOT NULL UNIQUE,
  draft jsonb NOT NULL DEFAULT '{"version":1,"modules":[]}'::jsonb,
  published jsonb NOT NULL DEFAULT '{"version":1,"modules":[]}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

GRANT SELECT ON public.page_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_documents TO authenticated;
GRANT ALL ON public.page_documents TO service_role;

ALTER TABLE public.page_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_documents_public_read"
ON public.page_documents
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "page_documents_admin_write"
ON public.page_documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX page_documents_page_idx ON public.page_documents (page);

CREATE TRIGGER page_documents_touch
BEFORE UPDATE ON public.page_documents
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
-- ================================================================
-- 20260823124346_266ac9b5-ac25-4939-a6fd-7a215dc783c7.sql
-- ================================================================
with cleaned as (
  select pd.id,
         jsonb_agg(e order by ord) as mods
  from page_documents pd,
       lateral jsonb_array_elements(pd.draft->'modules') with ordinality as t(e, ord)
  where pd.page = 'home'
    and not (e->>'id' like 'legacy-%' and e->'block'->>'kind' = 'section')
  group by pd.id
)
update page_documents pd
set draft = jsonb_set(pd.draft, '{modules}', c.mods),
    published = case when pd.published ? 'modules' then jsonb_set(pd.published, '{modules}', c.mods) else pd.published end
from cleaned c
where pd.id = c.id;
-- ================================================================
-- 20260823144144_ef9a8805-f061-45a1-b694-0af1ed520deb.sql
-- ================================================================
CREATE TABLE IF NOT EXISTS public.badge_fees (
  badge_key text PRIMARY KEY,
  is_paid boolean NOT NULL DEFAULT true,
  price numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.badge_fees TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badge_fees TO authenticated;
GRANT ALL ON public.badge_fees TO service_role;

ALTER TABLE public.badge_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS badge_fees_read ON public.badge_fees;
CREATE POLICY badge_fees_read ON public.badge_fees FOR SELECT USING (true);

DROP POLICY IF EXISTS badge_fees_admin ON public.badge_fees;
CREATE POLICY badge_fees_admin ON public.badge_fees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.badge_fees (badge_key, is_paid, price, sort_order) VALUES
  ('discount', false, 0, 1),
  ('premium', true, 0, 2),
  ('hot', true, 0, 3),
  ('special', true, 0, 4),
  ('new', false, 0, 5),
  ('bestseller', true, 0, 6),
  ('freeship', false, 0, 7),
  ('limited', false, 0, 8),
  ('gift', true, 0, 9),
  ('trending', true, 0, 10)
ON CONFLICT (badge_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.badge_fee(_key text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN f.badge_key IS NULL THEN public.marketing_price('badge')
    WHEN f.is_paid IS NOT TRUE THEN 0
    WHEN COALESCE(f.price, 0) > 0 THEN f.price
    ELSE public.marketing_price('badge')
  END
  FROM (SELECT 1) x
  LEFT JOIN public.badge_fees f ON f.badge_key = _key
$$;

REVOKE ALL ON FUNCTION public.badge_fee(text) FROM anon, authenticated;

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
  FOREACH b IN ARRAY COALESCE(NEW.badges, '{}'::text[]) LOOP
    IF NOT (b = ANY (old_badges)) THEN
      amt := public.badge_fee(b);
      IF COALESCE(amt, 0) > 0 THEN
        INSERT INTO public.vendor_charges (vendor_id, kind, ref_id, label, amount)
        VALUES (NEW.vendor_id, 'badge', NEW.id, b, amt);
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.charge_product_badges() FROM anon, authenticated;
-- ================================================================
-- 20260823151644_af028762-58d9-47c0-9fc6-635a6996abca.sql
-- ================================================================
-- 1) Freeze the month an order line belongs to (acceptance date)
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.stamp_order_item_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.fulfillment_status = 'confirmed' AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at := now();
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.stamp_order_item_accepted() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS order_items_stamp_accepted ON public.order_items;
CREATE TRIGGER order_items_stamp_accepted BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.stamp_order_item_accepted();

UPDATE public.order_items i
SET accepted_at = COALESCE(o.paid_at, o.updated_at, o.created_at)
FROM public.orders o
WHERE o.id = i.order_id
  AND i.fulfillment_status = 'confirmed'
  AND i.accepted_at IS NULL;

-- 2) Statement record: reward sponsorship, partial payments, closing
ALTER TABLE public.vendor_settlements
  ADD COLUMN IF NOT EXISTS rewards_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;

-- 3) One shared statement calculation for admin + vendor
CREATE OR REPLACE FUNCTION public.vendor_statement(_vendor_id uuid, _period text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sales numeric := 0;
  _units numeric := 0;
  _commission numeric := 0;
  _marketing numeric := 0;
  _marketing_paid numeric := 0;
  _rewards numeric := 0;
  _rewards_paid numeric := 0;
  _orders jsonb := '[]'::jsonb;
  _charges jsonb := '[]'::jsonb;
  _st public.vendor_settlements;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR _vendor_id IN (SELECT public.my_vendor_ids())
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT
    COALESCE(SUM(i.unit_price * i.quantity), 0),
    COALESCE(SUM(i.quantity), 0),
    COALESCE(SUM(i.commission_amount), 0)
  INTO _sales, _units, _commission
  FROM public.order_items i
  JOIN public.orders o ON o.id = i.order_id
  WHERE i.vendor_id = _vendor_id
    AND i.fulfillment_status = 'confirmed'
    AND o.status <> 'cancelled'
    AND (_period = 'all' OR to_char(COALESCE(i.accepted_at, o.created_at), 'YYYY-MM-DD') LIKE _period || '%');

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'date' DESC), '[]'::jsonb) INTO _orders
  FROM (
    SELECT jsonb_build_object(
      'order_no', o.order_no,
      'order_id', o.id,
      'customer', o.customer_name,
      'date', COALESCE(i.accepted_at, o.created_at),
      'units', SUM(i.quantity),
      'sales', SUM(i.unit_price * i.quantity),
      'commission', SUM(i.commission_amount)
    ) AS x
    FROM public.order_items i
    JOIN public.orders o ON o.id = i.order_id
    WHERE i.vendor_id = _vendor_id
      AND i.fulfillment_status = 'confirmed'
      AND o.status <> 'cancelled'
      AND (_period = 'all' OR to_char(COALESCE(i.accepted_at, o.created_at), 'YYYY-MM-DD') LIKE _period || '%')
    GROUP BY o.id, o.order_no, o.customer_name, COALESCE(i.accepted_at, o.created_at)
  ) s;

  SELECT
    COALESCE(SUM(CASE WHEN c.kind <> 'reward_points' THEN c.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN c.kind <> 'reward_points' AND c.status = 'paid' THEN c.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN c.kind = 'reward_points' THEN c.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN c.kind = 'reward_points' AND c.status = 'paid' THEN c.amount ELSE 0 END), 0)
  INTO _marketing, _marketing_paid, _rewards, _rewards_paid
  FROM public.vendor_charges c
  WHERE c.vendor_id = _vendor_id
    AND (_period = 'all' OR to_char(c.created_at, 'YYYY-MM-DD') LIKE _period || '%');

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'kind', c.kind,
      'label', c.label,
      'amount', c.amount,
      'status', c.status,
      'created_at', c.created_at
    ) ORDER BY c.created_at DESC), '[]'::jsonb) INTO _charges
  FROM public.vendor_charges c
  WHERE c.vendor_id = _vendor_id
    AND (_period = 'all' OR to_char(c.created_at, 'YYYY-MM-DD') LIKE _period || '%');

  SELECT * INTO _st FROM public.vendor_settlements
  WHERE vendor_id = _vendor_id AND period = _period LIMIT 1;

  RETURN jsonb_build_object(
    'vendor_id', _vendor_id,
    'period', _period,
    'sales', _sales,
    'units', _units,
    'commission', _commission,
    'marketing', _marketing,
    'marketing_paid', _marketing_paid,
    'rewards', _rewards,
    'rewards_paid', _rewards_paid,
    'payout', _sales - _commission - _marketing - _rewards,
    'store_income', _commission + _marketing + _rewards,
    'orders', _orders,
    'charges', _charges,
    'status', COALESCE(_st.status, 'unpaid'),
    'paid_amount', COALESCE(_st.paid_amount, 0),
    'paid_at', _st.paid_at,
    'closed_at', _st.closed_at,
    'note', COALESCE(_st.note, '')
  );
END; $$;

REVOKE ALL ON FUNCTION public.vendor_statement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vendor_statement(uuid, text) TO authenticated;

CREATE INDEX IF NOT EXISTS order_items_vendor_accepted_idx
  ON public.order_items (vendor_id, accepted_at);
-- ================================================================
-- 20260823151730_57a9e319-7b28-44a7-99fd-bf7ef4297f55.sql
-- ================================================================
CREATE OR REPLACE FUNCTION public.vendor_statements(_period text)
RETURNS TABLE (
  vendor_id uuid,
  vendor_name text,
  sales numeric,
  units numeric,
  commission numeric,
  marketing numeric,
  rewards numeric,
  payout numeric,
  store_income numeric,
  status text,
  paid_amount numeric,
  paid_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH s AS (
    SELECT i.vendor_id AS vid,
           COALESCE(SUM(i.unit_price * i.quantity), 0) AS sales,
           COALESCE(SUM(i.quantity), 0) AS units,
           COALESCE(SUM(i.commission_amount), 0) AS commission
    FROM public.order_items i
    JOIN public.orders o ON o.id = i.order_id
    WHERE i.vendor_id IS NOT NULL
      AND i.fulfillment_status = 'confirmed'
      AND o.status <> 'cancelled'
      AND (_period = 'all' OR to_char(COALESCE(i.accepted_at, o.created_at), 'YYYY-MM-DD') LIKE _period || '%')
    GROUP BY i.vendor_id
  ), c AS (
    SELECT vc.vendor_id AS vid,
           COALESCE(SUM(CASE WHEN vc.kind <> 'reward_points' THEN vc.amount ELSE 0 END), 0) AS marketing,
           COALESCE(SUM(CASE WHEN vc.kind = 'reward_points' THEN vc.amount ELSE 0 END), 0) AS rewards
    FROM public.vendor_charges vc
    WHERE (_period = 'all' OR to_char(vc.created_at, 'YYYY-MM-DD') LIKE _period || '%')
    GROUP BY vc.vendor_id
  )
  SELECT v.id,
         v.name,
         COALESCE(s.sales, 0),
         COALESCE(s.units, 0),
         COALESCE(s.commission, 0),
         COALESCE(c.marketing, 0),
         COALESCE(c.rewards, 0),
         COALESCE(s.sales, 0) - COALESCE(s.commission, 0) - COALESCE(c.marketing, 0) - COALESCE(c.rewards, 0),
         COALESCE(s.commission, 0) + COALESCE(c.marketing, 0) + COALESCE(c.rewards, 0),
         COALESCE(st.status, 'unpaid'),
         COALESCE(st.paid_amount, 0),
         st.paid_at
  FROM public.vendors v
  LEFT JOIN s ON s.vid = v.id
  LEFT JOIN c ON c.vid = v.id
  LEFT JOIN public.vendor_settlements st ON st.vendor_id = v.id AND st.period = _period
  WHERE COALESCE(s.sales, 0) > 0
     OR COALESCE(c.marketing, 0) > 0
     OR COALESCE(c.rewards, 0) > 0
     OR st.id IS NOT NULL
  ORDER BY COALESCE(s.sales, 0) DESC;
END; $$;

REVOKE ALL ON FUNCTION public.vendor_statements(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vendor_statements(text) TO authenticated;
-- ================================================================
-- 20260823154052_a85f8c9d-4524-403b-bd1b-728d408673c8.sql
-- ================================================================
CREATE OR REPLACE FUNCTION public.vendor_statements(_period text)
 RETURNS TABLE(vendor_id uuid, vendor_name text, sales numeric, units numeric, commission numeric, marketing numeric, rewards numeric, payout numeric, store_income numeric, status text, paid_amount numeric, paid_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH s AS (
    SELECT i.vendor_id AS vid,
           COALESCE(SUM(i.unit_price * i.quantity), 0)::numeric AS sales,
           COALESCE(SUM(i.quantity), 0)::numeric AS units,
           COALESCE(SUM(i.commission_amount), 0)::numeric AS commission
    FROM public.order_items i
    JOIN public.orders o ON o.id = i.order_id
    WHERE i.vendor_id IS NOT NULL
      AND i.fulfillment_status = 'confirmed'
      AND o.status <> 'cancelled'
      AND (_period = 'all' OR to_char(COALESCE(i.accepted_at, o.created_at), 'YYYY-MM-DD') LIKE _period || '%')
    GROUP BY i.vendor_id
  ), c AS (
    SELECT vc.vendor_id AS vid,
           COALESCE(SUM(CASE WHEN vc.kind <> 'reward_points' THEN vc.amount ELSE 0 END), 0)::numeric AS marketing,
           COALESCE(SUM(CASE WHEN vc.kind = 'reward_points' THEN vc.amount ELSE 0 END), 0)::numeric AS rewards
    FROM public.vendor_charges vc
    WHERE (_period = 'all' OR to_char(vc.created_at, 'YYYY-MM-DD') LIKE _period || '%')
    GROUP BY vc.vendor_id
  )
  SELECT v.id,
         v.name::text,
         COALESCE(s.sales, 0)::numeric,
         COALESCE(s.units, 0)::numeric,
         COALESCE(s.commission, 0)::numeric,
         COALESCE(c.marketing, 0)::numeric,
         COALESCE(c.rewards, 0)::numeric,
         (COALESCE(s.sales, 0) - COALESCE(s.commission, 0) - COALESCE(c.marketing, 0) - COALESCE(c.rewards, 0))::numeric,
         (COALESCE(s.commission, 0) + COALESCE(c.marketing, 0) + COALESCE(c.rewards, 0))::numeric,
         COALESCE(st.status, 'unpaid')::text,
         COALESCE(st.paid_amount, 0)::numeric,
         st.paid_at
  FROM public.vendors v
  LEFT JOIN s ON s.vid = v.id
  LEFT JOIN c ON c.vid = v.id
  LEFT JOIN public.vendor_settlements st ON st.vendor_id = v.id AND st.period = _period
  WHERE COALESCE(s.sales, 0) > 0
     OR COALESCE(c.marketing, 0) > 0
     OR COALESCE(c.rewards, 0) > 0
     OR st.id IS NOT NULL
  ORDER BY COALESCE(s.sales, 0) DESC;
END; $function$;
-- ================================================================
-- 20260823154433_a74c3df4-ae47-4598-8feb-eed17fab876f.sql
-- ================================================================
ALTER TABLE public.vendor_settlements DROP CONSTRAINT vendor_settlements_status_check;
ALTER TABLE public.vendor_settlements ADD CONSTRAINT vendor_settlements_status_check CHECK (status = ANY (ARRAY['paid'::text, 'partly_paid'::text, 'unpaid'::text]));
-- ================================================================
-- 20260823172144_35e610d7-efaf-4009-a57b-683c94b6272a.sql
-- ================================================================
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_own_select" ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "push_own_insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_own_update" ON public.push_subscriptions FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "push_own_delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());
-- ================================================================
-- 20260823172227_eb58b527-4e33-412a-a830-8841e66f109d.sql
-- ================================================================
create or replace function public.push_targets(_audience text, _vendor_id uuid default null)
returns table (endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;

  return query
  select s.endpoint, s.p256dh, s.auth
  from public.push_subscriptions s
  join auth.users u on u.id = s.user_id
  where case _audience
    when 'all' then true
    when 'admins' then public.has_role(u.id, 'admin')
    when 'vendors' then exists (select 1 from public.vendor_members m where m.user_id = u.id)
    when 'dentists' then public.can_order(u.id)
    when 'vendor' then exists (
      select 1 from public.vendor_members m
      where m.user_id = u.id and m.vendor_id = _vendor_id
    )
    else false
  end;
end;
$$;

revoke all on function public.push_targets(text, uuid) from public;
revoke all on function public.push_targets(text, uuid) from anon;
grant execute on function public.push_targets(text, uuid) to authenticated;

create or replace function public.push_targets_self()
returns table (endpoint text, p256dh text, auth text)
language sql
stable
security invoker
set search_path = public
as $$
  select s.endpoint, s.p256dh, s.auth
  from public.push_subscriptions s
  where s.user_id = auth.uid();
$$;

revoke all on function public.push_targets_self() from public;
revoke all on function public.push_targets_self() from anon;
grant execute on function public.push_targets_self() to authenticated;

create or replace function public.push_subscription_prune(_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = _endpoint;
$$;

revoke all on function public.push_subscription_prune(text) from public;
revoke all on function public.push_subscription_prune(text) from anon;
grant execute on function public.push_subscription_prune(text) to authenticated;
-- ================================================================
-- 20260823172259_01791d3a-e3b0-4761-98ed-9e5ad39ca5e6.sql
-- ================================================================
alter table public.push_subscriptions add column if not exists lang text not null default 'ar';

drop function if exists public.push_targets(text, uuid);
drop function if exists public.push_targets_self();

create function public.push_targets(_audience text, _vendor_id uuid default null)
returns table (endpoint text, p256dh text, auth text, lang text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;

  return query
  select s.endpoint, s.p256dh, s.auth, s.lang
  from public.push_subscriptions s
  join auth.users u on u.id = s.user_id
  where case _audience
    when 'all' then true
    when 'admins' then public.has_role(u.id, 'admin')
    when 'vendors' then exists (select 1 from public.vendor_members m where m.user_id = u.id)
    when 'dentists' then public.can_order(u.id)
    when 'vendor' then exists (
      select 1 from public.vendor_members m
      where m.user_id = u.id and m.vendor_id = _vendor_id
    )
    else false
  end;
end;
$$;

revoke all on function public.push_targets(text, uuid) from public;
revoke all on function public.push_targets(text, uuid) from anon;
grant execute on function public.push_targets(text, uuid) to authenticated;

create function public.push_targets_self()
returns table (endpoint text, p256dh text, auth text, lang text)
language sql
stable
security invoker
set search_path = public
as $$
  select s.endpoint, s.p256dh, s.auth, s.lang
  from public.push_subscriptions s
  where s.user_id = auth.uid();
$$;

revoke all on function public.push_targets_self() from public;
revoke all on function public.push_targets_self() from anon;
grant execute on function public.push_targets_self() to authenticated;
