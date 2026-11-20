# @agentdesk/agentdesk-chat

AgentDesk Agent MVP **对话前端**。支持 openauth-auth OIDC（`oidc-client-ts` + `react-oidc-context`）与AgentDesk App `?code=` 换 Session Cookie；SSE 流式对话并展示引用。

| 项 | 说明 |
| --- | --- |
| 包名 | `@agentdesk/agentdesk-chat` |
| 运行时 | Vite 7 + React 19 + TypeScript |
| 默认端口 | `5173` |
| 生产域名 | `agentdesk-chat.example.com` |
| API | `VITE_API_BASE_URL`（默认 `https://agentdesk-api.example.com`） |

对话 UI：`@assistant-ui/react` 原语 + 手机优先自研样式（**不含 shadcn**）。思考内容走官方 `reasoning` part。

## 鉴权

1. **OIDC PKCE**：未登录直跳 openauth-auth Hosted（无自建登录页）
2. **App 码换会话**：URL `?code=xxx` → `POST /api/v1/auth/exchange` → `agentdesk_session` Cookie（保留）

### 验收账号（AgentDesk租户 · 生产演示）

| 用途 | 邮箱 | 密码 |
| --- | --- | --- |
| C 端演示 | `demo1@agentdesk.example` | `CHANGE_ME` |
| C 端演示 | `demo2@agentdesk.example` | `CHANGE_ME` |
| C 端演示 | `demo3@agentdesk.example` | `CHANGE_ME` |
| 运营（勿用于 C 端） | `admin@agentdesk.example` | `CHANGE_ME` |

## 配置

| 变量 | 说明 |
| --- | --- |
| `VITE_OIDC_ISSUER` | 默认 `https://auth.example.com` |
| `VITE_OIDC_CLIENT_ID` | 默认 `agentdesk_chat_spa` |
| `VITE_API_BASE_URL` | **本地联调请留空**，走 Vite proxy |
| `VITE_API_PROXY_TARGET` | 默认 `https://agentdesk-api.example.com` |

## 本地启动（联调远程 API，无需频繁部署）

```bash
cd apps/agentdesk-chat
cp .env.example .env.development   # 确保 VITE_API_BASE_URL=
npm install
npm run dev
# 打开 http://localhost:5173 ，手机可用同一局域网 IP:5173
```

Admin 同理：`apps/agentdesk-admin` → `npm run dev` → `http://localhost:5174`。
服务器已放行 CORS：`localhost:5173/5174`。

```bash
npm run build
```

## Docker

```bash
docker build \
  --build-arg VITE_OIDC_ISSUER=https://auth.example.com \
  --build-arg VITE_OIDC_CLIENT_ID=agentdesk_chat_spa \
  --build-arg VITE_API_BASE_URL=https://agentdesk-api.example.com \
  -t agentdesk-chat .
```

## API

| 能力 | 路径 |
| --- | --- |
| 当前用户 | `GET /api/v1/auth/me` |
| 码换会话 | `POST /api/v1/auth/exchange` |
| 对话 SSE | `POST /api/v1/chat/completions` |

## 目录

```
src/
  auth/       OIDC AuthProvider、callback、config
  api/        client、auth exchange、SSE chat
  store/      zustand chat
  pages/      Login、Chat
  components/ AssistantChat、Citations
  App.tsx
```