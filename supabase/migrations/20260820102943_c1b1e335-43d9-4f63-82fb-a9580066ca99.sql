-- Trigger-only / internal SECURITY DEFINER functions must not be callable via the API
REVOKE EXECUTE ON FUNCTION public.charge_marketing_item() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.charge_product_badges() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.snapshot_order_item_vendor() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.normalize_per_order_commission() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.marketing_price(text) FROM anon, authenticated;

-- Helper functions used by RLS policies / app RPCs: signed-in only, never anonymous
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_vendor_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.owns_order(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.order_has_my_vendor_items(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_admin() FROM anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_vendor_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_has_my_vendor_items(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;