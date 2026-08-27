ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.vendor_order_counts()
RETURNS TABLE(vendor_id uuid, orders bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oi.vendor_id, count(DISTINCT oi.order_id) AS orders
  FROM public.order_items oi
  WHERE oi.vendor_id IS NOT NULL
  GROUP BY oi.vendor_id
$$;

GRANT EXECUTE ON FUNCTION public.vendor_order_counts() TO anon, authenticated, service_role;