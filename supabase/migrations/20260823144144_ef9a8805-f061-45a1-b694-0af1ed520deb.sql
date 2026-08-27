CREATE TABLE IF NOT EXISTS public.badge_fees (
  badge_key text PRIMARY KEY,
  is_paid boolean NOT NULL DEFAULT true,
  price numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.badge_fees TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badge_fees TO authenticated;
GRANT ALL ON public.badge_fees TO service_role;

ALTER TABLE public.badge_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS badge_fees_read ON public.badge_fees;
CREATE POLICY badge_fees_read ON public.badge_fees FOR SELECT USING (true);

DROP POLICY IF EXISTS badge_fees_admin ON public.badge_fees;
CREATE POLICY badge_fees_admin ON public.badge_fees FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.badge_fees (badge_key, is_paid, price, sort_order) VALUES
  ('discount', false, 0, 1),
  ('premium', true, 0, 2),
  ('hot', true, 0, 3),
  ('special', true, 0, 4),
  ('new', false, 0, 5),
  ('bestseller', true, 0, 6),
  ('freeship', false, 0, 7),
  ('limited', false, 0, 8),
  ('gift', true, 0, 9),
  ('trending', true, 0, 10)
ON CONFLICT (badge_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.badge_fee(_key text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN f.badge_key IS NULL THEN public.marketing_price('badge')
    WHEN f.is_paid IS NOT TRUE THEN 0
    WHEN COALESCE(f.price, 0) > 0 THEN f.price
    ELSE public.marketing_price('badge')
  END
  FROM (SELECT 1) x
  LEFT JOIN public.badge_fees f ON f.badge_key = _key
$$;

REVOKE ALL ON FUNCTION public.badge_fee(text) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.charge_product_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  amt numeric;
  b text;
  old_badges text[] := CASE WHEN TG_OP = 'UPDATE' THEN COALESCE(OLD.badges, '{}') ELSE '{}' END;
BEGIN
  IF NEW.vendor_id IS NULL THEN RETURN NEW; END IF;
  FOREACH b IN ARRAY COALESCE(NEW.badges, '{}'::text[]) LOOP
    IF NOT (b = ANY (old_badges)) THEN
      amt := public.badge_fee(b);
      IF COALESCE(amt, 0) > 0 THEN
        INSERT INTO public.vendor_charges (vendor_id, kind, ref_id, label, amount)
        VALUES (NEW.vendor_id, 'badge', NEW.id, b, amt);
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.charge_product_badges() FROM anon, authenticated;