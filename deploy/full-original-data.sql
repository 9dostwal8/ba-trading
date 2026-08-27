-- =========================================================================
-- BA TRADING — COMPLETE ORIGINAL CATALOG & SEED DATA (Ready to Run)
-- =========================================================================

-- 1. STORE SETTINGS
INSERT INTO public.store_settings (
  singleton, primary_hue, primary_chroma, accent_hue, accent_chroma, radius_px, show_search
)
VALUES (true, 210, 0.18, 350, 0.16, 14, true)
ON CONFLICT (singleton) DO NOTHING;

-- 2. CATEGORIES
INSERT INTO public.categories (slug, name_ar, name_ku, sort_order, is_active, icon, hue, chroma) VALUES
  ('instruments', 'أدوات الأسنان', 'ئامێرەکانی ددان', 1, true, 'layers', 190, 0.18),
  ('materials', 'المواد الترميمية', 'ماددەی چاککردنەوە', 2, true, 'package', 160, 0.18),
  ('orthodontics', 'تقويم الأسنان', 'ڕێکخستنی ددان', 3, true, 'sparkles', 210, 0.18),
  ('disposables', 'المستلزمات المستهلكة', 'پێداویستی بەکارهاتوو', 4, true, 'boxes', 340, 0.18),
  ('equipment', 'الأجهزة والمعدات', 'ئامێر و کەلوپەل', 5, true, 'shield-check', 280, 0.18)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_ku = EXCLUDED.name_ku,
  sort_order = EXCLUDED.sort_order;

-- 3. BANNERS
DELETE FROM public.banners WHERE slot_key = 'home_hero';
INSERT INTO public.banners (slot_key, title_ar, title_ku, subtitle_ar, subtitle_ku, image_url, sort_order, is_active)
VALUES
  ('home_hero', 'عروض الموسم لمستلزمات طب الأسنان', 'ئۆفەری وەرزی بۆ کەرەستەی پزیشکی ددان', 'خصومات تصل إلى 35% على الماركات العالمية', 'داشکاندن هەتا 35% لەسەر براندە جیهانییەکان', '/images/banner-dental-1.jpg', 1, true),
  ('home_hero', 'تجهيزات العيادات المتكاملة', 'ئامادەکردنی تەواوی کلینیک', 'أحدث الأجهزة بضمان رسمي وخدمة ما بعد البيع', 'نوێترین ئامێر بە گەرەنتی و خزمەتگوزاری', '/images/banner-dental-2.jpg', 2, true),
  ('home_hero', 'تخفيضات الحشوات والمواد الاستهلاكية', 'داشکاندنی کەرەستەی پڕکردنەوە', 'أسعار جملة خاصة للمراكز والعيادات', 'نرخی کۆی تایبەت بۆ سەنتەر و کلینیکەکان', '/images/banner-dental-3.jpg', 3, true);

-- 4. BRAND CARDS
INSERT INTO public.brand_cards (name, mark, match_key, logo_domain, hue, chroma, sort_order, is_active) VALUES
  ('3M', '3M', '3m', '3m.com', 25, 0.21, 1, true),
  ('GC', 'GC', 'gc', 'gc.dental', 15, 0.20, 2, true),
  ('Tokuyama', 'TK', 'tokuyama', 'tokuyama-dental.com', 340, 0.17, 3, true),
  ('BISCO', 'BS', 'bisco', 'bisco.com', 250, 0.18, 4, true),
  ('Eighteeth', '8T', 'eighteeth', 'eighteeth.com', 275, 0.18, 5, true),
  ('Dentsply Sirona', 'DS', 'dentsply', 'dentsplysirona.com', 155, 0.14, 6, true),
  ('Woodpecker', 'WP', 'woodpecker', 'woodpeckerdental.com', 50, 0.16, 7, true),
  ('Septodont', 'SP', 'septodont', 'septodont.com', 10, 0.19, 8, true)
ON CONFLICT DO NOTHING;

-- 5. PRODUCTS (Full Original Catalog with correct clearance_kind default)
DELETE FROM public.products;

