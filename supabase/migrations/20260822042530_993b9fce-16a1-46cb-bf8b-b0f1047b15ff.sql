REVOKE ALL ON FUNCTION public.products_link_catalog() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.catalog_key(text, text) FROM PUBLIC, anon;