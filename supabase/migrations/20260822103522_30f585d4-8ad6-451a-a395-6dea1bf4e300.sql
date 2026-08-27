REVOKE ALL ON FUNCTION public.notify_on_order_insert() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_order_update() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_order_item() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_wallet_tx() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_vendor_reward_points() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_vendor_charge() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_vendor_application() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_review() FROM anon, authenticated;
