CREATE TABLE public.ui_texts (
  key text PRIMARY KEY,
  section text NOT NULL DEFAULT 'other',
  ar text NOT NULL DEFAULT '',
  ku text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ui_texts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ui_texts TO authenticated;
GRANT ALL ON public.ui_texts TO service_role;

ALTER TABLE public.ui_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ui_texts_public_read" ON public.ui_texts FOR SELECT USING (true);
CREATE POLICY "ui_texts_admin_write" ON public.ui_texts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ui_texts_touch BEFORE UPDATE ON public.ui_texts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();