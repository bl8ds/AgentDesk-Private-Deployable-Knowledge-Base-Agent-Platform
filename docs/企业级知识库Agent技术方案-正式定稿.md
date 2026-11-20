# 企业级知识库 Agent 技术方案

| 项 | 内容 |
|---|---|
| 文档类型 | 正式技术方案 |
| 版本 | V1.0 |
| 日期 | 2026-07-17 |
| 适用范围 | 私有化部署 · C 端 H5 嵌入使用方 App · 基础知识库问答及后续扩展 |

---

## 1. 建设目标

| 阶段 | 目标 |
|------|------|
| Phase 1 | 可私有化部署的知识库问答助手：流式对话、引用溯源、App 免登、用户额度、运营后台 |
| Phase 2 | 商品推荐卡片、营销海报、短视频任务、Agent 工具扩展 |

---

## 2. 总体架构

```
┌─────────────────────────────────────────────────────────┐
│  使用方 App（WebView） / 受限浏览器 / 自研运营后台          │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────┐
│  Go API（唯一业务后端 · openauth-deploy 规范）               │
│  会话/OIDC · 权益门控 · 知识库 · 对话代理 · 审计           │
└───────┬─────────────────────────────┬───────────────────┘
        │                             │
        ▼                             ▼
┌───────────────┐              ┌────────────────┐
│ openauth-auth   │              │ Mastra（Docker）│
│ OIDC / JWKS   │              │ Agent + RAG    │
└───────────────┘              └───────┬────────┘
                                       ▼
                              LLM / Embedding（OpenAI 兼容）
```

**原则：** 对外仅暴露 Go API 与自研前端；Mastra 内网 Docker 部署；不交引擎原生控制台。

> 实现约束以 [项目架构-迁移定稿](./项目架构-迁移定稿.md) 为准：Go 单应用、无独立 Billing、Mastra 仅配置部署。

---

## 3. 技术选型

| 层级 | 选型 | License | 职责 |
|------|------|---------|------|
| C 端 H5 | React + Vite + assistant-ui | MIT | 流式对话、引用与自定义消息渲染 |
| 运营后台 | React + Vite | — | 语料导入、状态、配置 |
| 业务后端 | **Go 单应用**（openauth-deploy 规范） | — | 会话、权益门控、知识库、对话代理、审计 |
| 账号 | openauth-auth OIDC + 一次性码 | — | 已有服务 |
| Agent | **Mastra Docker 部署** | Apache-2.0 | 配置化部署；不自研框架 |
| 文档检索引擎 | RAGFlow（按需启用） | Apache-2.0 | 复杂文档解析、混合检索、引用 |
| 会话/Agent 状态 | PostgreSQL | — | agentdesk 库；Mastra / API 共用约定 |
| 缓存 | Redis | — | 会话/限流可选 |
| 大模型 | OpenAI 兼容 API | — | Chat / Embedding |
| 流量入口 | Caddy 或 Traefik | — | TLS、限流 |

**不采用：** 独立 Billing 服务；Express/TS BFF；NewAPI 管理台交付；开源引擎控制台当产品界面；URL 携带长期用户 Token。

---

## 4. 组件职责

| 组件 | 职责 |
|------|------|
| agentdesk-chat | 对话 UI；Session；引用展示 |
| agentdesk-admin | 文件导入、入库状态、基础配置 |
| agentdesk-api（Go 单应用） | OIDC/一次性码会话、权益门控、上传与入库编排、对话 SSE 代理、审计 |
| openauth-auth | OIDC / JWKS（已有） |
| Mastra（Docker） | Agent、RAG、流式生成 |
| RAGFlow（按需） | 难文档检索 |
| LLM API | 文本生成与向量化 |

---

## 5. 数据存储

| 数据 | 存储位置 |
|------|----------|
| 用户、OAuth、会员 | Go Auth 既有库 |
| 额度、账单流水 | Go Billing + Redis |
| 审计日志 | Go BFF / 业务库 |
| 对话线程、Agent 记忆、Workflow 状态 | Mastra → PostgreSQL |
| 向量与文档块（基础） | Mastra 向量适配 |
| 向量与文档块（增强） | RAGFlow 自有存储 |
| 原始文件 | 对象存储或引擎侧存储 |

