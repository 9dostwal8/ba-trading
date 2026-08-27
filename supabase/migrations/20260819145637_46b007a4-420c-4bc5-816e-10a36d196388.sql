ALTER TABLE public.flash_deals
  ADD COLUMN IF NOT EXISTS starts_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS min_qty integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_discount numeric,
  ADD COLUMN IF NOT EXISTS max_qty_per_order integer,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

ALTER TABLE public.flash_deals DROP CONSTRAINT IF EXISTS flash_deals_discount_type_check;
ALTER TABLE public.flash_deals ADD CONSTRAINT flash_deals_discount_type_check
  CHECK (discount_type IN ('percent','fixed','fixed_price'));

ALTER TABLE public.flash_deals DROP CONSTRAINT IF EXISTS flash_deals_values_check;
ALTER TABLE public.flash_deals ADD CONSTRAINT flash_deals_values_check
  CHECK (
    discount_value >= 0
    AND (discount_type <> 'percent' OR discount_value <= 100)
    AND min_qty >= 1
    AND (max_discount IS NULL OR max_discount >= 0)
    AND (max_qty_per_order IS NULL OR max_qty_per_order >= 1)
  );