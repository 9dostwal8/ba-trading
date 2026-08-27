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