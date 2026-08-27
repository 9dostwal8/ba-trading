CREATE TABLE public.catalog_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_key text NOT NULL UNIQUE,
  name_ar text NOT NULL DEFAULT '',
  name_ku text NOT NULL DEFAULT '',
  description_ar text NOT NULL DEFAULT '',
  description_ku text NOT NULL DEFAULT '',
  brand text NOT NULL DEFAULT '',
  sku text NOT NULL DEFAULT '',
  image_url text,
  category_id uuid REFERENCES public.categories(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.catalog_items TO anon;
GRANT SELECT, INSERT ON public.catalog_items TO authenticated;
GRANT ALL ON public.catalog_items TO service_role;

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog_items_read_all" ON public.catalog_items FOR SELECT USING (true);
CREATE POLICY "catalog_items_insert_signed_in" ON public.catalog_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "catalog_items_admin_update" ON public.catalog_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "catalog_items_admin_delete" ON public.catalog_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER catalog_items_touch BEFORE UPDATE ON public.catalog_items
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.products ADD COLUMN catalog_item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.catalog_key(_brand text, _name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(lower(btrim(coalesce(_brand, ''))), '\s+', ' ', 'g')
      || '|' ||
      regexp_replace(lower(btrim(coalesce(_name, ''))), '\s+', ' ', 'g')
$$;

REVOKE EXECUTE ON FUNCTION public.catalog_key(text, text) FROM anon;

-- backfill shared catalog items from existing products
INSERT INTO public.catalog_items (match_key, name_ar, name_ku, description_ar, description_ku, brand, sku, image_url, category_id)
SELECT DISTINCT ON (public.catalog_key(p.brand, p.name_ar))
       public.catalog_key(p.brand, p.name_ar),
       p.name_ar, p.name_ku, p.description_ar, p.description_ku, p.brand, p.sku, p.image_url, p.category_id
FROM public.products p
WHERE btrim(coalesce(p.name_ar, '')) <> ''
ORDER BY public.catalog_key(p.brand, p.name_ar), p.created_at
ON CONFLICT (match_key) DO NOTHING;

UPDATE public.products p
   SET catalog_item_id = c.id
  FROM public.catalog_items c
 WHERE c.match_key = public.catalog_key(p.brand, p.name_ar)
   AND p.catalog_item_id IS NULL;

CREATE OR REPLACE FUNCTION public.products_link_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
  cid uuid;
BEGIN
  IF NEW.catalog_item_id IS NOT NULL THEN RETURN NEW; END IF;
  IF btrim(coalesce(NEW.name_ar, '')) = '' THEN RETURN NEW; END IF;

  k := public.catalog_key(NEW.brand, NEW.name_ar);
  SELECT id INTO cid FROM public.catalog_items WHERE match_key = k;
  IF cid IS NULL THEN
    INSERT INTO public.catalog_items (match_key, name_ar, name_ku, description_ar, description_ku, brand, sku, image_url, category_id)
    VALUES (k, NEW.name_ar, coalesce(NEW.name_ku, ''), coalesce(NEW.description_ar, ''), coalesce(NEW.description_ku, ''),
            coalesce(NEW.brand, ''), coalesce(NEW.sku, ''), NEW.image_url, NEW.category_id)
    ON CONFLICT (match_key) DO UPDATE SET updated_at = now()
    RETURNING id INTO cid;
  END IF;
  NEW.catalog_item_id := cid;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.products_link_catalog() FROM anon, authenticated;

CREATE TRIGGER products_link_catalog_trg BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.products_link_catalog();

-- one listing per vendor per catalog item
CREATE UNIQUE INDEX products_vendor_catalog_uniq
  ON public.products (vendor_id, catalog_item_id)
  WHERE vendor_id IS NOT NULL AND catalog_item_id IS NOT NULL;

CREATE INDEX products_catalog_item_idx ON public.products (catalog_item_id);