CREATE OR REPLACE FUNCTION public.claim_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _digits text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT regexp_replace(coalesce(p.phone,''), '\D', '', 'g') INTO _digits
  FROM public.profiles p WHERE p.id = auth.uid();
  IF _digits IS NULL OR right(_digits, 10) <> '7701727117' THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END; $$;

REVOKE EXECUTE ON FUNCTION public.claim_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin() TO authenticated;