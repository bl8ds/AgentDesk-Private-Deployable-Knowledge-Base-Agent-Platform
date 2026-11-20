-- AgentDesk专有租户 + 运营/C 端账号 + OIDC SPA clients（idempotent）
-- Applied by: deploy/scripts/seed-agentdesk-oidc-clients.sh
-- openauth-auth: tenant isolation + client allowed_roles
-- 仅操作AgentDesk租户；禁止改动其他租户数据。

-- Tenant：AgentDesk
INSERT INTO tenants (id, name, slug, settings, status, created_at, updated_at)
VALUES (
  'a2000000-0000-4000-8000-000000000001',
  'AgentDesk',
  'agentdesk',
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
  name = 'AgentDesk',
  settings = COALESCE(settings, '{}'::jsonb) || '{"branding":{"locale":"zh","title":"AgentDesk","background":"solid","primary_color":"#5B6B5A","background_color":"#F7F7F8"}}'::jsonb,
  updated_at = NOW()
WHERE slug = 'agentdesk';

-- 运营账号
INSERT INTO users (id, tenant_id, username, email, role, is_verified, created_at, updated_at)
VALUES (
  'a2000000-0000-4000-8000-000000000010',
  'a2000000-0000-4000-8000-000000000001',
  'AgentDesk运营',
  'admin@agentdesk.example',
  'admin',
  true,
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  role = 'admin',
  is_verified = true,
  deleted_at = NULL,
  updated_at = NOW();

-- 历史 app@agentdesk.example → demo1@agentdesk.example（仅AgentDesk租户）
UPDATE users SET
  email = 'demo1@agentdesk.example',
  username = 'AgentDesk演示一',
  role = 'user',
  is_verified = true,
  deleted_at = NULL,
  updated_at = NOW()
WHERE tenant_id = 'a2000000-0000-4000-8000-000000000001'
  AND email = 'app@agentdesk.example';

-- C 端演示账号 demo1 / demo2 / demo3
INSERT INTO users (id, tenant_id, username, email, role, is_verified, created_at, updated_at)
VALUES
  (
    'a2000000-0000-4000-8000-000000000020',
    'a2000000-0000-4000-8000-000000000001',
    'AgentDesk演示一',
    'demo1@agentdesk.example',
    'user',
    true,
    NOW(), NOW()
  ),
  (
    'a2000000-0000-4000-8000-000000000021',
    'a2000000-0000-4000-8000-000000000001',
    'AgentDesk演示二',
    'demo2@agentdesk.example',
    'user',
    true,
    NOW(), NOW()
  ),
  (
    'a2000000-0000-4000-8000-000000000022',
    'a2000000-0000-4000-8000-000000000001',
    'AgentDesk演示三',
    'demo3@agentdesk.example',
    'user',
    true,
    NOW(), NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  username = EXCLUDED.username,
  email = EXCLUDED.email,
  role = 'user',
  is_verified = true,
  deleted_at = NULL,
  updated_at = NOW();

UPDATE users SET
  tenant_id = 'a2000000-0000-4000-8000-000000000001',
  role = 'admin',
  username = COALESCE(NULLIF(username, ''), 'AgentDesk运营'),
  is_verified = true,
  deleted_at = NULL,
  updated_at = NOW()
WHERE email = 'admin@agentdesk.example';

UPDATE users SET
  tenant_id = 'a2000000-0000-4000-8000-000000000001',
  role = 'user',
  username = 'AgentDesk演示一',
  is_verified = true,
  deleted_at = NULL,
  updated_at = NOW()
WHERE email = 'demo1@agentdesk.example';

UPDATE users SET
  tenant_id = 'a2000000-0000-4000-8000-000000000001',
  role = 'user',
  username = 'AgentDesk演示二',
  is_verified = true,
  deleted_at = NULL,
  updated_at = NOW()
WHERE email = 'demo2@agentdesk.example';

UPDATE users SET
  tenant_id = 'a2000000-0000-4000-8000-000000000001',
  role = 'user',
  username = 'AgentDesk演示三',
  is_verified = true,
  deleted_at = NULL,
  updated_at = NOW()
WHERE email = 'demo3@agentdesk.example';

-- 密码 CHANGE_ME （bcrypt cost 12）
INSERT INTO user_passwords (id, tenant_id, user_id, password_hash, last_changed_at, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u.tenant_id,
  u.id,
  '$2a$12$REPLACE_WITH_BCRYPT_HASH_OF_CHANGE_ME',
  NOW(), NOW(), NOW()
FROM users u
WHERE u.email IN ('admin@agentdesk.example', 'demo1@agentdesk.example', 'demo2@agentdesk.example', 'demo3@agentdesk.example')
  AND u.deleted_at IS NULL
ON CONFLICT (user_id) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  tenant_id = EXCLUDED.tenant_id,
  last_changed_at = NOW(),
  updated_at = NOW();

-- OIDC：运营后台（仅 admin / platform_admin）
INSERT INTO oauth2_clients (
    id, tenant_id, client_id, name, app_type, status,
    allowed_callback_urls, allowed_logout_urls, allowed_web_origins,
    grant_types, login_methods,
    access_token_minutes, refresh_token_days, max_sessions_per_user,
    settings, created_at, updated_at
)
VALUES (
    'a1000000-0000-4000-8000-000000000001',
    'a2000000-0000-4000-8000-000000000001',
    'agentdesk_admin_spa',
    'AgentDesk运营后台',
    'spa',
    'active',
    '["https://agentdesk-admin.example.com/oauth/callback","http://localhost:5174/oauth/callback"]'::jsonb,
    '["https://agentdesk-admin.example.com","https://agentdesk-admin.example.com/","http://localhost:5174","http://localhost:5174/"]'::jsonb,
    '["https://agentdesk-admin.example.com","http://localhost:5174"]'::jsonb,
    '["authorization_code","refresh_token"]'::jsonb,
    '{"enabled":["signin.email_password","signin.email_code"]}'::jsonb,
    60, 14, 10,
    '{"product":"agentdesk","access":{"allowed_roles":["admin","platform_admin"]},"branding":{"locale":"zh","title":"AgentDesk"}}'::jsonb,
    NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    allowed_callback_urls = EXCLUDED.allowed_callback_urls,
    allowed_logout_urls = EXCLUDED.allowed_logout_urls,
    allowed_web_origins = EXCLUDED.allowed_web_origins,
    grant_types = EXCLUDED.grant_types,
    login_methods = EXCLUDED.login_methods,
    settings = EXCLUDED.settings,
    updated_at = NOW();

-- OIDC：C 端对话（生产演示走 Hosted；App exchange 保留）
INSERT INTO oauth2_clients (
    id, tenant_id, client_id, name, app_type, status,
    allowed_callback_urls, allowed_logout_urls, allowed_web_origins,
    grant_types, login_methods,
    access_token_minutes, refresh_token_days, max_sessions_per_user,
    settings, created_at, updated_at
)
VALUES (
    'a1000000-0000-4000-8000-000000000002',
    'a2000000-0000-4000-8000-000000000001',
    'agentdesk_chat_spa',
    'AgentDesk智能对话',
    'spa',
    'active',
    '["https://agentdesk-chat.example.com/oauth/callback","http://localhost:5173/oauth/callback"]'::jsonb,
    '["https://agentdesk-chat.example.com","https://agentdesk-chat.example.com/","http://localhost:5173","http://localhost:5173/"]'::jsonb,
    '["https://agentdesk-chat.example.com","http://localhost:5173"]'::jsonb,
    '["authorization_code","refresh_token"]'::jsonb,
    '{"enabled":["signin.email_password","signin.email_code"]}'::jsonb,
    60, 14, 10,
    '{"product":"agentdesk","branding":{"locale":"zh","title":"AgentDesk"}}'::jsonb,
    NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    allowed_callback_urls = EXCLUDED.allowed_callback_urls,
    allowed_logout_urls = EXCLUDED.allowed_logout_urls,
    allowed_web_origins = EXCLUDED.allowed_web_origins,
    grant_types = EXCLUDED.grant_types,
    login_methods = EXCLUDED.login_methods,
    settings = EXCLUDED.settings,
    updated_at = NOW();

UPDATE oauth2_clients SET
  tenant_id = 'a2000000-0000-4000-8000-000000000001',
  name = 'AgentDesk运营后台',
  allowed_callback_urls = '["https://agentdesk-admin.example.com/oauth/callback","http://localhost:5174/oauth/callback"]'::jsonb,
  allowed_logout_urls = '["https://agentdesk-admin.example.com","https://agentdesk-admin.example.com/","http://localhost:5174","http://localhost:5174/"]'::jsonb,
  allowed_web_origins = '["https://agentdesk-admin.example.com","http://localhost:5174"]'::jsonb,
  settings = '{"product":"agentdesk","access":{"allowed_roles":["admin","platform_admin"]},"branding":{"locale":"zh","title":"AgentDesk"}}'::jsonb,
  status = 'active',
  updated_at = NOW()
WHERE client_id = 'agentdesk_admin_spa';

UPDATE oauth2_clients SET
  tenant_id = 'a2000000-0000-4000-8000-000000000001',
  name = 'AgentDesk智能对话',
  allowed_callback_urls = '["https://agentdesk-chat.example.com/oauth/callback","http://localhost:5173/oauth/callback"]'::jsonb,
  allowed_logout_urls = '["https://agentdesk-chat.example.com","https://agentdesk-chat.example.com/","http://localhost:5173","http://localhost:5173/"]'::jsonb,
  allowed_web_origins = '["https://agentdesk-chat.example.com","http://localhost:5173"]'::jsonb,
  settings = '{"product":"agentdesk","branding":{"locale":"zh","title":"AgentDesk"}}'::jsonb,
  status = 'active',
  updated_at = NOW()
WHERE client_id = 'agentdesk_chat_spa';