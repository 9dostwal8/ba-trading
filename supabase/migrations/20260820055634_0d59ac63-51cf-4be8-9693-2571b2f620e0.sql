REVOKE ALL ON FUNCTION public.marketing_price(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.charge_marketing_item() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.charge_product_badges() FROM anon, authenticated;