GRANT SELECT ON public.wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_cards TO authenticated;
GRANT ALL ON public.wallet_cards TO service_role;

GRANT SELECT ON public.wallet_card_redemptions TO authenticated;
GRANT ALL ON public.wallet_card_redemptions TO service_role;

GRANT EXECUTE ON FUNCTION public.wallet_my_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_redeem_card(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_pay_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_admin_adjust(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_ensure(uuid) TO service_role;