INSERT INTO public.products (category_id, name_ar, name_ku, description_ar, description_ku, brand, sku, price, compare_price, stock, image_url, is_featured, is_active, clearance_kind, expiry_date)
SELECT c.id, p.na, p.nk, p.da, p.dk, p.br, p.sku, p.price, p.cmp, p.stock, p.img, p.feat, true, p.ckind, p.exp
FROM (VALUES
 ('materials','كومبوزيت ضوئي Filtek Z350 XT','کۆمپۆزیتی ڕووناکی Filtek Z350 XT','حشوة نانو ضوئية عالية الجودة لترميم الأسنان الأمامية والخلفية','پرکردنەوەی نانۆ ڕووناکی کوالیتی بەرز بۆ ددانەکانی پێشەوە و دواوە','3M ESPE','3M-Z350',42000,55000,60,'/images/p-composite.jpg',true,'none',null),
 ('equipment','جهاز تعقيم أوتوكلاف 18 لتر كلاس B','ئامێری دەرمانکردن ئۆتۆکلاڤ ١٨ لیتر','تعقيم سريع وآمن مع شاشة ديجيتال ونظام تجفيف هوائي','دەرمانکردنی خێرا و سەلامەت بە شاشەی دیجیتاڵ','Woodpecker','WP-18B',1450000,1800000,6,'/images/p-autoclave.jpg',true,'none',null),
 ('equipment','جهاز تصليب الحشوات الضوئي اللاسلكي LED','ڕووناکی توندکردنی LED بێ وایەر','بطارية طويلة الأمد مع قوة تصليب 2000mW','باتریی دوورخایەن بە هێزی ٢٠٠٠ مێگاوات','Eighteeth','ET-LED',115000,150000,20,'/images/p-curing-light.jpg',true,'none',null),
 ('instruments','طقم أدوات فحص الأسنان ستانلس ستيل','سێتی ئامێری پشکنینی ددان','طقم ستانلس ستيل 5 قطع مقاوم للصدأ والتعقيم المتكرر','سێتی ستەینلێس ستیل ٥ پارچە بۆ پشکنین','BA Dental','INST-101',25000,35000,50,'/images/p-instruments-set.jpg',true,'none',null),
 ('materials','أسمنت زجاجي Fuji II LC لاصق','سیمانی شووشەیی Fuji II LC','لاصق وحشوة زجاجية للأطفال وترميمات العنق','لکێنەر و پڕکەرەوەی شووشەیی بۆ منداڵان','GC Dental','GC-FUJI',48000,60000,35,'/images/p-cement.jpg',true,'near_expiry', now() + interval '4 months'),
 ('orthodontics','حاصرات تقويم معدنية Mini Roth 0.22','براکێتی مەتەلی ڕێکخستن','طقم كامل 20 حاصرة عالية الجودة والدقة','سێتی تەواو ٢٠ براکێت بۆ تەقویم','Dentaurum','ORTHO-MR',35000,45000,40,'/images/p-ortho.jpg',false,'none',null),
 ('orthodontics','أسلاك تقويم NiTi فائقة المرونة','وایەری تەقویمی NiTi','مرونة عالية وثباتية للقوس التقويمي','نەرمی بەرز بۆ تەقویم','OrthoLine','OL-3002',22000,30000,80,'/images/p-ortho.jpg',false,'none',null),
 ('instruments','كلابات قلع الأسنان ألماني ستانلس ستيل','مقاشی نەشتەرگەری و کێشان','مجموعة متكاملة مصممة لراحة الطبيب والقبضة المحكمة','کۆمەڵەی کەلبەتەی کێشان بە دیزاینی ئەرگونۆمیک','BA Dental','DP-1002',65000,85000,25,'/images/p-forceps.jpg',false,'none',null),
 ('disposables','قفازات فحص طبية نيتريل (100 قطعة)','دەستکێشی نایترایل (١٠٠ دانە)','خالية من البودرة ومقاومة للتمزق','بێ پۆدرە و بەهێز بۆ ڕۆژانە','SafeHand','SH-4001',14000,18000,150,'/images/p-gloves.jpg',true,'none',null),
 ('disposables','كمامات طبية ثلاث طبقات بفلتر (50 قطعة)','ماسکی پزیشکی (٥٠ دانە)','ثلاث طبقات لحماية فائقة ومريحة للتنفس','سێ چین بۆ پاراستنی ڕۆژانە','SafeHand','SH-4002',6000,9000,250,'/images/p-masks.jpg',false,'outlet', null)
) AS p(cslug,na,nk,da,dk,br,sku,price,cmp,stock,img,feat,ckind,exp)
JOIN public.categories c ON c.slug = p.cslug;

