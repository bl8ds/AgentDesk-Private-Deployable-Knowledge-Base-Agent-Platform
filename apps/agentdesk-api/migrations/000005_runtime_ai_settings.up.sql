CREATE TABLE IF NOT EXISTS runtime_ai_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    chat_base_url TEXT NOT NULL DEFAULT '',
    chat_model TEXT NOT NULL DEFAULT '',
    think_model TEXT NOT NULL DEFAULT '',
    embedding_base_url TEXT NOT NULL DEFAULT '',
    embedding_model TEXT NOT NULL DEFAULT '',
    embedding_dimension INT NOT NULL DEFAULT 1536,
    vision_base_url TEXT NOT NULL DEFAULT '',
    vision_model TEXT NOT NULL DEFAULT '',
    retrieval_top_k INT NOT NULL DEFAULT 4,
    snippet_max_chars INT NOT NULL DEFAULT 240,
    -- AES-GCM sealed JSON: {"chat_api_key":"...","embedding_api_key":"...","vision_api_key":"..."}
    secrets_ciphertext TEXT NOT NULL DEFAULT '',
    chat_key_set BOOLEAN NOT NULL DEFAULT FALSE,
    embedding_key_set BOOLEAN NOT NULL DEFAULT FALSE,
    vision_key_set BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);