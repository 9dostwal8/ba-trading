CREATE OR REPLACE FUNCTION public.charge_product_clearance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
  amt numeric;
  dur integer;
  exists_recent boolean;
BEGIN
  IF NEW.vendor_id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.clearance_kind, 'none') NOT IN ('near_expiry', 'outlet') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.clearance_kind, 'none') = COALESCE(NEW.clearance_kind, 'none') THEN
    RETURN NEW;
  END IF;

  k := NEW.clearance_kind;
  amt := public.marketing_price(k);
  IF amt <= 0 THEN RETURN NEW; END IF;

  SELECT COALESCE((SELECT p.duration_days FROM public.marketing_plans p WHERE p.kind = k), 30)
  INTO dur;
  IF dur IS NULL OR dur <= 0 THEN dur := 30; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.vendor_charges c
    WHERE c.vendor_id = NEW.vendor_id
      AND c.kind = k
      AND c.ref_id = NEW.id
      AND c.created_at > now() - (dur || ' days')::interval
  ) INTO exists_recent;
  IF exists_recent THEN RETURN NEW; END IF;

  INSERT INTO public.vendor_charges (vendor_id, kind, ref_id, label, amount)
  VALUES (NEW.vendor_id, k, NEW.id, COALESCE(NEW.name_ar, NEW.sku, ''), amt);

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS products_charge_clearance ON public.products;
CREATE TRIGGER products_charge_clearance
AFTER INSERT OR UPDATE OF clearance_kind ON public.products
FOR EACH ROW EXECUTE FUNCTION public.charge_product_clearance();