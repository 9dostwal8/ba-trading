CREATE POLICY "banner_images_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'banners');
CREATE POLICY "banner_images_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banners');
CREATE POLICY "banner_images_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'banners') WITH CHECK (bucket_id = 'banners');
CREATE POLICY "banner_images_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banners');