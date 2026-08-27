-- 1) Freeze the month an order line belongs to (acceptance date)
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.stamp_order_item_accepted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.fulfillment_status = 'confirmed' AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at := now();
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.stamp_order_item_accepted() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS order_items_stamp_accepted ON public.order_items;
CREATE TRIGGER order_items_stamp_accepted BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.stamp_order_item_accepted();

UPDATE public.order_items i
SET accepted_at = COALESCE(o.paid_at, o.updated_at, o.created_at)
FROM public.orders o
WHERE o.id = i.order_id
  AND i.fulfillment_status = 'confirmed'
  AND i.accepted_at IS NULL;

-- 2) Statement record: reward sponsorship, partial payments, closing
ALTER TABLE public.vendor_settlements
  ADD COLUMN IF NOT EXISTS rewards_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;

-- 3) One shared statement calculation for admin + vendor
CREATE OR REPLACE FUNCTION public.vendor_statement(_vendor_id uuid, _period text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sales numeric := 0;
  _units numeric := 0;
  _commission numeric := 0;
  _marketing numeric := 0;
  _marketing_paid numeric := 0;
  _rewards numeric := 0;
  _rewards_paid numeric := 0;
  _orders jsonb := '[]'::jsonb;
  _charges jsonb := '[]'::jsonb;
  _st public.vendor_settlements;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR _vendor_id IN (SELECT public.my_vendor_ids())
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT
    COALESCE(SUM(i.unit_price * i.quantity), 0),
    COALESCE(SUM(i.quantity), 0),
    COALESCE(SUM(i.commission_amount), 0)
  INTO _sales, _units, _commission
  FROM public.order_items i
  JOIN public.orders o ON o.id = i.order_id
  WHERE i.vendor_id = _vendor_id
    AND i.fulfillment_status = 'confirmed'
    AND o.status <> 'cancelled'
    AND (_period = 'all' OR to_char(COALESCE(i.accepted_at, o.created_at), 'YYYY-MM-DD') LIKE _period || '%');

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'date' DESC), '[]'::jsonb) INTO _orders
  FROM (
    SELECT jsonb_build_object(
      'order_no', o.order_no,
      'order_id', o.id,
      'customer', o.customer_name,
      'date', COALESCE(i.accepted_at, o.created_at),
      'units', SUM(i.quantity),
      'sales', SUM(i.unit_price * i.quantity),
      'commission', SUM(i.commission_amount)
    ) AS x
    FROM public.order_items i
    JOIN public.orders o ON o.id = i.order_id
    WHERE i.vendor_id = _vendor_id
      AND i.fulfillment_status = 'confirmed'
      AND o.status <> 'cancelled'
      AND (_period = 'all' OR to_char(COALESCE(i.accepted_at, o.created_at), 'YYYY-MM-DD') LIKE _period || '%')
    GROUP BY o.id, o.order_no, o.customer_name, COALESCE(i.accepted_at, o.created_at)
  ) s;

  SELECT
    COALESCE(SUM(CASE WHEN c.kind <> 'reward_points' THEN c.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN c.kind <> 'reward_points' AND c.status = 'paid' THEN c.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN c.kind = 'reward_points' THEN c.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN c.kind = 'reward_points' AND c.status = 'paid' THEN c.amount ELSE 0 END), 0)
  INTO _marketing, _marketing_paid, _rewards, _rewards_paid
  FROM public.vendor_charges c
  WHERE c.vendor_id = _vendor_id
    AND (_period = 'all' OR to_char(c.created_at, 'YYYY-MM-DD') LIKE _period || '%');

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'kind', c.kind,
      'label', c.label,
      'amount', c.amount,
      'status', c.status,
      'created_at', c.created_at
    ) ORDER BY c.created_at DESC), '[]'::jsonb) INTO _charges
  FROM public.vendor_charges c
  WHERE c.vendor_id = _vendor_id
    AND (_period = 'all' OR to_char(c.created_at, 'YYYY-MM-DD') LIKE _period || '%');

  SELECT * INTO _st FROM public.vendor_settlements
  WHERE vendor_id = _vendor_id AND period = _period LIMIT 1;

  RETURN jsonb_build_object(
    'vendor_id', _vendor_id,
    'period', _period,
    'sales', _sales,
    'units', _units,
    'commission', _commission,
    'marketing', _marketing,
    'marketing_paid', _marketing_paid,
    'rewards', _rewards,
    'rewards_paid', _rewards_paid,
    'payout', _sales - _commission - _marketing - _rewards,
    'store_income', _commission + _marketing + _rewards,
    'orders', _orders,
    'charges', _charges,
    'status', COALESCE(_st.status, 'unpaid'),
    'paid_amount', COALESCE(_st.paid_amount, 0),
    'paid_at', _st.paid_at,
    'closed_at', _st.closed_at,
    'note', COALESCE(_st.note, '')
  );
END; $$;

REVOKE ALL ON FUNCTION public.vendor_statement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vendor_statement(uuid, text) TO authenticated;

CREATE INDEX IF NOT EXISTS order_items_vendor_accepted_idx
  ON public.order_items (vendor_id, accepted_at);