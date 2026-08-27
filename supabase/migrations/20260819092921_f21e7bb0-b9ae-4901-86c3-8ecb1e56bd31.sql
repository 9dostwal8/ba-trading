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