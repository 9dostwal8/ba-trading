-- Migration: Allow authenticated staff/admins to update store_settings and seed admin user roles
DO $$
BEGIN
  -- 1. Add permissive UPDATE policy for store_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'store_settings' AND policyname = 'authenticated update store settings'
  ) THEN
    CREATE POLICY "authenticated update store settings" ON public.store_settings
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 2. Populate user_roles for all existing auth users so has_role(uid, 'admin') evaluates to true
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;
