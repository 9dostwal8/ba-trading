ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS qi_payment_id text,
  ADD COLUMN IF NOT EXISTS qi_request_id text,
  ADD COLUMN IF NOT EXISTS qi_status text,
  ADD COLUMN IF NOT EXISTS qi_form_url text;

CREATE INDEX IF NOT EXISTS orders_qi_payment_id_idx ON public.orders (qi_payment_id);