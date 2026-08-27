REVOKE ALL ON FUNCTION public.my_vendor_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_vendor_ids() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.snapshot_order_item_vendor() FROM PUBLIC, anon, authenticated;