---

## 6. 身份与访问

### 6.1 账号域

| 域 | 方案 |
|----|------|
| C 端 | 使用方 App 用户体系 + Go Auth（一次性 code → Session） |
| 运营 | 自研后台账号；角色：admin / operator / viewer |

两域隔离：App Token 不可登录运营后台；运营账号不可默认冒充 C 端用户。

### 6.2 一次性码换票流程（正式定义，不以使用方 SSO 验票图为准）

**原则：** 使用方 App 业务 Token **永不进入** H5；H5 仅接触短时一次性 `code` 与平台方 Session。平台方**不调用**使用方「验 Token」接口。

```
使用方 App 客户端          使用方 App 服务端              平台方 Go Auth/BFF              平台方 H5
      │                        │                          │                        │
      │ 1.用户点击 AI 入口      │                          │                        │
      │ 2.请求打开 AI           │                          │                        │
      │───────────────────────▶│                          │                        │
      │                        │ 3.POST /api/v1/auth/app-code
      │                        │   Header: 服务端凭证       │                        │
      │                        │   Body: sub, level…      │                        │
      │                        │─────────────────────────▶│                        │
      │                        │                          │ 4.校验凭证、签发 code   │
      │                        │                          │    (≤5min, 单次)        │
      │                        │ 5.返回 { code }          │                        │
      │                        │◀─────────────────────────│                        │
      │ 6.打开 WebView          │                          │                        │
      │   ?code=xxx&channel=app │                          │                        │
      │───────────────────────────────────────────────────────────────────────────▶│
      │                        │                          │ 7.POST /api/v1/auth/exchange
      │                        │                          │◀───────────────────────│
      │                        │                          │ 8.code 校验并作废       │
      │                        │                          │    建 Session、映射权益  │
      │                        │                          │ 9.Set-Cookie Session    │
      │                        │                          │───────────────────────▶│
      │                        │                          │                        │ 10.进对话 UI
      │                        │                          │ 后续 /api/v1/chat/*     │
      │                        │                          │◀── Session Cookie ─────│
```

| 步骤 | 负责方 | 系统 |
|------|--------|------|
| 1～2 入口与唤起服务端 | 使用方 | App 客户端 / App 服务端 |
| 3～5 签发一次性码 | **平台方提供接口**；使用方服务端调用 | 平台方 Go Auth |
| 6 打开 WebView（URL 仅带 code） | 使用方 | App 客户端 |
| 7～9 code 换 Session | **平台方** | Go Auth + H5 |
| 10 及后续对话 | **平台方** | H5 + BFF + Mastra |

**禁止：** 使用方业务 Token / 长期凭证拼进 H5 URL 或经 JSBridge 交给 H5。  
**联调备选：** 短时 JWT 走 Header，仅用于联调，不作为生产默认。

### 6.3 浏览器策略

| 选项 | 行为 |
|------|------|
| A | 禁止浏览器（仅 App） |
| B（默认） | 受限：游客低额度或强制登录 |
| C | 完全开放 Web（另项评估） |

### 6.4 用户等级门控（按使用方用户体系开启 AI）

仅特定用户等级可使用 AI 功能，未达标用户拦截并引导升级。

**判定来源（使用方提供其一）：**

| 方式 | 说明 |
|------|------|
| code/JWT 内嵌等级 | 换票时使用方在 `level` / `role` / `vip_level` 声明用户等级（推荐，无额外调用） |
| 权益查询接口 | 使用方提供 `GET 用户权益` 接口，BFF 换票后回查等级/权益 |
| 权益同步 | 使用方批量/增量同步用户等级到本系统，BFF 本地判定 |

**门控落点：**

```
换票 → 解析/查询用户等级 → 映射「是否可用 AI + 套餐额度」
     → 允许：进入对话（按套餐额度）
     → 拒绝：返回 AI_NOT_ENTITLED，前端展示升级引导
```

**约定：**

- 等级 → 权益的映射规则（哪些等级可用、各自额度）由使用方确认，平台方配置化实现。  
- 等级变更实时性：JWT 内嵌为登录周期级；接口/同步方式按使用方接口时效。  
- 前端按权益隐藏/置灰入口，BFF 二次校验兜底，防止越权调用。

