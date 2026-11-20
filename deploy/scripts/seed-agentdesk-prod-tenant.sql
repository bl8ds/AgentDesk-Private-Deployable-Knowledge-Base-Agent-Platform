-- AgentDesk PROD/演示租户 + 账号 + OIDC clients（idempotent）
-- 禁止改动开发租户 slug=agentdesk 的数据。

-- Tenant：AgentDesk正式演示
INSERT INTO tenants (id, name, slug, settings, status, created_at, updated_at)
VALUES (
  'b2000000-0000-4000-8000-000000000001',
  'AgentDesk正式',
  'agentdesk-prod',
  '{"branding":{"locale":"zh","title":"AgentDesk","background":"solid","primary_color":"#5B6B5A","background_color":"#F7F7F8"}}'::jsonb,
  'active',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  settings = EXCLUDED.settings,
  status = 'active',
  deleted_at = NULL,
  updated_at = NOW();

UPDATE tenants SET
  name = 'AgentDesk正式',
  settings = COALESCE(settings, '{}'::jsonb) || '{"branding":{"locale":"zh","title":"AgentDesk","background":"solid","primary_color":"#5B6B5A","background_color":"#F7F7F8"}}'::jsonb,
  updated_at = NOW()
WHERE slug = 'agentdesk-prod';

INSERT INTO users (id, tenant_id, username, email, role, is_verified, created_at, updated_at)
VALUES
  (
    'b2000000-0000-4000-8000-000000000010',
    'b2000000-0000-4000-8000-000000000001',
    'AgentDesk管理员',
    'admin@agentdesk-prod.example',
    'admin',
    true,
    NOW(), NOW()
  ),
  (
    'b2000000-0000-4000-8000-000000000020',
    'b2000000-0000-4000-8000-000000000001',
    'AgentDesk演示一',
    'demo1@agentdesk-prod.example',
    'user',
    true,
    NOW(), NOW()
  ),
  (
    'b2000000-0000-4000-8000-000000000021',
    'b2000000-0000-4000-8000-000000000001',
    'AgentDesk演示二',
    'demo2@agentdesk-prod.example',
    'user',
    true,
    NOW(), NOW()
  ),
  (
    'b2000000-0000-4000-8000-000000000022',
    'b2000000-0000-4000-8000-000000000001',
    'AgentDesk演示三',
    'demo3@agentdesk-prod.example',
    'user',
    true,
    NOW(), NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_verified = true,
  deleted_at = NULL,
  updated_at = NOW();

-- 密码 CHANGE_ME （bcrypt cost 12，与开发 seed 相同哈希）
INSERT INTO user_passwords (id, tenant_id, user_id, password_hash, last_changed_at, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u.tenant_id,
  u.id,
  '$2a$12$REPLACE_WITH_BCRYPT_HASH_OF_CHANGE_ME',
  NOW(), NOW(), NOW()
FROM users u
WHERE u.email IN (
  'admin@agentdesk-prod.example',
  'demo1@agentdesk-prod.example',
  'demo2@agentdesk-prod.example',
  'demo3@agentdesk-prod.example'
)
  AND u.deleted_at IS NULL
ON CONFLICT (user_id) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  tenant_id = EXCLUDED.tenant_id,
  last_changed_at = NOW(),
  updated_at = NOW();

INSERT INTO oauth2_clients (
    id, tenant_id, client_id, name, app_type, status,
    allowed_callback_urls, allowed_logout_urls, allowed_web_origins,
    grant_types, login_methods,
    access_token_minutes, refresh_token_days, max_sessions_per_user,
    settings, created_at, updated_at
)
VALUES (
    'b1000000-0000-4000-8000-000000000001',
    'b2000000-0000-4000-8000-000000000001',
    'agentdesk_prod_admin_spa',
    'AgentDesk管理后台',
    'spa',
    'active',
    '["https://agentdesk-prod-admin.example.com/oauth/callback"]'::jsonb,
    '["https://agentdesk-prod-admin.example.com","https://agentdesk-prod-admin.example.com/"]'::jsonb,
    '["https://agentdesk-prod-admin.example.com"]'::jsonb,
    '["authorization_code","refresh_token"]'::jsonb,
    '{"enabled":["signin.email_password","signin.email_code"]}'::jsonb,
    60, 14, 10,
    '{"product":"agentdesk-prod","access":{"allowed_roles":["admin","platform_admin"]},"branding":{"locale":"zh","title":"AgentDesk"}}'::jsonb,
    NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    allowed_callback_urls = EXCLUDED.allowed_callback_urls,
    allowed_logout_urls = EXCLUDED.allowed_logout_urls,
    allowed_web_origins = EXCLUDED.allowed_web_origins,
    settings = EXCLUDED.settings,
    updated_at = NOW();

INSERT INTO oauth2_clients (
    id, tenant_id, client_id, name, app_type, status,
    allowed_callback_urls, allowed_logout_urls, allowed_web_origins,
    grant_types, login_methods,
    access_token_minutes, refresh_token_days, max_sessions_per_user,
    settings, created_at, updated_at
)
VALUES (
    'b1000000-0000-4000-8000-000000000002',
    'b2000000-0000-4000-8000-000000000001',
    'agentdesk_prod_chat_spa',
    'AgentDesk正式智能对话',
    'spa',
    'active',
    '["https://agentdesk-prod-chat.example.com/oauth/callback"]'::jsonb,
    '["https://agentdesk-prod-chat.example.com","https://agentdesk-prod-chat.example.com/"]'::jsonb,
    '["https://agentdesk-prod-chat.example.com"]'::jsonb,
    '["authorization_code","refresh_token"]'::jsonb,
    '{"enabled":["signin.email_password","signin.email_code"]}'::jsonb,
    60, 14, 10,
    '{"product":"agentdesk-prod","branding":{"locale":"zh","title":"AgentDesk"}}'::jsonb,
    NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    allowed_callback_urls = EXCLUDED.allowed_callback_urls,
    allowed_logout_urls = EXCLUDED.allowed_logout_urls,
    allowed_web_origins = EXCLUDED.allowed_web_origins,
    settings = EXCLUDED.settings,
    updated_at = NOW();

UPDATE oauth2_clients SET
  tenant_id = 'b2000000-0000-4000-8000-000000000001',
  name = 'AgentDesk管理后台',
  allowed_callback_urls = '["https://agentdesk-prod-admin.example.com/oauth/callback"]'::jsonb,
  allowed_logout_urls = '["https://agentdesk-prod-admin.example.com","https://agentdesk-prod-admin.example.com/"]'::jsonb,
  allowed_web_origins = '["https://agentdesk-prod-admin.example.com"]'::jsonb,
  settings = '{"product":"agentdesk-prod","access":{"allowed_roles":["admin","platform_admin"]},"branding":{"locale":"zh","title":"AgentDesk"}}'::jsonb,
  status = 'active',
  updated_at = NOW()
WHERE client_id = 'agentdesk_prod_admin_spa';

UPDATE oauth2_clients SET
  tenant_id = 'b2000000-0000-4000-8000-000000000001',
  name = 'AgentDesk正式智能对话',
  allowed_callback_urls = '["https://agentdesk-prod-chat.example.com/oauth/callback"]'::jsonb,
  allowed_logout_urls = '["https://agentdesk-prod-chat.example.com","https://agentdesk-prod-chat.example.com/"]'::jsonb,
  allowed_web_origins = '["https://agentdesk-prod-chat.example.com"]'::jsonb,
  settings = '{"product":"agentdesk-prod","branding":{"locale":"zh","title":"AgentDesk"}}'::jsonb,
  status = 'active',
  updated_at = NOW()
WHERE client_id = 'agentdesk_prod_chat_spa';