ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_hash TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_content_hash_ready
  ON documents (content_hash)
  WHERE content_hash <> '' AND status IN ('pending', 'processing', 'ready');