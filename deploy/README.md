# AgentDesk 部署

| 环境 | 方式 |
|------|------|
| 开发 / 生产 | Docker Compose + Traefik |

## 原则

- `agentdesk-agent` 仅内网（`expose`，无 host publish、无公网入口）。
- 原始文件存 MinIO/S3；模型配置在运营后台填写，密钥落库加密。
- 鉴权走可配置的 OIDC / JWKS；仓库中不含真实账号密码。
- Redis 用于 Session 与限流；PostgreSQL 用于业务数据、Agent Memory 与向量。
- 外部网络按需创建；示例 Compose 使用 `agentdesk-network`。

## Compose

```bash
cd deploy
cp .env.example .env
cp agentdesk-api.env.example agentdesk-api.env
cp agentdesk-agent.env.example agentdesk-agent.env
docker compose up -d --build agentdesk-api agentdesk-agent agentdesk-admin agentdesk-chat
```

迁移：在 `apps/agentdesk-api` 执行 `make migrate-up`。

## 对话历史

经 `GET /api/v1/chat/threads` 与 `GET /api/v1/chat/threads/:id/messages` 读取 Agent Memory。
