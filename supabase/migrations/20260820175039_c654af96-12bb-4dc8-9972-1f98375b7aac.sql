CREATE OR REPLACE FUNCTION public.mark_order_paid_on_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.fulfillment_status IN ('confirmed', 'shipped', 'done')
     AND (TG_OP = 'INSERT' OR OLD.fulfillment_status IS DISTINCT FROM NEW.fulfillment_status) THEN
    UPDATE public.orders o
       SET payment_status = 'paid',
           paid_at = COALESCE(o.paid_at, now())
     WHERE o.id = NEW.order_id
       AND o.payment_status <> 'paid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_mark_paid ON public.order_items;
CREATE TRIGGER order_items_mark_paid
AFTER INSERT OR UPDATE OF fulfillment_status ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.mark_order_paid_on_confirm();

UPDATE public.orders o
   SET payment_status = 'paid', paid_at = COALESCE(o.paid_at, now())
 WHERE o.payment_status <> 'paid'
   AND EXISTS (
     SELECT 1 FROM public.order_items i
      WHERE i.order_id = o.id
        AND i.fulfillment_status IN ('confirmed', 'shipped', 'done')
   );