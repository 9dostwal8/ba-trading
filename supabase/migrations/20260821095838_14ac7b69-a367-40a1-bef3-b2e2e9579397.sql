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