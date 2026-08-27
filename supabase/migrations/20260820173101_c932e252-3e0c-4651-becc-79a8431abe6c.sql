ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('paid','unpaid'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.vendor_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  period text NOT NULL,
  commission_total numeric NOT NULL DEFAULT 0,
  marketing_total numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid','unpaid')),
  note text NOT NULL DEFAULT '',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, period)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_settlements TO authenticated;
GRANT ALL ON public.vendor_settlements TO service_role;
ALTER TABLE public.vendor_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendor_settlements_admin_all ON public.vendor_settlements;
CREATE POLICY vendor_settlements_admin_all ON public.vendor_settlements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS vendor_settlements_vendor_read ON public.vendor_settlements;
CREATE POLICY vendor_settlements_vendor_read ON public.vendor_settlements FOR SELECT TO authenticated
  USING (vendor_id IN (SELECT my_vendor_ids()));

DROP TRIGGER IF EXISTS touch_vendor_settlements ON public.vendor_settlements;
CREATE TRIGGER touch_vendor_settlements BEFORE UPDATE ON public.vendor_settlements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();