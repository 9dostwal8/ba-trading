REVOKE ALL ON FUNCTION public.clamp_reward_sponsorship() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.charge_vendor_reward_points() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_offer_for_product(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_on_order_paid() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_on_review() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reward_award_order(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.reward_claim_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reward_claim_profile() TO authenticated;
REVOKE ALL ON FUNCTION public.reward_my_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reward_my_summary() TO authenticated;
REVOKE ALL ON FUNCTION public.reward_redeem_order(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reward_redeem_order(uuid, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.reward_use_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reward_use_referral(text) TO authenticated;