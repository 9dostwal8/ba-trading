-- =========================================================================
-- BA TRADING — SAMPLE SEED DATA
-- Run this in your Supabase SQL Editor to populate sample products,
-- categories, banners, brand cards, and home sections.
-- =========================================================================

-- 1. STORE SETTINGS
INSERT INTO public.store_settings (
  singleton, primary_hue, primary_chroma, accent_hue, accent_chroma, radius_px, show_search
)
VALUES (true, 210, 0.18, 350, 0.16, 14, true)
ON CONFLICT (singleton) DO NOTHING;

-- 2. CATEGORIES
INSERT INTO public.categories (slug, name_ar, name_ku, sort_order, is_active, icon, hue, chroma)
VALUES
  ('orthodontics', 'تقويم الأسنان', 'ڕێککردنەوەی ددان (تەقویم)', 1, true, 'sparkles', 210, 0.18),
  ('restorative', 'الحشوات والترميم', 'پڕکردنەوە و چاککردنەوە', 2, true, 'package', 160, 0.18),
  ('endodontics', 'علاج العصب (اللبية)', 'دەماربڕین', 3, true, 'zap', 30, 0.18),
  ('equipment', 'الأجهزة والمعدات', 'ئامێر و کەلوپەلەکان', 4, true, 'shield-check', 280, 0.18),
  ('instruments', 'الأدوات الجراحية والفحص', 'ئامرازەکانی نەشتەرگەری و پشکنین', 5, true, 'layers', 190, 0.18),
  ('consumables', 'المستلزمات المستهلكة', 'پێداویستییە بەکارهێنراوەکان', 6, true, 'boxes', 340, 0.18)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_ku = EXCLUDED.name_ku,
  sort_order = EXCLUDED.sort_order;

-- 3. BANNERS (Home Hero Banners)
DELETE FROM public.banners WHERE slot_key = 'home_hero';
INSERT INTO public.banners (slot_key, title_ar, title_ku, subtitle_ar, subtitle_ku, image_url, sort_order, is_active)
VALUES
  ('home_hero', 'عروض الموسم لمستلزمات طب الأسنان', 'ئۆفەری وەرزی بۆ کەرەستەی پزیشکی ددان', 'خصومات تصل إلى 35% على الماركات العالمية', 'داشکاندن هەتا 35% لەسەر براندە جیهانییەکان', '/images/banner-dental-1.jpg', 1, true),
  ('home_hero', 'تجهيزات العيادات المتكاملة', 'ئامادەکردنی تەواوی کلینیک', 'أحدث الأجهزة بضمان رسمي وخدمة ما بعد البيع', 'نوێترین ئامێر بە گەرەنتی و خزمەتگوزاری', '/images/banner-dental-2.jpg', 2, true),
  ('home_hero', 'تخفيضات الحشوات والمواد الاستهلاكية', 'داشکاندنی کەرەستەی پڕکردنەوە', 'أسعار جملة خاصة للمراكز والعيادات', 'نرخی کۆی تایبەت بۆ سەنتەر و کلینیکەکان', '/images/banner-dental-3.jpg', 3, true);

-- 4. BRAND CARDS
INSERT INTO public.brand_cards (name, slug, match_key, domain, hue, chroma, sort_order, is_active)
VALUES
  ('3M ESPE', '3m', '3m', '3m.com', 210, 0.18, 1, true),
  ('GC Dental', 'gc', 'gc', 'gc.dental', 140, 0.18, 2, true),
  ('Tokuyama', 'tokuyama', 'tokuyama', 'tokuyama-dental.com', 30, 0.18, 3, true),
  ('Woodpecker', 'woodpecker', 'woodpecker', 'glwoodpecker.com', 270, 0.18, 4, true),
  ('Eighteeth', 'eighteeth', 'eighteeth', 'eighteeth.com', 190, 0.18, 5, true),
  ('Dentsply Sirona', 'dentsply', 'dentsply', 'dentsplysirona.com', 350, 0.18, 6, true)
ON CONFLICT (slug) DO NOTHING;

