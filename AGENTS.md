# AgentDesk — 实现约束

实现与评审以本文件 + `docs/项目架构-迁移定稿.md` 为准。

## 交付形态

| 应用 | 路径 | 技术 |
|------|------|------|
| agentdesk-api | `apps/agentdesk-api/` | Go 唯一业务后端 |
| agentdesk-chat | `apps/agentdesk-chat/` | React 19 + Vite + assistant-ui + OIDC |
| agentdesk-admin | `apps/agentdesk-admin/` | React 19 + Vite + shadcn/ui + OIDC |
| agentdesk-agent | `apps/agentdesk-agent/` | Mastra Agent/RAG 运行时；仅配置与路由 |

禁止：独立 Billing 服务；Express/Hono 自研 TS BFF；把第三方控制台当产品交付面；前端硬编码鉴权；宿主机直接暴露业务端口作公网入口。

## Go（agentdesk-api）硬规则

1. Go only；布局 `cmd/`、`modules/`、`internal/`、`api/openapi.yaml`、`migrations/`。
2. 领域包扁平：`store.go` / `svc.go` / `handler.go` / `router.go`。
3. 命名 `*Store`，禁止 `*Repository`。
4. DB 无物理外键；逻辑 `*_id`；应用层约束。
5. API `/api/v1/`；成功 `{success,data}`；错误 RFC 7807 `application/problem+json`。
6. 鉴权：JWKS + Session；Session 主存 Redis；文档存 MinIO/S3。
7. Agent 始终 HTTP 代理（`AGENT_BASE_URL`）；无 stub。

## 环境

开发 / 生产均使用 Docker Compose + Traefik；`deploy/k8s/` 仅作历史参考。

## MVP 跑通路径

1. PostgreSQL + Redis + MinIO；执行 migrate-up。
2. Compose 启动 agentdesk-agent + agentdesk-api + admin + chat。
3. 自有 OIDC 登录 → admin 上传语料 → chat SSE + 引用 → 历史经 `/api/v1/chat/threads`。
