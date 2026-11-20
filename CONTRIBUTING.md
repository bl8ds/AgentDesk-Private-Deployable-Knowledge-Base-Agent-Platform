# 贡献指南

感谢你对 AgentDesk 的关注与贡献！

## 开发环境

- Go ≥ 1.24
- Node.js ≥ 20
- pnpm ≥ 10（与 `pnpm-lock.yaml` v9 保持一致）
- Docker / Docker Compose（用于 PostgreSQL、Redis、MinIO 与完整联调）

```bash
pnpm install
pnpm approve-builds esbuild
pnpm build

cd apps/agentdesk-api && go test ./...
```

## 提交规范

- 提交信息使用语义化前缀：`feat:` / `fix:` / `docs:` / `style:` / `chore:`。
- 提交前运行 `pnpm build` 与 `go test ./...`，确保前后端均通过检查。
- 新增文档内容时，中英文版本需同步更新（见 `packages/web/src/data/`）。
- 禁止提交任何真实密钥、客户名称、内部域名或生产凭据。

## Pull Request

1. Fork 仓库并创建功能分支。
2. 保持改动聚焦，一个 PR 解决一个问题。
3. 在 PR 中说明改动动机与验证方式。
4. 涉及视觉改动时附上截图。

## 报告问题

通过 GitHub Issue 反馈，请包含：复现步骤、预期行为、实际行为、运行环境（Node/pnpm/Go 版本、浏览器）。

## 行为准则与安全

参与本项目即表示你同意遵守 [行为准则](./CODE_OF_CONDUCT.md)。如发现安全问题，请按 [安全政策](./SECURITY.md) 私下报告，不要公开提交漏洞细节。
