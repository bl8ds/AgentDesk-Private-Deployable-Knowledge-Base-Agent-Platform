ALTER TABLE runtime_ai_settings
  ADD COLUMN IF NOT EXISTS think_model TEXT NOT NULL DEFAULT '';