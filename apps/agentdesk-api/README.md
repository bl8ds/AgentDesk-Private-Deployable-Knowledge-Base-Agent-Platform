# agentdesk-api

AgentDesk Agent **唯一业务后端**（Go）。负责：一次性码换票 / Session（Redis）、JWKS 鉴权、知识库上传（MinIO/S3）、对话 SSE（agentdesk-agent HTTP 代理）、用户等级门控、审计。

对齐规范：仓库 `docs/项目架构-迁移定稿.md` + openauth-deploy 工程约定。

## 依赖

| 依赖 | 说明 |
|------|------|
| Go 1.22+ | 构建与运行 |
| PostgreSQL | 库名建议 `agentdesk`；需 `pgcrypto` |
| Redis | Session 主存储（`REDIS_DB=2`） |
| MinIO / S3 | 文档对象存储 |
| agentdesk-agent | 内网 HTTP（`AGENT_BASE_URL`） |
| openauth-auth | JWKS / OIDC（`https://auth.example.com`） |

## 目录

```
cmd/app          # HTTP 服务
cmd/migrate      # 数据库迁移
modules/         # health / authz / session / entitlement / knowledge / chat / audit / agent
internal/        # wiring、middleware、db、redisx、storage、logx
pkg/             # apperr、httpx
api/openapi.yaml
migrations/
```

## 配置

复制 `.env.example` 为 `.env` 并按需修改。关键变量：

| 变量 | 默认 | 说明 |
|------|------|------|
| `APP_PORT` | `8080` | 监听端口 |
| `DB_*` | — | PostgreSQL |
| `AUTH_MODE` | `jwks` | **仅** `jwks` |
| `AUTH_JWKS_URL` | openauth JWKS | RS256 校验 |
| `OIDC_ISSUER` | `https://auth.example.com` | OIDC issuer |
| `APP_SERVICE_CREDENTIAL` | — | `X-App-Credential`（签发 app-code） |
| `SESSION_COOKIE_NAME` | `agentdesk_session` | Session Cookie |
| `REDIS_*` | localhost:6379 DB=2 | Session 主存储 |
| `S3_*` | MinIO | 文档上传；`storage_path` = object key |
| `AGENT_BASE_URL` | `http://agentdesk-agent:4111` | 始终 HTTP 代理 |
| `CONFIG_ENCRYPTION_KEY` | — | 加密 admin「模型配置」密钥；与 agentdesk-agent 一致 |
| `CORS_ORIGINS` | agentdesk-*.example.com + localhost | 前端源 |

## 启动

```bash
cd apps/agentdesk-api
cp .env.example .env
# 编辑 DB_* / REDIS_* / S3_* 等

go mod tidy
make migrate-up
make run
```

健康检查：

- `GET /health` — 存活
- `GET /ready` — 就绪（ping DB）

## 鉴权与演示

生产走 openauth-auth JWKS Bearer，或 `app-code` → `exchange` 换 Session Cookie。

```bash
# 签发一次性码（服务端凭证）
curl -X POST http://localhost:8080/api/v1/auth/app-code \
  -H "X-App-Credential: $APP_SERVICE_CREDENTIAL" \
  -H "Content-Type: application/json" \
  -d '{"sub":"user-1","level":"vip"}'

# 换票
curl -c cookies.txt -X POST http://localhost:8080/api/v1/auth/exchange \
  -H "Content-Type: application/json" \
  -d '{"code":"<code>"}'

# 上传
curl -b cookies.txt -F file=@./sample.txt http://localhost:8080/api/v1/docs

# 对话（SSE；上游错误 event:error code=UPSTREAM_ERROR）
curl -b cookies.txt -N -H 'Content-Type: application/json' \
  -d '{"message":"你好"}' http://localhost:8080/api/v1/chat/completions
```

## API 摘要

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/app-code` | Header `X-App-Credential`；body `{sub,level}` |
| POST | `/api/v1/auth/exchange` | `{code}` → Set-Cookie（Redis session） |
| GET | `/api/v1/auth/me` | Session 或 Bearer JWKS |
| POST | `/api/v1/docs` | multipart `file` → S3 + 异步分块/Ingest |
| GET | `/api/v1/docs` / `/api/v1/docs/:id` | 列表 / 详情 |
| POST | `/api/v1/chat/completions` | SSE 代理 agentdesk-agent：`token` / `citation` / `done` / `error` |
| GET | `/api/v1/audit` | admin |

成功响应：`{ "success": true, "data": ... }`  
错误：`application/problem+json`（RFC 7807）。完整契约见 `api/openapi.yaml`。

## 部署

```bash
docker build -t agentdesk-api .
docker run --env-file .env -p 8080:8080 agentdesk-api
```

域名：`agentdesk-admin.example.com` / `agentdesk-chat.example.com`；鉴权 `auth.example.com`；对象存储 `minio.example.com`。

容器内先执行迁移：`/app/agentdesk-migrate -cmd up`（工作目录需含 `migrations/`，镜像已拷贝）。

## 约束

- 无物理外键；逻辑 `*_id`
- Store 命名（禁止 Repository）
- 无独立 Billing / TS BFF；权益在 `modules/entitlement`
- 无 local auth / stub Agent / 本地盘主存储