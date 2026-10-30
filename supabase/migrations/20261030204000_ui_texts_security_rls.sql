-- Migration: Secure ui_texts table against data exposure and enforce strict Row Level Security (RLS)
--
-- Security issues addressed:
-- 1. ui_texts was originally created with `USING (true)` for public SELECT, exposing sensitive
--    sections like 'staff_credentials' (staff full names, emails, phone numbers, roles), 'deleted_users',
--    and user metadata to unauthenticated users.
-- 2. ui_texts was restricted to admins for write (`has_role(auth.uid(), 'admin')`), preventing
--    regular authenticated users from persisting their own user carts ('user_cart_<userId>') and favorites.
--
-- Fix:
-- 1. Public (anon + authenticated) can ONLY select general localization/public UI strings
--    where the section is not sensitive and keys do not contain private staff or user data.
-- 2. Authenticated users can select and modify ONLY their own cart, city, and favorites entries
--    (matching their authenticated `auth.uid()`).
-- 3. Admins retain full read and write access across all sections (including staff credentials and translations).

DO $$
BEGIN
  -- Re-enable RLS on ui_texts
  ALTER TABLE public.ui_texts ENABLE ROW LEVEL SECURITY;

  -- Drop legacy broad/insecure policies
  DROP POLICY IF EXISTS "ui_texts_public_read" ON public.ui_texts;
  DROP POLICY IF EXISTS "ui_texts_admin_write" ON public.ui_texts;
  DROP POLICY IF EXISTS "ui_texts_read_public" ON public.ui_texts;
  DROP POLICY IF EXISTS "ui_texts_user_read_own" ON public.ui_texts;
  DROP POLICY IF EXISTS "ui_texts_user_write_own" ON public.ui_texts;
  DROP POLICY IF EXISTS "ui_texts_admin_all" ON public.ui_texts;
  DROP POLICY IF EXISTS "ui_texts_admin_manage" ON public.ui_texts;

  -- 1. Policy for Public (anon & authenticated): Read ONLY non-sensitive UI translation texts
  CREATE POLICY "ui_texts_read_public" ON public.ui_texts
    FOR SELECT
    USING (
      section NOT IN ('staff_credentials', 'deleted_users', 'user_cart', 'user_meta', 'user_favorites', 'private')
      AND key NOT LIKE 'staff_%'
      AND key NOT LIKE 'user_cart_%'
      AND key NOT LIKE 'user_city_%'
      AND key NOT LIKE 'user_fav_%'
    );

  -- 2. Policy for Authenticated Users: Read their OWN user-specific cart, city, and favorites
  CREATE POLICY "ui_texts_user_read_own" ON public.ui_texts
    FOR SELECT TO authenticated
    USING (
      auth.uid() IS NOT NULL
      AND (
        key = 'user_cart_' || auth.uid()::text
        OR key = 'user_city_' || auth.uid()::text
        OR key = 'user_favorites_' || auth.uid()::text
        OR key = 'user_fav_' || auth.uid()::text
      )
    );

  -- 3. Policy for Authenticated Users: Manage (INSERT, UPDATE, DELETE) their OWN cart, city, and favorites
  CREATE POLICY "ui_texts_user_write_own" ON public.ui_texts
    FOR ALL TO authenticated
    USING (
      auth.uid() IS NOT NULL
      AND (
        key = 'user_cart_' || auth.uid()::text
        OR key = 'user_city_' || auth.uid()::text
        OR key = 'user_favorites_' || auth.uid()::text
        OR key = 'user_fav_' || auth.uid()::text
      )
    )
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND (
        key = 'user_cart_' || auth.uid()::text
        OR key = 'user_city_' || auth.uid()::text
        OR key = 'user_favorites_' || auth.uid()::text
        OR key = 'user_fav_' || auth.uid()::text
      )
    );

  -- 4. Policy for Admins: Full access (ALL operations) to all rows including staff credentials and translations
  CREATE POLICY "ui_texts_admin_all" ON public.ui_texts
    FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));

END $$;

