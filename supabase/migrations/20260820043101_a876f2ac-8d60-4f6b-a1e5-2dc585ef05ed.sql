CREATE TABLE public.usp_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  icon text NOT NULL DEFAULT 'badge-check',
  title_ar text NOT NULL DEFAULT '',
  title_ku text NOT NULL DEFAULT '',
  hue numeric NOT NULL DEFAULT 250,
  chroma numeric NOT NULL DEFAULT 0.16,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.usp_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usp_items TO authenticated;
GRANT ALL ON public.usp_items TO service_role;

ALTER TABLE public.usp_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active highlights" ON public.usp_items
  FOR SELECT USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage highlights" ON public.usp_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER usp_items_touch BEFORE UPDATE ON public.usp_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.usp_items (icon, title_ar, title_ku, hue, chroma, sort_order) VALUES
  ('badge-check', 'منتجات أصلية', 'بەرهەمی ڕەسەن', 250, 0.16, 1),
  ('truck', 'توصيل لكل العراق', 'گەیاندن بۆ هەموو عێراق', 160, 0.14, 2),
  ('wallet', 'أسعار الجملة', 'نرخی کۆ', 40, 0.16, 3),
  ('headphones', 'دعم واتساب', 'پشتگیری واتساب', 300, 0.15, 4);