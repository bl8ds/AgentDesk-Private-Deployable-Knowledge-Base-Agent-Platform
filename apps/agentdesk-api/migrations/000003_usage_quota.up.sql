CREATE TABLE IF NOT EXISTS usage_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             TEXT NOT NULL,
    request_id          TEXT NOT NULL DEFAULT '',
    model               TEXT NOT NULL DEFAULT '',
    prompt_tokens       BIGINT NOT NULL DEFAULT 0,
    completion_tokens   BIGINT NOT NULL DEFAULT 0,
    reasoning_tokens    BIGINT NOT NULL DEFAULT 0,
    total_tokens        BIGINT NOT NULL DEFAULT 0,
    meta                JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user_created
  ON usage_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_user_month
  ON usage_events (user_id, date_trunc('month', created_at AT TIME ZONE 'UTC'));

CREATE TABLE IF NOT EXISTS user_quotas (
    user_id         TEXT PRIMARY KEY,
    token_limit     BIGINT NOT NULL,
    note            TEXT NOT NULL DEFAULT '',
    updated_by      TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);