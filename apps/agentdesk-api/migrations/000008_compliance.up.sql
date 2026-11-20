CREATE TABLE IF NOT EXISTS compliance_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    -- off | warn | block
    input_action TEXT NOT NULL DEFAULT 'block',
    -- off | warn | redact
    output_action TEXT NOT NULL DEFAULT 'redact',
    mask TEXT NOT NULL DEFAULT '***',
    refuse_without_evidence BOOLEAN NOT NULL DEFAULT TRUE,
    refusal_template TEXT NOT NULL DEFAULT '抱歉，当前知识库中没有足够依据回答这个问题。请补充相关资料后再试，或联系管理员。',
    low_confidence_hint TEXT NOT NULL DEFAULT '以上内容仅供参考，请结合原始资料核实。',
    updated_by TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO compliance_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS sensitive_terms (
    id UUID PRIMARY KEY,
    term TEXT NOT NULL,
    -- warn | block
    level TEXT NOT NULL DEFAULT 'block',
    category TEXT NOT NULL DEFAULT '',
    suggestion TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_sensitive_terms_term ON sensitive_terms (lower(term));
CREATE INDEX IF NOT EXISTS ix_sensitive_terms_enabled ON sensitive_terms (enabled);
