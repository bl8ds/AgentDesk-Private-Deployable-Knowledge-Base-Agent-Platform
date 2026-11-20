CREATE TABLE IF NOT EXISTS agent_tools (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    -- builtin | http
    kind TEXT NOT NULL DEFAULT 'http',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    input_schema JSONB NOT NULL DEFAULT '{"type":"object","properties":{}}'::jsonb,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_agent_tools_name ON agent_tools (name);
CREATE INDEX IF NOT EXISTS ix_agent_tools_enabled ON agent_tools (enabled);

-- Built-ins are enabled by default; their handlers ship with the agent runtime.
INSERT INTO agent_tools (id, name, label, description, kind, config, input_schema, enabled)
VALUES
    (
        '00000000-0000-4000-8000-000000000001'::uuid,
        'current_time',
        '当前时间',
        '返回服务端当前日期与时间（ISO 8601 与时区）。用于回答"现在几点""今天日期"等时效性问题。',
        'builtin',
        '{"builtin":"current_time"}'::jsonb,
        '{"type":"object","properties":{}}'::jsonb,
        TRUE
    ),
    (
        '00000000-0000-4000-8000-000000000002'::uuid,
        'knowledge_search',
        '知识库检索',
        '按关键词对知识库做一次额外向量检索，返回带出处的片段。当已注入的知识片段不足、或用户追问细节时调用。',
        'builtin',
        '{"builtin":"knowledge_search"}'::jsonb,
        '{"type":"object","properties":{"query":{"type":"string","description":"检索关键词"},"top_k":{"type":"number","description":"返回片段数量，默认 3，最大 10"}},"required":["query"]}'::jsonb,
        TRUE
    )
ON CONFLICT (id) DO NOTHING;