---

## 7. 对话与检索链路

### 7.1 Phase 1 默认

```
提问 → Go BFF（鉴权/额度）→ Mastra Agent
     →（Mastra 基础 RAG）→ LLM 流式生成 → SSE 回前端
     → 强制引用；无依据拒答；BFF 校验引用合法性
```

### 7.2 启用 RAGFlow 的条件

满足任一即启用（Mastra 负责生成与 Agent，RAGFlow 只提供检索片段）：

- 复杂 PDF / 扫描件 / 大表解析质量不足  
- 约定评测集 Top3 召回率不达标  
- 需页级/块级强溯源且 Mastra 侧不足  

```
提问 → Go BFF → RAGFlow 检索 → 片段注入 Mastra → LLM 生成 → SSE
```

### 7.3 Phase 1 质量基线

1. 检索结果带引用  
2. System Prompt：无依据则拒答  
3. BFF 校验引用属于本轮召回集  
4. temperature 低配置（建议 0.1～0.2）  
5. 会话：落库 + 滑动窗口  

---

## 8. 模型调用

```
primary:  { baseURL, apiKey, model }
fallback: { baseURL, apiKey, model }
失败/超时 → 切换 fallback → 记录用量与审计
```

Phase 1 不部署 NewAPI。渠道运营复杂度显著上升后再评估可无 UI 网关。

---

## 9. 对外 API（Go BFF）

| 接口 | 说明 |
|------|------|
| `POST /api/v1/auth/app-code` | App 服务端申请一次性码 |
| `POST /api/v1/auth/exchange` | code 换 Session |
| `POST /api/v1/chat/completions` | 对话（SSE：meta / delta / citation / done / error） |
| `GET /api/v1/me/quota` | 剩余额度与套餐 |
| `GET /api/v1/me/entitlement` | 当前用户是否可用 AI、等级、套餐 |

| 错误码 | 含义 |
|--------|------|
| `UNAUTHORIZED` | 未登录或 Session 失效 |
| `AI_NOT_ENTITLED` | 用户等级不足，未开通 AI 功能 |
| `QUOTA_EXCEEDED` | 额度不足 |
| `CONTENT_BLOCKED` | 内容安全拦截 |
| `UPSTREAM_ERROR` | 上游模型或引擎异常 |

消息类型预留：`text` | `citation` | `goods_card` | `media_task`。

---

## 10. 交付范围

### 10.1 Phase 1 交付物

| 交付物 | 说明 |
|--------|------|
| H5 对话应用 | 可嵌入使用方 App WebView |
| 运营管理后台 | 语料、配额、审计 |
| Go BFF + Auth/Billing 对接 | 含与现有 OAuth 集成 |
| Mastra 服务 | 内网部署与配置 |
| RAGFlow | 按需纳入；配置与发行版 |
| 文档与源码 | 部署手册、环境变量、约定范围源码 |
| 联调与验收 | WebView 联调通过 |

### 10.2 Phase 1 功能清单

- 文档导入与入库（格式以所选引擎支持为准）  
- 流式知识库问答 + 引用  
- 无依据拒答  
- App 一次性码免登  
- 用户级问答额度  
- 审计日志、内容安全钩子  
- 自研运营后台最小集  

### 10.3 Phase 1 不含

- 生图 / 生视频  
- 复杂商品推荐与 ERP 深度对接  
- 等保 / 信创打包  
- 开源引擎原生控制台作为产品界面  
- 原生 iOS/Android 对话 SDK  
- NewAPI 类中转台交付  

### 10.4 责任划分

| 事项 | 使用方 | 平台方 |
|------|------|--------|
| 服务器、域名、证书 | 提供 | 部署实施 |
| 模型 / Embedding / 内容安全 Key 与费用 | 提供并承担费用 | 接入配置 |
| App 发码与用户 ID | 实现 | 换票与鉴权 |
| 知识内容 | 提供与更新 | 工具链与流水线 |
| 法务文案 | 提供 | 页面挂载 |
| 约定范围内缺陷 | — | 质保修复 |
| 模型幻觉导致的业务损失 | 合同约定免责与人工复核 | 提供引用与拒答能力 |

---

