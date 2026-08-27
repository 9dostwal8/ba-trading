ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS cost_usd_per_credit numeric NOT NULL DEFAULT 0.015,
  ADD COLUMN IF NOT EXISTS cost_subscription_usd numeric NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS cost_fixed_credits numeric NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS cost_credits_per_order numeric NOT NULL DEFAULT 0.9,
  ADD COLUMN IF NOT EXISTS cost_credits_per_vendor numeric NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS cost_credits_per_dentist numeric NOT NULL DEFAULT 0.4,
  ADD COLUMN IF NOT EXISTS cost_usd_iqd_rate numeric NOT NULL DEFAULT 1320;