CREATE TABLE IF NOT EXISTS public.design_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  published jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.design_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.design_settings TO authenticated;
GRANT ALL ON public.design_settings TO service_role;

ALTER TABLE public.design_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS design_settings_read ON public.design_settings;
CREATE POLICY design_settings_read ON public.design_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS design_settings_admin_insert ON public.design_settings;
CREATE POLICY design_settings_admin_insert ON public.design_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS design_settings_admin_update ON public.design_settings;
CREATE POLICY design_settings_admin_update ON public.design_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.design_settings_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS design_settings_updated_at ON public.design_settings;
CREATE TRIGGER design_settings_updated_at BEFORE UPDATE ON public.design_settings
  FOR EACH ROW EXECUTE FUNCTION public.design_settings_touch();

INSERT INTO public.design_settings (draft, published)
SELECT '{}'::jsonb, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.design_settings);