-- 5. PRODUCTS
DELETE FROM public.products;

WITH cats AS (SELECT slug, id FROM public.categories)
INSERT INTO public.products (
  category_id, name_ar, name_ku, description_ar, description_ku, brand, sku, price, compare_price, stock, image_url, is_active, is_featured, clearance_kind
)
VALUES
  (
    (SELECT id FROM cats WHERE slug = 'restorative'),
    'حشوة ضوئية نانو كومبوزيت Filtek Z350 XT',
    'کۆمپۆزیتی نانۆ Filtek Z350 XT',
    'كومبوزيت ياباني عالي الجودة لترميم الأسنان الأمامية والخلفية بمظهر طبيعي ولمعان دائم.',
    'کۆمپۆزیتی نانۆی کوالیتی بەرز بۆ ددانەکانی پێشەوە و دواوە بە شێوەیەکی سروشتی.',
    '3M ESPE', '3M-Z350', 38000, 48000, 60, '/images/p-composite.jpg', true, true, null
  ),
  (
    (SELECT id FROM cats WHERE slug = 'equipment'),
    'جهاز تعقيم أوتوكلاف كلاس B سعة 23 لتر',
    'ئامێری ستەریلیزەکردن ئۆتۆکلاڤ کلاسی B قەبارەی ٢٣ لتر',
    'أوتوكلاف كلاس B مع نظام تجفيف فراغي ثلاثي وطابعة تقارير مدمجة وشاشة رقمية.',
    'ئۆتۆکلاڤی کلاسی B بە سیستەمی وشککردنەوەی خێرا و شاشەی دیجیتاڵی.',
    'Woodpecker', 'AC-23B', 2450000, 2800000, 8, '/images/p-autoclave.jpg', true, true, null
  ),
  (
    (SELECT id FROM cats WHERE slug = 'equipment'),
    'جهاز تصليب الحشوات الضوئي اللاسلكي LED Curing Light',
    'ئامێری لایت کیورینگ بێ وایەر LED',
    'جهاز ليت كيور عالي الطاقة 2000mW/cm2 مع بطارية تدوم طويلاً وأوضاع تشغيل متعددة.',
    'ئامێری لایت کیورینگ بە هێزی ٢٠٠٠ مێگاوات و پاتری بەهێز.',
    'Eighteeth', 'LC-PRO', 115000, 145000, 25, '/images/p-curing-light.jpg', true, true, null
  ),
  (
    (SELECT id FROM cats WHERE slug = 'instruments'),
    'طقم أدوات فحص الأسنان ستانلس ستيل عالي الجودة',
    'سێتی ئامرازەکانی پشکنینی ددان ستانلێس ستیل',
    'طقم فحص متكامل يشمل مرآة فحص، ملقط، ومجس فحص مصنوع من الفولاذ المقاوم للصدأ.',
    'سێتی پشکنینی پێکدێت لە ئاوێنە، پینست، و سۆندەی پشکنین بە کوالیتی بەرز.',
    'BA Dental', 'INST-SET-01', 22000, 30000, 100, '/images/p-instruments-set.jpg', true, true, null
  ),
  (
    (SELECT id FROM cats WHERE slug = 'restorative'),
    'سمنت لاصق زجاجي زجاج الأيونومر Fuji II LC',
    'سیمێنتی گلاس ئایۆنۆمەر Fuji II LC',
    'سمنت لاصق مقوى بالراتنج لترميمات الفئة الثالثة والخامسة والأسنان اللبنية.',
    'سیمێنتی جێگیرکراو بە ڕزین بۆ پڕکردنەوە و چاککردنەوەی ددانی شیری.',
    'GC Dental', 'GC-FUJI-2', 45000, 55000, 45, '/images/p-cement.jpg', true, false, null
  ),
  (
    (SELECT id FROM cats WHERE slug = 'orthodontics'),
    'حاصرات تقويم معدنية ميني روث Mini Roth 0.22',
    'براکێتی تەقویمی کانزایی Mini Roth 0.22',
    'طقم براكيتات تقويم معدنية دقيقة ومصقولة لراحة المريض وثباتية عالية.',
    'سێتی براکێتی تەقویمی ورد و ساف بۆ ئاسوودەیی نەخۆش و جێگیری بەرز.',
    'Dentaurum', 'ORTHO-BR-01', 35000, 45000, 80, '/images/p-ortho.jpg', true, false, null
  ),
  (
    (SELECT id FROM cats WHERE slug = 'instruments'),
    'كلابات قلع الأسنان للفك العلوي والسفلي (مجموعة)',
    'کەلبەتەی کێشانی ددان بۆ شەویلاگی سەرەوە و خوارەوە',
    'مجموعة كلابات قلع متخصصة بتصميم مريح من الستانلس ستيل الألماني الطبي.',
    'کۆمەڵەی کەلبەتەی تایبەتی کێشان بە دیزاینی ئەرگونۆمیک و ستانلێس ستیلی ئەڵمانی.',
    'BA Dental', 'FORC-SET', 65000, 85000, 30, '/images/p-forceps.jpg', true, false, null
  ),
  (
    (SELECT id FROM cats WHERE slug = 'consumables'),
    'كفوف فحص طبية نيتريل خالية من البودرة (علبة 100 قطعة)',
    'دەستکێشی پزیشکی نایترایل بێ تۆز (پاکەتی ١٠٠ دانەیی)',
    'قفازات نيتريل عالية المرونة والمقاومة ومريحة للاستخدام اليومي في العيادات.',
    'دەستکێشی نایترایلی نەرم و بەهێز بۆ بەکارهێنانی ڕۆژانەی کلینیکەکان.',
    'SafeTouch', 'GLV-NIT-100', 12000, 16000, 200, '/images/p-gloves.jpg', true, false, null
  ),
  (
    (SELECT id FROM cats WHERE slug = 'consumables'),
    'كمامات طبية 3 طبقات مع فلتر حماية (علبة 50 قطعة)',
    'دەمامکی پزیشکی ٣ تەبەقە بە فلتەر (پاکەتی ٥٠ دانەیی)',
    'كمامات طبية مريحة مع حلقة أذن ناعمة وحاجز أمان ثلاثي الطبقات.',
    'دەمامکی پزیشکی ئاسوودە بۆ پاراستنی ڕۆژانەی پزیشک و کارمەندان.',
    'MediGuard', 'MASK-50', 5000, 7500, 300, '/images/p-masks.jpg', true, false, null
  );

