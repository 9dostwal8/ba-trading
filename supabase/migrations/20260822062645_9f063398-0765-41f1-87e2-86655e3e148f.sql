REVOKE ALL ON FUNCTION public.reward_grant(uuid, text, numeric, text, uuid, boolean) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_rule(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_award_order(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.user_bought_product(uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_on_review() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_on_order_paid() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.profiles_fill_referral_code() FROM anon, authenticated;