-- 6. HOME SECTIONS
DELETE FROM public.home_sections;
INSERT INTO public.home_sections (kind, title_ar, title_ku, layout, item_limit, hue, chroma, show_title, sort_order, is_active) VALUES
  ('banners', 'الإعلانات الرئيسية', 'ڕیکلامە سەرەکییەکان', 'hero', 3, 210, 0.18, false, 1, true),
  ('categories', 'أقسام المتجر', 'بەشەکانی فرۆشگا', 'scroll', 6, 210, 0.18, true, 2, true),
  ('hero', 'صفقة اليوم السريعة', 'ماملەی ئەمڕۆ', 'grid', 4, 350, 0.18, true, 3, true),
  ('expiring', 'تخفيضات قرب الانتهاء', 'نزیک بەسەرچوون', 'grid', 4, 30, 0.18, true, 4, true),
  ('bundles', 'باقات التوفير المتكاملة', 'پاکێجی خەسڵەتدار', 'grid', 4, 150, 0.14, true, 5, true),
  ('featured', 'الأكثر مبيعاً وطلباً', 'زۆرترین فرۆشتن', 'grid', 8, 210, 0.18, true, 6, true),
  ('brands', 'الماركات العالمية المعتمدة', 'براندە جیهانییە باوەڕپێکراوەکان', 'grid', 8, 210, 0.18, true, 7, true);

-- 7. FLASH DEALS
DELETE FROM public.flash_deals;
INSERT INTO public.flash_deals (title_ar, title_ku, subtitle_ar, subtitle_ku, badge_ar, badge_ku, product_id, image_url, discount_type, discount_value, ends_at, hue, chroma, sort_order, is_active)
SELECT 
  'صفقة سريعة: ' || p.name_ar, 
  'داشکاندنی خێرا: ' || p.name_ku,
  'كمية محدودة جداً — اطلب قبل انتهاء الوقت', 
  'بڕی زۆر سنووردار — پێش تەواوبوون داوا بکە',
  'خصم 25%', '٢٥% داشکاندن', 
  p.id, p.image_url, 'percent', 25, now() + interval '3 days', 350, 0.18, 1, true
FROM public.products p 
WHERE p.is_active = true 
ORDER BY p.price DESC 
LIMIT 2;

-- 8. PRODUCT TIERS (Wholesale volume discounts)
DELETE FROM public.product_tiers;
INSERT INTO public.product_tiers (product_id, min_qty, price)
SELECT p.id, v.q, round(p.price * v.f)
FROM (SELECT id, price FROM public.products WHERE is_active = true) p,
     (VALUES (3, 0.92), (6, 0.85), (12, 0.78)) AS v(q, f);

-- 9. BUNDLES
DELETE FROM public.bundles;
INSERT INTO public.bundles (title_ar, title_ku, subtitle_ar, subtitle_ku, product_ids, price, compare_price, sort_order, is_active, hue, chroma)
SELECT 
  'باقة العيادة المتكاملة للترميم', 
  'پاکێجی تەواوی کلینیک بۆ چاککردنەوە',
  'كومبوزيت + جهاز تصليب + سمنت لاصق بسعر خاص', 
  'کۆمپۆزیت + لایت کیورینگ + سیمانی شووشەیی بە نرخی داشکاو',
  array_agg(p.id), 
  175000, 
  205000, 
  1, 
  true, 
  150, 
  0.14
FROM (SELECT id FROM public.products WHERE is_active = true LIMIT 3) p;

-- 10. COUPONS
DELETE FROM public.coupons;
INSERT INTO public.coupons (code, discount_type, discount_value, min_order, ends_at) VALUES
 ('BA10', 'percent', 10, 50000, now() + interval '30 days'),
 ('WELCOME5000', 'fixed', 5000, 100000, now() + interval '30 days');
