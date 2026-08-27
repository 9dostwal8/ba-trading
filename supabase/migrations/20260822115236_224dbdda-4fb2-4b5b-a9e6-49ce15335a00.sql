ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS show_reward_bar boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reward_bar_link text NOT NULL DEFAULT '/rewards',
  ADD COLUMN IF NOT EXISTS show_vendor_join_cta boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS vendor_join_cta_link text NOT NULL DEFAULT '/vendor-signup';

-- Ensure the single settings row has the new defaults if it was inserted before this migration.
UPDATE public.store_settings
SET show_reward_bar = true,
    reward_bar_link = '/rewards',
    show_vendor_join_cta = true,
    vendor_join_cta_link = '/vendor-signup'
WHERE show_reward_bar IS NULL OR reward_bar_link IS NULL OR show_vendor_join_cta IS NULL OR vendor_join_cta_link IS NULL;