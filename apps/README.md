# apps — 自研应用

| 目录 | 说明 | 端口（开发） |
|------|------|--------------|
| [agentdesk-api](./agentdesk-api/) | Go 业务后端 | 8080 |
| [agentdesk-chat](./agentdesk-chat/) | C 端对话 H5 | 5173 |
| [agentdesk-admin](./agentdesk-admin/) | 运营语料导入 | 5174 |
| [agentdesk-agent](./agentdesk-agent/) | Agent/RAG 运行时（Mastra） | 4111 |

基础设施与 Compose 见仓库根目录 [deploy/](../deploy/)。

原文档预览站点仍在 `packages/web/`，与本 MVP 应用分离。