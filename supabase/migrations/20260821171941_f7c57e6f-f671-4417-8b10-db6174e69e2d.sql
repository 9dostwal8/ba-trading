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