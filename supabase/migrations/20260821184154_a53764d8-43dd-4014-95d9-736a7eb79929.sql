insert into public.bundles (title_ar, title_ku, subtitle_ar, subtitle_ku, kind, price, compare_price, stock, is_active, sort_order, product_ids, hue, chroma)
select 'كِت اختبار ١٠ منتجات', 'کیتی تاقیکردنەوە ١٠ بەرهەم', 'حزمة تجريبية تحتوي ١٠ منتجات', 'پاکێجی تاقیکردنەوە بە ١٠ بەرهەم',
 'bundle', 249000, 390000, 20, true, 0,
 array(select id from public.products where is_active = true order by created_at limit 10),
 15, 0.16
where (select count(*) from public.products where is_active = true) >= 10;