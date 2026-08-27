CREATE OR REPLACE FUNCTION public.vendor_statements(_period text)
 RETURNS TABLE(vendor_id uuid, vendor_name text, sales numeric, units numeric, commission numeric, marketing numeric, rewards numeric, payout numeric, store_income numeric, status text, paid_amount numeric, paid_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH s AS (
    SELECT i.vendor_id AS vid,
           COALESCE(SUM(i.unit_price * i.quantity), 0)::numeric AS sales,
           COALESCE(SUM(i.quantity), 0)::numeric AS units,
           COALESCE(SUM(i.commission_amount), 0)::numeric AS commission
    FROM public.order_items i
    JOIN public.orders o ON o.id = i.order_id
    WHERE i.vendor_id IS NOT NULL
      AND i.fulfillment_status = 'confirmed'
      AND o.status <> 'cancelled'
      AND (_period = 'all' OR to_char(COALESCE(i.accepted_at, o.created_at), 'YYYY-MM-DD') LIKE _period || '%')
    GROUP BY i.vendor_id
  ), c AS (
    SELECT vc.vendor_id AS vid,
           COALESCE(SUM(CASE WHEN vc.kind <> 'reward_points' THEN vc.amount ELSE 0 END), 0)::numeric AS marketing,
           COALESCE(SUM(CASE WHEN vc.kind = 'reward_points' THEN vc.amount ELSE 0 END), 0)::numeric AS rewards
    FROM public.vendor_charges vc
    WHERE (_period = 'all' OR to_char(vc.created_at, 'YYYY-MM-DD') LIKE _period || '%')
    GROUP BY vc.vendor_id
  )
  SELECT v.id,
         v.name::text,
         COALESCE(s.sales, 0)::numeric,
         COALESCE(s.units, 0)::numeric,
         COALESCE(s.commission, 0)::numeric,
         COALESCE(c.marketing, 0)::numeric,
         COALESCE(c.rewards, 0)::numeric,
         (COALESCE(s.sales, 0) - COALESCE(s.commission, 0) - COALESCE(c.marketing, 0) - COALESCE(c.rewards, 0))::numeric,
         (COALESCE(s.commission, 0) + COALESCE(c.marketing, 0) + COALESCE(c.rewards, 0))::numeric,
         COALESCE(st.status, 'unpaid')::text,
         COALESCE(st.paid_amount, 0)::numeric,
         st.paid_at
  FROM public.vendors v
  LEFT JOIN s ON s.vid = v.id
  LEFT JOIN c ON c.vid = v.id
  LEFT JOIN public.vendor_settlements st ON st.vendor_id = v.id AND st.period = _period
  WHERE COALESCE(s.sales, 0) > 0
     OR COALESCE(c.marketing, 0) > 0
     OR COALESCE(c.rewards, 0) > 0
     OR st.id IS NOT NULL
  ORDER BY COALESCE(s.sales, 0) DESC;
END; $function$;