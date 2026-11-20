# openauth-auth OIDC SPA clients — AgentDesk租户

AgentDesk专有租户（`slug=agentdesk`，名称「AgentDesk」）。种子脚本：`deploy/scripts/seed-agentdesk-oidc-clients.sql`。

## 租户

| 项 | 值 |
|----|-----|
| 名称 | AgentDesk |
| slug | `agentdesk` |
| branding.locale | `zh` |
| branding.title | `AgentDesk`（Hosted 登录卡片租户标题，对齐 示例租户） |

> Hosted 卡片读 `branding.title`，**不用** `display_name`（该字段不是 openauth Hosted bootstrap 的品牌字段）。

## agentdesk_admin_spa（AgentDesk运营后台）

- grant: authorization_code + refresh_token（SPA + PKCE）
- **access.allowed_roles**: `admin`, `platform_admin`
- redirect_uris:
  - `https://agentdesk-admin.example.com/oauth/callback`
  - `http://localhost:5174/oauth/callback`
- **allowed_logout_urls**（与 `post_logout_redirect_uri` 对齐，含无斜杠 / 有斜杠两种）:
  - `https://agentdesk-admin.example.com`
  - `https://agentdesk-admin.example.com/`
  - `http://localhost:5174`
  - `http://localhost:5174/`
- web_origins:
  - `https://agentdesk-admin.example.com`
  - `http://localhost:5174`

## agentdesk_chat_spa（AgentDesk智能对话）

- 无角色门禁（C 端）；生产演示走 Hosted OIDC；App `exchange` 保留
- 前端无自建登录页，未登录直跳 Hosted（同 admin）
- redirect_uris:
  - `https://agentdesk-chat.example.com/oauth/callback`
  - `http://localhost:5173/oauth/callback`
- **allowed_logout_urls**:
  - `https://agentdesk-chat.example.com`
  - `https://agentdesk-chat.example.com/`
  - `http://localhost:5173`
  - `http://localhost:5173/`
- web_origins:
  - `https://agentdesk-chat.example.com`
  - `http://localhost:5173`

## 验收账号

| 用途 | 账号 | 密码 | role | 可登运营后台 |
|------|------|------|------|--------------|
| 运营 | `admin@agentdesk.example` | `CHANGE_ME` | `admin` | 是 |
| C 端演示 | `demo1@agentdesk.example` | `CHANGE_ME` | `user` | 否（`access_denied`） |
| C 端演示 | `demo2@agentdesk.example` | `CHANGE_ME` | `user` | 否 |
| C 端演示 | `demo3@agentdesk.example` | `CHANGE_ME` | `user` | 否 |

Frontend env:

```
VITE_OIDC_ISSUER=https://auth.example.com
VITE_OIDC_CLIENT_ID=agentdesk_admin_spa   # or agentdesk_chat_spa
VITE_API_BASE_URL=https://agentdesk-api.example.com
```