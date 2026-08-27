REVOKE EXECUTE ON FUNCTION public.charge_marketing_item() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.charge_product_badges() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.snapshot_order_item_vendor() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.normalize_per_order_commission() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.marketing_price(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_vendor_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.owns_order(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.order_has_my_vendor_items(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_vendor_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_has_my_vendor_items(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;