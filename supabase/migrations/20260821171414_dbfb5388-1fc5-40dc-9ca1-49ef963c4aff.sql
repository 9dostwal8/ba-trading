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