-- Migration: Allow admins to manage (insert, update, delete) profiles for staff
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'admins manage profiles'
  ) THEN
    CREATE POLICY "admins manage profiles" ON public.profiles
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
