CREATE OR REPLACE FUNCTION public.mark_order_paid_on_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_total int;
  n_conf int;
  n_canc int;
BEGIN
  IF NEW.fulfillment_status IN ('confirmed', 'shipped', 'done')
     AND (TG_OP = 'INSERT' OR OLD.fulfillment_status IS DISTINCT FROM NEW.fulfillment_status) THEN
    UPDATE public.orders o
       SET payment_status = 'paid',
           paid_at = COALESCE(o.paid_at, now())
     WHERE o.id = NEW.order_id
       AND o.payment_status <> 'paid';
  END IF;

  -- reflect vendor decisions on the customer-facing order status
  SELECT count(*),
         count(*) FILTER (WHERE fulfillment_status IN ('confirmed','shipped','done')),
         count(*) FILTER (WHERE fulfillment_status = 'cancelled')
    INTO n_total, n_conf, n_canc
    FROM public.order_items
   WHERE order_id = NEW.order_id;

  IF n_total > 0 AND n_canc = n_total THEN
    UPDATE public.orders SET status = 'cancelled'
     WHERE id = NEW.order_id AND status <> 'cancelled';
  ELSIF n_total > 0 AND n_conf > 0 AND (n_conf + n_canc) = n_total THEN
    UPDATE public.orders SET status = 'confirmed'
     WHERE id = NEW.order_id AND status = 'new';
  END IF;

  RETURN NEW;
END;
$$;

-- backfill existing orders whose vendor decisions were already made
UPDATE public.orders o
   SET status = 'confirmed'
 WHERE o.status = 'new'
   AND EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id AND i.fulfillment_status IN ('confirmed','shipped','done'))
   AND NOT EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id AND i.fulfillment_status NOT IN ('confirmed','shipped','done','cancelled'));

UPDATE public.orders o
   SET status = 'cancelled'
 WHERE o.status <> 'cancelled'
   AND EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id)
   AND NOT EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id AND i.fulfillment_status <> 'cancelled');