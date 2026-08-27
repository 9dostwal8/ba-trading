ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'products',
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS min_qty integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_discount numeric,
  ADD COLUMN IF NOT EXISTS buy_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS get_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.offers SET scope = 'products' WHERE scope NOT IN ('products','category','brand','all');

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_scope_check;
ALTER TABLE public.offers ADD CONSTRAINT offers_scope_check
  CHECK (scope IN ('products','category','brand','all'));

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_discount_type_check;
ALTER TABLE public.offers ADD CONSTRAINT offers_discount_type_check
  CHECK (discount_type IN ('percent','fixed','fixed_price','bxgy'));

ALTER TABLE public.offers DROP CONSTRAINT IF EXISTS offers_values_check;
ALTER TABLE public.offers ADD CONSTRAINT offers_values_check
  CHECK (
    discount_value >= 0
    AND min_qty >= 1
    AND buy_qty >= 0
    AND get_qty >= 0
    AND (max_discount IS NULL OR max_discount >= 0)
    AND (discount_type <> 'percent' OR discount_value <= 100)
    AND (discount_type <> 'bxgy' OR (buy_qty >= 1 AND get_qty >= 1))
  );

DROP TRIGGER IF EXISTS offers_touch ON public.offers;
CREATE TRIGGER offers_touch BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();