CREATE TABLE IF NOT EXISTS quota_global (
    id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    -- shared: all users share one monthly pool
    -- per_user_default: each user without a personal row gets this limit independently
    mode            TEXT NOT NULL DEFAULT 'shared'
                      CHECK (mode IN ('shared', 'per_user_default')),
    token_limit     BIGINT NOT NULL DEFAULT 1000000,
    note            TEXT NOT NULL DEFAULT '',
    updated_by      TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO quota_global (id, mode, token_limit, note)
VALUES (1, 'shared', 1000000, 'default shared pool')
ON CONFLICT (id) DO NOTHING;