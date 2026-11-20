# 更新日志

本项目的所有重要变更都会记录在此文件中。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [Unreleased]

## [0.1.0] - 2026-11-20

首个开源版本。

### Added

- 首个开源快照：Go API、对话端、运营后台、Mastra Agent 运行时与 Docker Compose / K8s 部署模板
- RAG 知识库问答、引用溯源、配额、审计与 OIDC/JWKS 鉴权
- 运营管理后台：用量报表、用量明细、审计日志、会话管理、系统健康五个页面
- 文档管理：状态统计与分块查看接口，列表支持按状态过滤
- BYOK 模型配置：对话 / 向量 / 视觉三类 OpenAI 兼容接口，API Key 使用 AES-256-GCM 加密存储
- 内容安全与拒答策略：敏感词分级拦截、流式输出脱敏、无依据自动拒答、后台规则测试面板
- Agent 工具扩展：内置当前时间/知识库检索工具、HTTP 工具注册、动态工具集热生效、工具调用过程 SSE 可视化、后台管理页面
- 中英双语 README：英文版为主（README.md），中文版为 README.zh-CN.md，顶部互链
- 开源治理文档：LICENSE、SECURITY、CODE_OF_CONDUCT、CONTRIBUTING、DEPLOY、Issue / PR 模板

### Changed

- 项目统一更名为 AgentDesk，业务示例数据全部虚构化
- CI 与 lockfile 的 pnpm / Go 版本对齐，并覆盖三个前端构建
- C 端对话与运营后台统一改为蓝色主题，基于 shadcn/ui 语义色变量，补充深色模式与响应式布局优化
