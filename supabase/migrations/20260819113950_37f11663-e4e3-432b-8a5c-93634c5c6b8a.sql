UPDATE public.categories SET icon = 'wrench', hue = 250, chroma = 0.16 WHERE slug ILIKE '%instrument%' OR slug ILIKE '%tool%' OR name_ar LIKE '%أدوات%';
UPDATE public.categories SET icon = 'gem', hue = 305, chroma = 0.15 WHERE slug ILIKE '%restor%' OR name_ar LIKE '%ترميم%';
UPDATE public.categories SET icon = 'brush', hue = 200, chroma = 0.14 WHERE slug ILIKE '%ortho%' OR name_ar LIKE '%تقويم%';
UPDATE public.categories SET icon = 'shield', hue = 155, chroma = 0.14 WHERE slug ILIKE '%consum%' OR name_ar LIKE '%مستلزمات%';
UPDATE public.categories SET icon = 'syringe', hue = 25, chroma = 0.16 WHERE slug ILIKE '%endo%' OR name_ar LIKE '%لبية%' OR name_ar LIKE '%جذور%';
UPDATE public.categories SET icon = 'droplets', hue = 220, chroma = 0.15 WHERE slug ILIKE '%hygien%' OR slug ILIKE '%steril%' OR name_ar LIKE '%تعقيم%';
UPDATE public.categories SET icon = 'microscope', hue = 275, chroma = 0.15 WHERE slug ILIKE '%equip%' OR name_ar LIKE '%أجهزة%';
UPDATE public.categories SET icon = 'smile', hue = 340, chroma = 0.15 WHERE slug ILIKE '%prosth%' OR name_ar LIKE '%تعويض%';
UPDATE public.categories SET icon = 'sparkles', hue = 95, chroma = 0.15 WHERE icon IS NULL OR icon = '' OR icon = 'sparkles';