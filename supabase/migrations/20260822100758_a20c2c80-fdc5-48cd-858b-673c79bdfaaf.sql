CREATE TABLE public.vendor_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name text NOT NULL,
  city text NOT NULL DEFAULT '',
  address_line text NOT NULL DEFAULT '',
  phone text NOT NULL,
  user_id uuid,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  note text NOT NULL DEFAULT '',
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX vendor_applications_phone_key ON public.vendor_applications (phone);

GRANT SELECT, UPDATE, DELETE ON public.vendor_applications TO authenticated;
GRANT ALL ON public.vendor_applications TO service_role;

ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read vendor applications"
ON public.vendor_applications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update vendor applications"
ON public.vendor_applications FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete vendor applications"
ON public.vendor_applications FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER vendor_applications_touch
BEFORE UPDATE ON public.vendor_applications
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();