## 11. 使用方配合与验收

### 11.1 物料

| 物料 | 节点 |
|------|------|
| 服务器（建议 ≥8C16G）、域名 | T0 |
| 模型与 Embedding Key | T0+1 |
| 内容安全 Key | T0+2 |
| 首批语料 | T0+3 |
| 验收题集 30～50 条 | T0+7 |
| 可测 WebView 包 | T0+10 |
| 模型是否允许出域（书面） | T0 |

### 11.2 App 侧

- 服务端申请 code（密钥不下发前端）  
- WebView 打开约定 URL  
- 用户字段：`sub`（必填）、会员等级（可选）  
- JSBridge：`close`（Phase 1）；`openGoods` / `share` / `saveImage`（Phase 2）  

### 11.3 Phase 1 验收标准

1. 语料可入库并就绪  
2. 共同题集 Top3 召回命中率 ≥80%  
3. App 内免登，流式问答含引用  
4. 无依据拒答（抽测）  
5. 额度用尽返回约定错误码  
6. 审计可查（脱敏）  
7. 按手册完成部署；业务侧不可见引擎原生控制台  

工期自环境、Key、发码联调账号就绪起算。

### 11.4 变更项

OCR 深度增强、原生 SDK、强制全内网私有化模型、等保/信创纳入 Phase 1、后台强制 SSO、开源控制台对外品牌化等，均须书面变更。

### 11.5 确认项

| # | 项 |
|---|----|
| 1 | 浏览器策略：A / B / C |
| 2 | 鉴权：code / JWT / 两者 |
| 3 | 模型调用是否允许出域 |
| 4 | 运营后台是否必须使用方 SSO |
| 5 | 内容安全厂商 |
| 6 | 质保期 |
| 7 | Phase 1 是否启用 RAGFlow |

---

## 12. 部署

| 项 | 规格 |
|----|------|
| 形态 | Docker Compose：Go BFF · Mastra · PostgreSQL · Redis · H5/Admin 静态资源 ·（可选）RAGFlow |
| 生产基线 | 8C16G 起；启用 RAGFlow 时按引擎要求上调 |
| 网络 | Mastra、RAGFlow 仅内网；公网只进 BFF/H5 |

---

## 13. Phase 2 方案

| 能力 | 方案 |
|------|------|
| 商品推荐 | 结构化商品数据 + 过滤精排；LLM 仅生成理由；`goods_card` 渲染；JSBridge `openGoods` |
| 营销海报 | 先本地模板渲染；再按需生图 API；价格等字段本地叠字；额度 `capability=image` |
| 短视频 | 异步任务调国内视频 API；生成后审核；额度 `capability=video` |
| Agent 扩展 | Mastra Tool / Workflow；检索不足继续用 RAGFlow |
| 模型网关 | 渠道复杂后再上可无 UI 方案 |

---

## 14. 扩展与定制

| 扩展点 | 方式 |
|--------|------|
| 新业务能力 | Mastra 增加 Tool |
| 多步流程 | Mastra Workflow |
| 模型与提示词 | Mastra Agent 配置 |
| 前端卡片 | assistant-ui 自定义消息 |
| 难文档召回 | 启用或加强 RAGFlow |
| 计费维度 | Go Billing 按 capability 扩展 |

---

## 15. 备选技术（不纳入本期默认）

| 场景 | 备选 |
|------|------|
| BFF 改为 TypeScript | 架构不变，Go BFF 换 Node |
| Python Agent 运行时对标 | Agno（Apache-2.0 + AgentOS）；团队无 Python 人力时不采用 |
| 配置化极限赶工 | Dify 仅 API、控制台不交付；须过 License |
| 强制纯 Go 自研 RAG | Eino / LangChainGo + pgvector；工期与风险另评 |

---

## 16. 开源组件许可摘要

| 组件 | License |
|------|---------|
| Mastra 核心 | Apache-2.0（禁用 ee/） |
| RAGFlow | Apache-2.0 |
| assistant-ui | MIT |
| Agno（备选） | Apache-2.0 |

合同表述：交付定制知识助手（H5/Web）及 App 集成与私有化部署；技术实现可含开源组件；不包含将第三方开源控制台作为业务操作界面交付。