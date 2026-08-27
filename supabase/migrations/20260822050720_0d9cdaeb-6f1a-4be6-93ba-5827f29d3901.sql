ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS lang_ar_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lang_ku_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lang_en_enabled boolean NOT NULL DEFAULT true;