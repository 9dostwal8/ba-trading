DROP POLICY IF EXISTS "banner_images_insert" ON storage.objects;
CREATE POLICY "banner_images_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'banners'
  AND owner = auth.uid()
  AND public.has_role(auth.uid(), 'admin')
);