-- 6. HOME SECTIONS (To arrange the homepage layout)
DELETE FROM public.home_sections;
INSERT INTO public.home_sections (kind, title_ar, title_ku, layout, item_limit, sort_order, is_active, hue, chroma, show_title)
VALUES
  ('banners', 'الإعلانات الرئيسية', 'ڕیکلامە سەرەکییەکان', 'hero', 3, 1, true, 210, 0.18, false),
  ('categories', 'أقسام المتجر', 'بەشەکانی فرۆشگا', 'scroll', 6, 2, true, 210, 0.18, true),
  ('featured', 'المنتجات الأكثر طلباً', 'بەرهەمە داواکراوەکان', 'grid', 8, 3, true, 350, 0.18, true),
  ('brands', 'الماركات العالمية المعتمدة', 'براندە جیهانییە باوەڕپێکراوەکان', 'grid', 6, 4, true, 210, 0.18, true);

-- 7. CLEARANCE & TIER PRICING SAMPLE
DELETE FROM public.clearance_rules;
INSERT INTO public.clearance_rules (name_ar, name_ku, months_left, discount_percent, is_active)
VALUES
  ('قريب الانتهاء 3 أشهر', 'نزیک بەسەرچوون ٣ مانگ', 3, 40, true),
  ('قريب الانتهاء 6 أشهر', 'نزیک بەسەرچوون ٦ مانگ', 6, 25, true),
  ('قريب الانتهاء سنة', 'نزیک بەسەرچوون ١ ساڵ', 12, 15, true);
