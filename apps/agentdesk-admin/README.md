# @agentdesk/agentdesk-admin

AgentDesk Agent MVP **知识库运维前端**。OIDC（`oidc-client-ts` + `react-oidc-context` PKCE）登录后，上传语料并查看处理状态。UI：shadcn/ui（Vite + Tailwind v4）。

| 项 | 说明 |
| --- | --- |
| 包名 | `@agentdesk/agentdesk-admin` |
| 运行时 | Vite 7 + React 19 + TypeScript |
| 默认端口 | `5174` |
| 生产域名 | `agentdesk-admin.example.com` |
| API | `VITE_API_BASE_URL`（默认 `https://agentdesk-api.example.com`） |

## 鉴权

- **仅** openauth-auth OIDC PKCE（无「本地登录」）
- Client ID：`agentdesk_admin_spa`
- Callback：`/oauth/callback`
- API 请求携带 `Authorization: Bearer <access_token>`

### 验收账号（AgentDesk租户）

| 用途 | 邮箱 | 密码 |
| --- | --- | --- |
| 运营 | `admin@agentdesk.example` | `CHANGE_ME` |
| C 端不可登本后台 | `demo1@agentdesk.example`（及 demo2/demo3） | `CHANGE_ME` |

## 配置

复制 `.env.example`。开发态 `.env.development` 将 `VITE_API_BASE_URL` 留空，走 Vite 同源代理；生产构建写入绝对 API URL（需 CORS）。

| 变量 | 说明 |
| --- | --- |
| `VITE_OIDC_ISSUER` | 默认 `https://auth.example.com` |
| `VITE_OIDC_CLIENT_ID` | 默认 `agentdesk_admin_spa` |
| `VITE_API_BASE_URL` | API 根；空字符串 = 相对路径 + Vite proxy |
| `VITE_API_PROXY_TARGET` | 代理目标 |

## 本地启动

```bash
cd apps/agentdesk-admin
npm install
npm run dev
```

打开 http://127.0.0.1:5174

```bash
npm run build
```

## Docker

```bash
docker build \
  --build-arg VITE_OIDC_ISSUER=https://auth.example.com \
  --build-arg VITE_OIDC_CLIENT_ID=agentdesk_admin_spa \
  --build-arg VITE_API_BASE_URL=https://agentdesk-api.example.com \
  -t agentdesk-admin .
```

多阶段构建：Node 编译 → nginx 托管 `dist`，SPA `try_files` 回退 `index.html`。

## API

| 能力 | 路径 |
| --- | --- |
| 当前用户 | `GET /api/v1/auth/me` |
| 文档列表 | `GET /api/v1/docs` |
| 上传 | `POST /api/v1/docs`（multipart 字段 `file`） |

## 目录

```
src/
  auth/       AuthProvider（react-oidc-context）、OIDC config、callback
  api/        Bearer client、docs API
  pages/      Login、DocumentList、Upload
  components/ AppShell + ui/（shadcn）
  App.tsx
```