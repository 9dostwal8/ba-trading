ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS tagline_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tagline_ku text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS about_ar text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS about_ku text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hue numeric NOT NULL DEFAULT 250,
  ADD COLUMN IF NOT EXISTS chroma numeric NOT NULL DEFAULT 0.12;

CREATE OR REPLACE FUNCTION public.vendor_slugify(_name text, _id uuid)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(nullif(regexp_replace(lower(trim(_name)), '[^a-z0-9]+', '-', 'g'), '-'), '') || '-' || left(replace(_id::text, '-', ''), 6)
$$;

UPDATE public.vendors SET slug = public.vendor_slugify(name, id) WHERE slug IS NULL OR slug = '';
UPDATE public.vendors SET code = 'V' || upper(left(replace(id::text, '-', ''), 8)) WHERE code IS NULL OR code = '';

ALTER TABLE public.vendors ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.vendors ALTER COLUMN code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS vendors_slug_key ON public.vendors (slug);
CREATE UNIQUE INDEX IF NOT EXISTS vendors_code_key ON public.vendors (code);

CREATE OR REPLACE FUNCTION public.vendors_fill_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.vendor_slugify(NEW.name, NEW.id);
  END IF;
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := 'V' || upper(left(replace(NEW.id::text, '-', ''), 8));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendors_fill_identity_trg ON public.vendors;
CREATE TRIGGER vendors_fill_identity_trg BEFORE INSERT OR UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.vendors_fill_identity();

DROP POLICY IF EXISTS "vendors public read active" ON public.vendors;
CREATE POLICY "vendors public read active" ON public.vendors
FOR SELECT TO anon, authenticated USING (is_active = true);

GRANT SELECT ON public.vendors TO anon;
GRANT SELECT ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
REVOKE EXECUTE ON FUNCTION public.vendor_slugify(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.vendors_fill_identity() FROM PUBLIC, anon;