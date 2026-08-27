CREATE TABLE public.page_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page text NOT NULL UNIQUE,
  draft jsonb NOT NULL DEFAULT '{"version":1,"modules":[]}'::jsonb,
  published jsonb NOT NULL DEFAULT '{"version":1,"modules":[]}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

GRANT SELECT ON public.page_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_documents TO authenticated;
GRANT ALL ON public.page_documents TO service_role;

ALTER TABLE public.page_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "page_documents_public_read"
ON public.page_documents
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "page_documents_admin_write"
ON public.page_documents
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX page_documents_page_idx ON public.page_documents (page);

CREATE TRIGGER page_documents_touch
BEFORE UPDATE ON public.page_documents
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();