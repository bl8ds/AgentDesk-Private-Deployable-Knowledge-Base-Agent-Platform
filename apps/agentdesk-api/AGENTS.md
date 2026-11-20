# agentdesk-api — Agent guide

实现或评审本服务时阅读本文件；架构约束见仓库根 `docs/项目架构-迁移定稿.md`。风格对齐 openauth-deploy。

## Hard rules

1. **Go only** — 本目录内禁止 Express/TS BFF。
2. **无物理外键** — 逻辑 `*_id`，应用层约束。
3. **Store 模式** — `*Store`，禁止 `*Repository`。
4. **领域包扁平** — `store.go` / `svc.go` / `handler.go` / `router.go`。
5. **API** — `/api/v1/`；成功 `{success,data}`；错误 RFC 7807 `application/problem+json`。
6. **鉴权** — **仅** `AUTH_MODE=jwks`（openauth-auth）；Session Cookie（Redis）或 Bearer JWT。
7. **契约** — 实现须匹配 `api/openapi.yaml`。

## Module map

```
modules/
├── health/        # GET /health, /ready
├── authz/         # Principal, JWKS, SessionOrBearer
├── session/       # app-code / exchange / me（Redis session + PG audit）
├── entitlement/   # free/vip/svip 门控
├── knowledge/     # S3 上传、分块、Agent Ingest
├── chat/          # SSE completions（仅 Agent 代理）
├── audit/         # audit_logs；GET /audit（admin）
└── agent/         # HTTP client：Health / Ingest / ChatStream / ListThreads / GetMessages

internal/          # server、middleware、db、redisx、storage(S3)、logx
pkg/               # apperr、httpx
```

## Auth flows

| 路径 | 用途 |
|------|------|
| `POST /auth/app-code` | 使用方服务端凭证 → 一次性码（≤5min，PG） |
| `POST /auth/exchange` | code → HttpOnly Session Cookie（Redis `agentdesk:session:{token}`） |
| Bearer JWT | openauth-auth JWKS（RS256）；可选 org claims，不强制 |

Principal 字段：`UserID`、`Level`、`Roles`、`Channel`（`session`\|`bearer`）、可选 `OrgID`/`OrgCode`。

## Chat / Agent / Storage

- **Agent**：始终 HTTP 代理（`AGENT_BASE_URL`，默认 `http://agentdesk-agent:4111`）；契约 `/api/ingest` + `/api/chat` SSE。
- **Chat**：仅代理；上游失败 SSE `error` + `code=UPSTREAM_ERROR`。
- **Storage**：MinIO/S3；`documents.storage_path` = object key（`docs/{uuid}{ext}`）。

## Dev commands

```bash
go mod tidy
go run ./cmd/migrate -cmd up
go run ./cmd/app/
go test ./... -count=1
go build ./...
```

## Do not

- 在本服务引入独立 Billing 进程
- 在 SQL 加物理 FK
- 恢复 local auth / `dev-login` / stub RAG / 本地盘主存储
- 把 Mastra Studio / openauth-auth 控制台当产品交付面
- 修改 `apps/agentdesk-*` 前端或 `deploy/`（除非任务明确要求）