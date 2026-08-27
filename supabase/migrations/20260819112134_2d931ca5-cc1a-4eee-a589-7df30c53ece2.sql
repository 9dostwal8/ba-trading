CREATE TABLE IF NOT EXISTS public.brand_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mark TEXT NOT NULL DEFAULT '',
  match_key TEXT NOT NULL DEFAULT '',
  logo_domain TEXT,
  logo_url TEXT,
  hue NUMERIC NOT NULL DEFAULT 250,
  chroma NUMERIC NOT NULL DEFAULT 0.17,
  product_ids UUID[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.brand_cards TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_cards TO authenticated;
GRANT ALL ON public.brand_cards TO service_role;

ALTER TABLE public.brand_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand cards public read" ON public.brand_cards;
CREATE POLICY "brand cards public read" ON public.brand_cards FOR SELECT USING (true);
DROP POLICY IF EXISTS "admins manage brand cards" ON public.brand_cards;
CREATE POLICY "admins manage brand cards" ON public.brand_cards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS brand_cards_touch ON public.brand_cards;
CREATE TRIGGER brand_cards_touch BEFORE UPDATE ON public.brand_cards
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.brand_cards (name, mark, match_key, logo_domain, hue, chroma, sort_order) VALUES
  ('3M', '3M', '3m', '3m.com', 25, 0.21, 1),
  ('GC', 'GC', 'gc', 'gc.dental', 15, 0.20, 2),
  ('Tokuyama', 'TK', 'tokuyama', 'tokuyama-dental.com', 340, 0.17, 3),
  ('BISCO', 'BS', 'bisco', 'bisco.com', 250, 0.18, 4),
  ('Orodeka', 'OD', 'orodeka', 'orodeka.com', 195, 0.16, 5),
  ('Eighteeth', '8T', 'eighteeth', 'eighteeth.com', 275, 0.18, 6),
  ('Dentsply Sirona', 'DS', 'dentsply', 'dentsplysirona.com', 155, 0.14, 7),
  ('Ivoclar', 'IV', 'ivoclar', 'ivoclar.com', 40, 0.16, 8),
  ('Kerr', 'KR', 'kerr', 'kerrdental.com', 255, 0.19, 9),
  ('VOCO', 'VC', 'voco', 'voco.dental', 205, 0.15, 10),
  ('Coltene', 'CL', 'coltene', 'coltene.com', 140, 0.14, 11),
  ('NSK', 'NSK', 'nsk', 'nsk-dental.com', 265, 0.18, 12),
  ('Woodpecker', 'WP', 'woodpecker', 'woodpeckerdental.com', 50, 0.16, 13),
  ('Meta Biomed', 'MB', 'meta', 'meta-biomed.com', 230, 0.17, 14),
  ('Septodont', 'SP', 'septodont', 'septodont.com', 10, 0.19, 15),
  ('Vericom', 'VR', 'vericom', 'vericom.co.kr', 190, 0.15, 16);