# deploy/k8s — legacy backup only

**状态：归档。** 开发机 k3s 已卸除；主路径为 Compose（`deploy/docker-compose.yml` + `agentdesk-network`）。**请勿**再 apply 本目录。

配置/镜像清单本地备份：`G:\tencent\backup\k3s-config-backup`。

新命名：

| 旧 | 新 |
|----|-----|
| mastra / agentdesk-mastra | agentdesk-agent |
| web-admin | agentdesk-admin |
| web-chat | agentdesk-chat |
| MASTRA_BASE_URL | AGENT_BASE_URL |

正式步骤见 [../README.md](../README.md)。

## 验收账号（AgentDesk租户）

| 用途 | 账号 | 密码 |
|------|------|------|
| 运营后台 | admin@agentdesk.example | CHANGE_ME |
| C 端演示 | demo1@agentdesk.example / demo2@agentdesk.example / demo3@agentdesk.example | CHANGE_ME |

OIDC：见 [oidc-clients.md](./oidc-clients.md)。