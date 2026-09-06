-- 1. Cart Items Table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price numeric NOT NULL DEFAULT 0,
  bundle_id uuid REFERENCES public.bundles(id) ON DELETE CASCADE,
  bundle_title_ar text,
  bundle_title_ku text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS cart_items_user_id_idx ON public.cart_items (user_id);

-- Unique constraint per user, product, bundle
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_product_bundle_idx 
  ON public.cart_items (user_id, product_id, COALESCE(bundle_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cart_items_manage_own" ON public.cart_items;
CREATE POLICY "cart_items_manage_own" ON public.cart_items 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- 2. Product Favorites Table
CREATE TABLE IF NOT EXISTS public.product_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS product_favorites_user_id_idx ON public.product_favorites (user_id);
CREATE INDEX IF NOT EXISTS product_favorites_product_id_idx ON public.product_favorites (product_id);

GRANT SELECT, INSERT, DELETE ON public.product_favorites TO authenticated;
GRANT ALL ON public.product_favorites TO service_role;
ALTER TABLE public.product_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_manage_own" ON public.product_favorites;
CREATE POLICY "favorites_manage_own" ON public.product_favorites 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- 3. Product Reviews Updates
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS reviewer_name text DEFAULT '';

-- Allow any authenticated user with an account to insert ratings/reviews
DROP POLICY IF EXISTS "reviews_insert_own_purchase" ON public.product_reviews;
DROP POLICY IF EXISTS "reviews_insert_authenticated" ON public.product_reviews;
CREATE POLICY "reviews_insert_authenticated" ON public.product_reviews 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "reviews_update_authenticated" ON public.product_reviews;
CREATE POLICY "reviews_update_authenticated" ON public.product_reviews 
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());
