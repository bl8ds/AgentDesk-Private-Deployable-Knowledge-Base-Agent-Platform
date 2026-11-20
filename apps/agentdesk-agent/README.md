# agentdesk-agent

`apps/agentdesk-agent`：知识库 Agent 侧车（依赖 `@mastra/*`，**项目代号不是 mastra**）。供 `agentdesk-api` 内网调用。

## 布局

```
src/
  index.ts          # 入口
  agents/agentdesk.ts
  routes.ts         # /health /api/ingest /api/chat …
  lib/
```

## 环境

与 `agentdesk-api` **同一 Postgres 库 `agentdesk`**：

```env
DATABASE_URL=postgres://root:root@postgres-postgres-1:5432/agentdesk?sslmode=disable
CONFIG_ENCRYPTION_KEY=   # 与 agentdesk-api 相同，用于解密 admin 落库的密钥
PORT=4111
```

**模型 / 供应商 / API Key 不写在 env。** 启动后到 agentdesk-admin「模型配置」填写；agent 只读表 `runtime_ai_settings`。

## 启动

```bash
cd apps/agentdesk-agent
cp .env.example .env
npm install
npm run dev    # mastra dev -d src
```

Compose：见仓库 `deploy/docker-compose.yml` 服务 `agentdesk-agent`。  
`agentdesk-api` 配置：`AGENT_BASE_URL=http://agentdesk-agent:4111`。