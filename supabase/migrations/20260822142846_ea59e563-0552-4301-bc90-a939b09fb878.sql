CREATE OR REPLACE FUNCTION public.admin_reset_data(_scope text DEFAULT 'sales')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _kept_users int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _scope NOT IN ('sales', 'all') THEN
    RAISE EXCEPTION 'Invalid scope';
  END IF;

  -- transactional data
  DELETE FROM public.vendor_reward_points;
  DELETE FROM public.notifications;
  DELETE FROM public.product_reviews;
  DELETE FROM public.order_items;
  DELETE FROM public.orders;
  DELETE FROM public.wallet_card_redemptions;
  DELETE FROM public.wallet_transactions;
  DELETE FROM public.wallets;
  DELETE FROM public.wallet_cards;
  DELETE FROM public.addresses;

  IF _scope = 'all' THEN
    DELETE FROM public.offer_products;
    DELETE FROM public.flash_deals;
    DELETE FROM public.offers;
    DELETE FROM public.bundles;
    DELETE FROM public.banners;
    DELETE FROM public.coupons;
    DELETE FROM public.brand_cards;
    DELETE FROM public.product_tiers;
    DELETE FROM public.products;
    DELETE FROM public.catalog_items;
    DELETE FROM public.vendor_charges;
    DELETE FROM public.vendor_settlements;
    DELETE FROM public.vendor_shipping_rates;
    DELETE FROM public.vendor_members;
    DELETE FROM public.vendor_applications;
    DELETE FROM public.vendors;

    DELETE FROM public.user_roles
    WHERE role <> 'admin'
      AND NOT public.has_role(user_id, 'admin');

    DELETE FROM public.profiles
    WHERE NOT public.has_role(id, 'admin');
  END IF;

  SELECT count(*) INTO _kept_users FROM public.profiles;

  RETURN jsonb_build_object('ok', true, 'scope', _scope, 'kept_profiles', _kept_users);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_data(text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_reset_data(text) TO authenticated;