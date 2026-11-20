ALTER TABLE runtime_ai_settings
  ADD COLUMN IF NOT EXISTS embedding_dimension INT NOT NULL DEFAULT 1536;