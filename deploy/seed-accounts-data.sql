-- =========================================================================
-- BA TRADING — SEED VENDORS, MEMBERS, ADDRESSES & SAMPLE ORDERS
-- Connects the demo accounts to vendors, orders, and addresses
-- =========================================================================

-- 1. SEED VENDORS
INSERT INTO public.vendors (name, brand_key, logo_domain, commission_type, commission_value, is_active)
VALUES
  ('GC Iraq', 'gc', 'gc.dental', 'percent', 10, true),
  ('Tokuyama Center', 'tokuyama', 'tokuyama-dental.com', 'percent', 8, true),
  ('Bisco Supply', 'bisco', 'bisco.com', 'percent', 12, true),
  ('3M Dental Hub', '3m', '3m.com', 'percent', 10, true),
  ('Orodeka Depot', 'orodeka', 'orodeka.com', 'percent', 15, true)
ON CONFLICT DO NOTHING;

-- 2. LINK VENDOR ACCOUNTS TO VENDORS
DELETE FROM public.vendor_members;

INSERT INTO public.vendor_members (vendor_id, user_id)
SELECT v.id, u.id
FROM auth.users u
JOIN public.vendors v ON (
  (u.email = '7710000001@batrading.com' AND v.brand_key = 'gc') OR
  (u.email = '7710000002@batrading.com' AND v.brand_key = 'tokuyama') OR
  (u.email = '7710000003@batrading.com' AND v.brand_key = 'bisco') OR
  (u.email = '7710000004@batrading.com' AND v.brand_key = '3m') OR
  (u.email = '7710000005@batrading.com' AND v.brand_key = 'orodeka')
)
ON CONFLICT DO NOTHING;

-- 3. LINK PRODUCTS TO VENDORS
UPDATE public.products p
SET vendor_id = v.id
FROM public.vendors v
WHERE (p.brand ILIKE '%3M%' AND v.brand_key = '3m')
   OR (p.brand ILIKE '%GC%' AND v.brand_key = 'gc')
   OR (p.brand ILIKE '%Tokuyama%' AND v.brand_key = 'tokuyama')
   OR (p.brand ILIKE '%Bisco%' AND v.brand_key = 'bisco')
   OR (p.brand ILIKE '%Orodeka%' AND v.brand_key = 'orodeka');

-- 4. SEED ADDRESSES FOR DR. BEHZAD
DELETE FROM public.addresses WHERE user_id IN (SELECT id FROM auth.users WHERE email = '7700000001@batrading.com');

INSERT INTO public.addresses (user_id, label, city, address_line, is_default, latitude, longitude)
SELECT 
  u.id, 
  'عيادة أربيل التخصصية للأسنان', 
  'أربيل', 
  'شارع 60 متري - مجمع الأطباء - الطابق الثاني', 
  true, 
  36.1911, 
  44.0091
FROM auth.users u
WHERE u.email = '7700000001@batrading.com';

-- 5. SEED SAMPLE ORDERS FOR DR. BEHZAD
DELETE FROM public.orders WHERE user_id IN (SELECT id FROM auth.users WHERE email = '7700000001@batrading.com');

WITH dentist AS (
  SELECT id FROM auth.users WHERE email = '7700000001@batrading.com' LIMIT 1
),
prod1 AS (
  SELECT id, name_ar, name_ku, price, vendor_id, image_url FROM public.products WHERE is_active = true LIMIT 1
),
prod2 AS (
  SELECT id, name_ar, name_ku, price, vendor_id, image_url FROM public.products WHERE is_active = true OFFSET 1 LIMIT 1
),
new_order AS (
  INSERT INTO public.orders (
    user_id, customer_name, phone, city, address_line, subtotal, discount, total, status, created_at
  )
  SELECT 
    d.id, 
    'د. بەهزاد کاکە', 
    '0770000001', 
    'أربيل', 
    'شارع 60 متري - مجمع الأطباء', 
    167000, 
    10000, 
    157000, 
    'delivering', 
    now() - interval '2 days'
  FROM dentist d
  RETURNING id
)
INSERT INTO public.order_items (
  order_id, product_id, vendor_id, name_ar, name_ku, unit_price, quantity, image_url, fulfillment_status
)
SELECT 
  o.id, p1.id, p1.vendor_id, p1.name_ar, p1.name_ku, p1.price, 2, p1.image_url, 'shipped'
FROM new_order o, prod1 p1
UNION ALL
SELECT 
  o.id, p2.id, p2.vendor_id, p2.name_ar, p2.name_ku, p2.price, 1, p2.image_url, 'shipped'
FROM new_order o, prod2 p2;

-- 6. GRANT ADMIN ROLE TO ADMIN USER
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = '7700000000@batrading.com'
ON CONFLICT (user_id, role) DO NOTHING;


