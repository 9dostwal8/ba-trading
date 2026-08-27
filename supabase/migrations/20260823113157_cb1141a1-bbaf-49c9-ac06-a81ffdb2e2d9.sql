CREATE TABLE public.page_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page text NOT NULL,
  kind text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.page_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_blocks TO authenticated;
GRANT ALL ON public.page_blocks TO service_role;

ALTER TABLE public.page_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_blocks_public_read" ON public.page_blocks
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "page_blocks_admin_write" ON public.page_blocks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX page_blocks_page_sort_idx ON public.page_blocks (page, sort_order);

CREATE OR REPLACE FUNCTION public.page_blocks_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER page_blocks_touch BEFORE UPDATE ON public.page_blocks
  FOR EACH ROW EXECUTE FUNCTION public.page_blocks_touch();

INSERT INTO public.page_blocks (page, kind, sort_order, config) VALUES
  ('home', 'section', 10, '{"section":"banners"}'),
  ('home', 'section', 20, '{"section":"categories"}'),
  ('home', 'section', 30, '{"section":"hero"}'),
  ('home', 'section', 40, '{"section":"usp"}'),
  ('home', 'section', 50, '{"section":"banner_slot","slot":"home_below_hero"}'),
  ('home', 'section', 60, '{"section":"expiring"}'),
  ('home', 'section', 70, '{"section":"outlet"}'),
  ('home', 'section', 80, '{"section":"offers"}'),
  ('home', 'section', 90, '{"section":"banner_slot","slot":"home_mid"}'),
  ('home', 'section', 100, '{"section":"bundles"}'),
  ('home', 'section', 110, '{"section":"brands"}'),
  ('home', 'section', 120, '{"section":"featured"}'),
  ('home', 'section', 130, '{"section":"newest"}'),
  ('home', 'section', 140, '{"section":"vendor_rail"}'),
  ('home', 'section', 150, '{"section":"how_it_works"}'),
  ('home', 'section', 160, '{"section":"help_cta"}'),
  ('home', 'section', 170, '{"section":"banner_slot","slot":"home_footer"}');