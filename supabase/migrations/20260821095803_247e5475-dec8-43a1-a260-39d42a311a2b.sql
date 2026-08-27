GRANT SELECT ON public.clearance_rules TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.clearance_rules TO authenticated;
GRANT ALL ON public.clearance_rules TO service_role;