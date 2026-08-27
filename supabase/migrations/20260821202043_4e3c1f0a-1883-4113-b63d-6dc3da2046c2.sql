CREATE TABLE public.marketing_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kind text NOT NULL UNIQUE,
  price numeric NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  vendor_allowed boolean NOT NULL DEFAULT true,
  note_ar text NOT NULL DEFAULT '',
  note_ku text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketing_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_plans TO authenticated;
GRANT ALL ON public.marketing_plans TO service_role;

ALTER TABLE public.marketing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_plans_read" ON public.marketing_plans
  FOR SELECT USING (true);

CREATE POLICY "marketing_plans_admin_write" ON public.marketing_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER marketing_plans_touch BEFORE UPDATE ON public.marketing_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.marketing_plans (kind, price, duration_days, sort_order, note_ar, note_ku)
SELECT 'flash_deal', COALESCE(s.price_flash_deal, 0), 30, 1, '', '' FROM public.store_settings s LIMIT 1;
INSERT INTO public.marketing_plans (kind, price, duration_days, sort_order, note_ar, note_ku)
SELECT 'offer', COALESCE(s.price_offer, 0), 30, 2, '', '' FROM public.store_settings s LIMIT 1;
INSERT INTO public.marketing_plans (kind, price, duration_days, sort_order, note_ar, note_ku)
SELECT 'bundle', COALESCE(s.price_bundle, 0), 30, 3, '', '' FROM public.store_settings s LIMIT 1;
INSERT INTO public.marketing_plans (kind, price, duration_days, sort_order, note_ar, note_ku)
SELECT 'badge', COALESCE(s.price_badge, 0), 30, 4, '', '' FROM public.store_settings s LIMIT 1;
INSERT INTO public.marketing_plans (kind, price, duration_days, sort_order, note_ar, note_ku)
VALUES ('near_expiry', 0, 30, 5, '', ''), ('outlet', 0, 30, 6, '', '');

CREATE OR REPLACE FUNCTION public.marketing_price(_kind text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.price FROM public.marketing_plans p WHERE p.kind = _kind),
    (SELECT CASE _kind
      WHEN 'flash_deal' THEN s.price_flash_deal
      WHEN 'offer' THEN s.price_offer
      WHEN 'bundle' THEN s.price_bundle
      WHEN 'badge' THEN s.price_badge
      ELSE 0
    END FROM public.store_settings s LIMIT 1),
    0)
$$;

REVOKE EXECUTE ON FUNCTION public.marketing_price(text) FROM PUBLIC, anon, authenticated;