REVOKE ALL ON FUNCTION public.wallet_ensure(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_my_balance() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wallet_redeem_card(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wallet_pay_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wallet_my_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_redeem_card(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_pay_order(uuid) TO authenticated;