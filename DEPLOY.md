# 部署指南

AgentDesk 由 Go API、两个 React 前端、Mastra Agent 运行时组成，推荐用 Docker Compose 部署。

## 1. 环境准备

- Docker 20+ / Docker Compose v2
- PostgreSQL 15+（建议启用 `vector` 扩展）
- Redis 6+
- MinIO 或 S3 兼容对象存储
- 可配置的 OIDC / JWKS 提供方（示例配置使用 `example.com`，请替换为自有服务）

## 2. 配置环境变量

```bash
cd deploy
cp .env.example .env
cp agentdesk-api.env.example agentdesk-api.env
cp agentdesk-agent.env.example agentdesk-agent.env
```

至少需要确认：

| 变量 | 说明 |
|------|------|
| `DB_*` | PostgreSQL 连接 |
| `REDIS_*` | Redis 连接，建议单独 DB |
| `S3_*` | 对象存储与 Bucket |
| `AUTH_JWKS_URL` / `OIDC_ISSUER` | 自有 OIDC 服务 |
| `APP_SERVICE_CREDENTIAL` | App 服务端签发一次性码的凭证 |
| `CONFIG_ENCRYPTION_KEY` | 32 字节密钥，API 与 Agent 必须一致 |
| `AGENT_BASE_URL` | 默认 `http://agentdesk-agent:4111` |
| `EMBEDDING_DIMENSION` | 默认 1536；修改后需重建向量索引 |

## 3. 启动与迁移

```bash
docker compose up -d --build
cd ../apps/agentdesk-api && make migrate-up
```

服务说明：

- `agentdesk-agent`：仅内网监听 4111，不暴露公网。
- `agentdesk-api`：业务入口，默认 8080。
- `agentdesk-chat` / `agentdesk-admin`：静态前端，可挂在 Traefik/Nginx 后。

## 4. 文档预览站（可选）

```bash
pnpm install
pnpm build
```

产物位于 `packages/web/dist/`，可部署到任意静态服务器；使用 hash 路由，无需服务端重写。

## 5. 安全提醒

- 不要把 `.env`、密钥或真实客户数据提交到仓库。
- 演示账号密码均为占位符，部署后请通过自有 OIDC 创建真实账号。
- Agent 运行时与模型密钥不要暴露到公网。
