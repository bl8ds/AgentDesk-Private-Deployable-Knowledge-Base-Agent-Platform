/**
 * 技术选型与总体架构文档
 */
export const techSelectionDoc = {
  title: '技术选型与总体架构',
  sections: [
    {
      type: 'heading',
      level: 2,
      text: '1. 架构设计哲学',
    },
    {
      type: 'paragraph',
      text: '本方案遵循 <span class="hl-label">API-first 设计</span>、<span class="hl-label">关注点分离</span> 与 <span class="hl-label">渐进式复杂性管理</span> 三大核心原则。',
    },
    {
      type: 'table',
      headers: ['设计原则', '内涵', '落地体现'],
      rows: [
        ['<span class="hl-label">分层解耦</span>', '各层职责单一，层间通过明确定义的 API 契约通信', 'Go BFF 作为唯一对外网关；Mastra/RAGFlow 内网部署，互不感知对方控制台'],
        ['<span class="hl-label">防御性设计</span>', '每个组件假设上游不可信、下游不可靠', '鉴权前置 BFF；所有内网调用携带服务凭证；级联失败有降级策略'],
        ['<span class="hl-label">可观测性优先</span>', '上线前必须埋好关键指标与追踪', 'OpenTelemetry 贯穿全链路；结构化日志统一 Schema；关键路径埋点 SLA 监控'],
        ['<span class="hl-label">配置即代码</span>', '所有环境差异通过配置文件与环境变量管理', '12-Factor App 方法论；Docker Compose 一键部署；环境变量驱动的零侵入配置'],
        ['<span class="hl-label">渐进式增强</span>', 'Phase 1 做最小闭环，Phase 2 在稳定基座上扩展', 'RAGFlow 按需启用；Agent 工具通过注册机制热插拔；模型主备无缝切换'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '2. 建设目标',
    },
    {
      type: 'table',
      headers: ['阶段', '目标', '核心交付', '验收标准'],
      rows: [
        ['<span class="hl-label">Phase 1</span>', '可私有化部署的知识库问答助手', '流式对话、引用溯源、App 免登、用户额度、运营后台、合规拦截', '召回率 ≥85%、P99 延迟 ≤3s、可用性 ≥99.5%'],
        ['<span class="hl-label">Phase 2</span>', '多模态 Agent 智能体', '商品推荐卡片、营销海报生成、短视频任务、Agent 工具市场', '工具调用成功率 ≥95%、推荐点击率提升可量化'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '3. 总体架构',
    },
    {
      type: 'paragraph',
      text: '<span class="hl-label">架构总览（逻辑分层）</span>',
    },
    {
      type: 'paragraph',
      text: '<span class="doc-code-block">+=================================================================+<br>|                        PRESENTATION LAYER                       |<br>|                                                                 |<br>|  +------------------------+  +------------------------+         |<br>|  | C-End H5 (WebView)    |  | Ops Admin (SPA)       |           |<br>|  | React + assistant-ui  |  | React + Ant Design    |           |<br>|  +-----------+------------+  +-----------+------------+         |<br>|             |  HTTPS+Session Cookie   |  | JWT Bearer           |<br>+=================================================================+<br>|                   v                          v                  |<br>|                          GATEWAY LAYER                          |<br>|                                                                 |<br>|  +-------------------------------------------------------------+|<br>|  |          Caddy / Traefik (TLS, Rate-Limit, WAF)            | |<br>|  +-----------------------------+-------------------------------+|<br>|                                v                                |<br>|  +-------------------------------------------------------------+|<br>|  |               Go BFF (Single External Entry)               | |<br>|  | - Unified Auth (C-End Session / Admin JWT)                 | |<br>|  | - Quota Verification & Deduction Proxy                     | |<br>|  | - SSE Streaming Proxy & Interrupt Handling                 | |<br>|  | - Audit Logging (Req/Resp/Citation/Decision)               | |<br>|  | - Content Safety Hook (Sensitive Word -> Block/Replace)    | |<br>|  +--+-----------+-----------+-------------+-------------------+ |<br>+=================================================================+<br>|             v           v           v             v             |<br>|                      BUSINESS SERVICE LAYER                     |<br>|                                                                 |<br>|  +----------+ +----------+ +-------------+ +------------------+ |<br>|  | Go Auth  | |Go Billing| |Mastra Agent | |    RAGFlow      |  |<br>|  | OAuth2   | | Quota    | | (Internal)  | | (On-Demand)     |  |<br>|  | OT Code  | | Engine   | | Agent/WF    | | Doc Parsing     |  |<br>|  | Exchange | | Metering | | Memory/RAG  | | Hybrid Search   |  |<br>|  +----+-----+ +----+-----+ +------+------+ +-------+----------+ |<br>+=================================================================+<br>|             v           v           v              v            |<br>|                       INFRASTRUCTURE LAYER                      |<br>|                                                                 |<br>|  +------------+ +----------+ +--------------------------------+ |<br>|  | PostgreSQL | | Redis    | | Domestic LLM/Embedding API     | |<br>|  | Sessions   | | Quota    | | - Active-Standby Switching     | |<br>|  | Audit Log  | | Cache    | | - OpenAI Compatible Protocol   | |<br>|  | Ops Data   | | Rate Lim | | - Usage Tracking & Cost        | |<br>|  +------------+ +----------+ +--------------------------------+ |<br>+=================================================================+</span>',
    },
    {
      type: 'paragraph',
      text: '<span class="hl-label">关键架构决策：</span>',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '<span class="hl-label">南北向唯一入口：</span>所有客户端流量经由 Go BFF 统一鉴权、限流、审计后转发内网服务。Mastra 与 RAGFlow 的原生控制台不对业务用户暴露，仅运维白名单可达。',
        '<span class="hl-label">东西向服务鉴权：</span>内网服务间调用携带 mTLS 或预共享密钥，防止横向移动攻击。',
        '<span class="hl-label">SSE 流式链路：</span>Go BFF 作为 SSE 代理，负责连接保活、中断清理、部分响应缓存，后端 Mastra 无状态设计便于水平扩展。',
        '<span class="hl-label">主备模型切换：</span>在 BFF 或 Mastra 层实现代码级主备逻辑，不依赖外部网关做模型路由，减少故障面。',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '4. 技术选型矩阵',
    },
    {
      type: 'paragraph',
      text: '以下为各层级技术选型的完整矩阵，含版本约束、选型理由与备选方案。',
    },
    {
      type: 'table',
      headers: ['层级', '选型', '版本约束', 'License', '职责', '备选 & 不选理由'],
      rows: [
        ['C 端 H5', '<span class="hl-accent">React 18 + Vite 5</span>', 'React ≥18.2, Vite ≥5.4', 'MIT', '流式对话 UI 引擎、Markdown 渲染组件、SSE 事件解析器、打字机动画、引用追溯卡片', 'Next.js：SSR 能力对 WebView 场景冗余，增加部署复杂度与构建体积'],
        ['运营后台', '<span class="hl-accent">React 18 + Vite 5</span>', 'React ≥18.2', 'MIT', '知识库运维、配额管理、审计看板、系统配置、RBAC 权限路由、数据可视化图表', 'Vue 3：与 C 端统一技术栈降低团队认知负荷'],
        ['接入网关', '<span class="hl-accent">自研 TLS 网关</span>', '—', '—', 'HTTPS 证书自动管理、反向代理路由引擎、WAF 规则、IP 白名单、静态资源加速', 'Nginx：配置复杂，TLS 需额外 acme.sh；Traefik：对简单部署过重'],
        ['BFF 层', '<span class="hl-accent">Go 1.22 + Gin</span>', 'Go ≥1.22, Gin ≥1.10', 'MIT', '鉴权、额度路由、SSE 代理、审计、内容安全', 'Node.js Express：并发模型不适合 SSE 长连接代理；Java Spring：过度工程化'],
        ['Auth 服务', '<span class="hl-accent">Go 1.22 自研</span>', 'Go ≥1.22', '—', 'OAuth2 授权码流程、一次性码签发与换票、与使用方用户体系对接', 'Keycloak：功能过剩、部署重、定制困难'],
        ['Billing 服务', '<span class="hl-accent">Go 1.22 自研</span>', 'Go ≥1.22', '—', '额度计量、原子扣减、套餐管理、账单流水', '—'],
        ['Agent 引擎', '<span class="hl-accent">Agent 编排引擎</span>', '—', '—', 'Agent 状态机、Tool 注册与调度、Workflow 流程引擎、Memory 上下文管理、RAG 检索能力', 'LangChain：抽象层过重、调试困难；LlamaIndex：偏数据侧'],
        ['检索引擎', '<span class="hl-accent">混合检索引擎</span>（按需增强）', '—', '—', '复杂文档解析（PDF/扫描件/表格）、向量+BM25 双路召回、Rerank 重排序、溯源引用', 'Milvus 独立部署：缺少文档解析层；Elasticsearch：向量能力弱，需额外组件'],
        ['文档存储', '<span class="hl-accent">文档存储服务</span>', '—', '—', '原始文档存取、多版本管理、访问控制、静态资源托管', '直接文件系统：缺乏冗余与访问控制'],
        ['数据库', '<span class="hl-accent">PostgreSQL 16</span>', '≥16', 'PostgreSQL', '会话线程、Agent 记忆、Workflow 快照、审计日志、运营数据', 'MySQL：JSON/向量扩展不如 PG；MongoDB：事务一致性问题'],
        ['缓存', '<span class="hl-accent">Redis 7</span>', '≥7.2', 'BSD-3/RSALv2', '配额缓存、限流计数、会话临时数据、分布式锁', 'Valkey：生态不如 Redis 成熟'],
        ['向量存储', '<span class="hl-accent">pgvector</span>', '≥0.7', 'PostgreSQL', '嵌入向量存储与 ANN 检索', '独立向量库：减少运维组件；pgvector 足够 Phase 1 规模'],
        ['大模型', '<span class="hl-accent">国内 OpenAI 兼容 API</span>', '—', '—', 'Chat Completion / Embedding；主备双路代码级切换', '本地模型部署：GPU 成本高、运维复杂，Phase 1 不必要'],
        ['可观测性', '<span class="hl-accent">OpenTelemetry + Prometheus + Grafana</span>', '—', 'Apache-2.0', '全链路追踪、指标采集、告警、Dashboard', 'ELK：偏日志、缺链路追踪'],
        ['容器编排', '<span class="hl-accent">Docker Compose</span>（Phase 1）', '—', '—', '单机多容器编排、一键部署', 'K8s：Phase 1 规模过重；Phase 2 评估迁移至 K3s'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '5. 组件职责与交互矩阵',
    },
    {
      type: 'heading',
      level: 3,
      text: '5.1 组件职责详述',
    },
    {
      type: 'table',
      headers: ['组件', '核心职责', '边界约束'],
      rows: [
        ['<span class="hl-label">React H5</span>', '对话 UI 渲染、SSE 流消费、Session 管理、引用/卡片展示、WebView 生命周期适配', '不直接调用 Mastra/RAGFlow；不持有长期密钥；所有 API 经 BFF'],
        ['<span class="hl-label">运营后台</span>', '文档上传与索引管理、合规词库配置、问答监控看板（图表+导出）、RBAC 权限管控', '独立账号体系；不与 C 端 Session 互通；操作均记录审计'],
        ['<span class="hl-label">Go BFF</span>', '唯一公网 API 入口；统一鉴权（C端Session/运营JWT）；额度前置校验与后置确认；SSE 流式代理；引用合法性校验；审计日志写入', '不执行业务逻辑；不做模型推理；不做文档解析；P99 < 50ms（非 SSE 链路）'],
        ['<span class="hl-label">Go Auth</span>', 'OAuth2 授权码模式；一次性 code 签发（TTL ≤5min，单次有效）；code 换 Session；与使用方用户体系对接', '仅处理身份凭证；不做授权决策（由 BFF 完成）；不存储业务数据'],
        ['<span class="hl-label">Go Billing</span>', '用户额度管理与计量；原子扣减（Lua 脚本）；套餐配置；消费流水记录', '不做业务判断；仅返回额度结果；扣减幂等设计'],
        ['<span class="hl-label">Mastra Agent</span>', '对话 Agent 编排；Tool 注册与调用（知识检索/商品查询/内容生成）；Workflow 定义与执行；上下文 Memory 管理；流式生成 SSE 输出', '不直接暴露公网；不持有用户身份信息；不存储原始文档'],
        ['<span class="hl-label">RAGFlow</span>', '文档解析（PDF/Word/扫描件）；向量+BM25 双路召回；Rerank 重排序；引用溯源；知识库版本管理', '仅提供检索 API；不承担 Agent 与业务鉴权；按需启用'],
        ['<span class="hl-label">LLM API</span>', 'Chat 文本生成；Embedding 向量化', '无状态调用；不缓存结果（由 Mastra 管理）'],
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: '5.2 服务交互拓扑',
    },
    {
      type: 'paragraph',
      text: '<span class="doc-code-block">                          +----------+<br>                          |Client App|<br>                          | WebView  |<br>                          +----+-----+<br>                               | (1) POST /api/v1/auth/app-code<br>                     +---------v---------+<br>                     |     Go Auth       |<br>                     |  Issue one-time   |<br>                     |  code (TTL 5min)  |<br>                     +---------+---------+<br>                               | (2) Return code<br>                     +---------v---------+<br>                     |   Client App      |<br>                     |   Open WebView    |<br>                     |   ?code=...       |<br>                     +---------+---------+<br>                               | (3) POST /api/v1/auth/exchange<br>                     +---------v---------+<br>                     |      Go BFF       |<br>                     |  code -> Session  |<br>                     |  Set-Cookie       |<br>                     +---------+---------+<br>                               | (4) POST /api/v1/chat/completions<br>                               |     (Cookie -> BFF Auth)<br>                     +---------v---------+    Go Billing<br>                     |      Go BFF       |--- (quota check<br>                     | - Auth           |--- + pre-deduct)<br>                     | - Content Safety |<br>                     | - Route Decision |<br>                     +--+-----------+----+<br>                        |           |<br>                  (5)   |           | (6) Search<br>               Question |           | (on-demand)<br>               Forward  |           |<br>                +-------v--+   +----v--------+<br>                |  Mastra  |   |  RAGFlow    |<br>                |  Agent   |<--+  Results    |<br>                +----+-----+   +-------------+<br>                     | (7) LLM API Call<br>                     | (primary/fallback)<br>                +----v-----+<br>                |  LLM API |<br>                | (OpenAI  |<br>                |  Compat) |<br>                +----+-----+<br>                     | (8) Streaming Tokens<br>                +----v-----+<br>                |  Mastra  |<br>                | SSE Pack |<br>                +----+-----+<br>                     | (9) SSE Stream<br>                     | (delta/citation/done)<br>                +----v-----+<br>                |  Go BFF  |<br>                |Proxy+Audit|<br>                +----+-----+<br>                     | (10) SSE -> H5<br>                +----v-----+<br>                | React H5 |<br>                +----------+</span>',
    },
    {
      type: 'heading',
      level: 2,
      text: '6. 数据架构',
    },
    {
      type: 'heading',
      level: 3,
      text: '6.1 存储分布',
    },
    {
      type: 'table',
      headers: ['数据域', '存储引擎', 'Schema 策略', '生命周期'],
      rows: [
        ['用户 & OAuth', 'Go Auth → PostgreSQL（使用方既有库）', '沿用使用方用户表 Schema', '随使用方用户体系'],
        ['会员 & 套餐', 'Go Auth 既有库', '扩展会员表、套餐表', '随业务周期'],
        ['额度账户', 'Go Billing → PostgreSQL', 'user_id | capability | total | used | frozen', '持久化'],
        ['额度缓存', 'Redis', 'quota:{user_id}:{capability} → remaining', 'TTL 与 DB 同步刷新'],
        ['账单流水', 'Go Billing → PostgreSQL', '流水表，按月分区', '保留 ≥1 年，按需归档'],
        ['审计日志', 'Go BFF → PostgreSQL', '统一 Schema：timestamp | actor | action | resource | result | detail(JSONB)', '保留 ≥180 天，按日分区'],
        ['对话线程', 'Mastra → PostgreSQL', 'Mastra Storage 原生 Schema', '用户主动删除或 90 天未活跃清理'],
        ['Agent 记忆', 'Mastra → PostgreSQL', 'Key-Value + 时间衰减', '对话线程级联删除'],
        ['Workflow 快照', 'Mastra → PostgreSQL', 'JSONB 序列化状态', 'Workflow 完成后保留 30 天'],
        ['文档块 & 向量（基础）', 'PostgreSQL + pgvector', 'doc_id | chunk_index | content | embedding(1536d) | metadata', '文档删除时级联'],
        ['文档块 & 向量（增强）', 'RAGFlow 自有存储', 'RAGFlow 内置 Schema', '随 RAGFlow 知识库生命周期'],
        ['原始文件', 'MinIO / 本地文件系统', '对象存储桶：knowledge-base/{doc_id}/{version}/raw', '与文档版本绑定'],
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: '6.2 数据流管控原则',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '<span class="hl-label">敏感数据不出 BFF：</span>用户手机号、身份证等 PII 仅 BFF 层可访问，不传入 Mastra 或 LLM。Prompt 中所有用户标识使用匿名化 token。',
        '<span class="hl-label">审计全覆盖：</span>每次对话请求的输入、检索结果、LLM 输出、引用、拦截决策均写入审计日志，支持按用户、时间、会话维度检索。',
        '<span class="hl-label">数据隔离：</span>C 端数据与运营数据物理表分离（不同 Schema），运营后台通过独立数据库用户访问。',
        '<span class="hl-label">向量与原始文件共存亡：</span>文档删除时，自动级联删除对应向量块与 MinIO 文件，不留孤儿数据。',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '7. 身份与访问控制（IAM）',
    },
    {
      type: 'heading',
      level: 3,
      text: '7.1 双域隔离模型',
    },
    {
      type: 'table',
      headers: ['域', '用户来源', '认证方式', '凭证类型', '授权范围'],
      rows: [
        ['C 端用户', '使用方 App 用户体系', '一次性 code → Go Auth 换票', 'HttpOnly Secure Cookie（Session）', '对话、查询、个人额度'],
        ['运营人员', '自研后台账号', '用户名+密码+OTP（可选）', 'JWT Bearer Token（≤2h 过期）', '知识库管理、配额配置、审计查看'],
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-label">隔离规则：</span>App Token 不可登录运营后台；运营账号不可默认冒充 C 端用户（需走 Impersonate 审批流程后单独授权）；JWT 与 Session Cookie 在不同的 BFF 中间件链中校验，无法互相复用。',
    },
    {
      type: 'heading',
      level: 3,
      text: '7.2 App 免登时序（详细）',
    },
    {
      type: 'mermaid',
      text: `sequenceDiagram
    autonumber
    actor User as 代理用户
    participant App as 使用方 APP
    participant AppSrv as 使用方 服务端
    participant GoAuth as 平台方 Go Auth
    participant Redis as Redis
    participant WebView as APP WebView
    participant H5 as 平台方 C-End H5
    participant BFF as 平台方 Go BFF

    Note over User, BFF: ═══ 第一阶段：使用方 APP 向平台方申请一次性授权码 ═══
    User->>App: 点击 AI 智能体入口
    App->>App: 收集当前登录用户身份
    Note right of App: 使用方本地已登录用户
    App->>GoAuth: POST /api/v1/auth/app-code
    Note right of App: Header: API Key / mTLS 证书
    Note right of App: Body: { user_id, account_name, ... }
    Note over App, GoAuth: ★ 使用方调用平台方，申请一次性授权码
    GoAuth->>GoAuth: 校验 API Key 有效性
    GoAuth->>Redis: 写入 code → user_id 映射
    Note right of GoAuth: code: 32字节随机串<br/>TTL: 5分钟
    Redis-->>GoAuth: OK
    GoAuth-->>App: 200 OK { code, expires_in: 300 }

    Note over User, BFF: ═══ 第二阶段：使用方打开 WebView 并注入 code ═══
    App->>WebView: 初始化 WebView
    App->>WebView: 加载 H5 地址
    Note right of App: https://h5-domain/chat?code=xxx&app_id=xxx

    Note over User, BFF: ═══ 第三阶段：使用方服务端向平台方换取 Session（核心鉴权） ═══
    WebView->>H5: 加载 H5 页面
    H5->>H5: 从 URL 解析 code 参数
    H5->>App: JSBridge: postMessage({ type: "exchangeCode", code })
    Note right of H5: H5 通过 JSBridge 回传 code 给使用方
    App->>AppSrv: 转发 code 到使用方服务端
    Note right of App: 使用方 APP 作为代理转发
    AppSrv->>GoAuth: POST /api/v1/auth/exchange
    Note right of AppSrv: Body: { code, app_id }
    Note over AppSrv, GoAuth: ★ 使用方调用平台方鉴权（code 换身份信息）
    GoAuth->>Redis: 查询 code 并获取 user_id
    Redis-->>GoAuth: code 有效 → user_id
    GoAuth->>Redis: DELETE code（防重放）
    GoAuth->>GoAuth: 生成 SessionToken (JWT)
    GoAuth->>Redis: 写入 Session → user_id 映射
    Note right of GoAuth: Session TTL: 24h<br/>滑动窗口续期: 30min
    GoAuth-->>AppSrv: 200 OK { session_token, user_id, permissions }
    AppSrv-->>App: 返回 session_token
    App->>H5: JSBridge: callback({ session_token })
    Note left of App: 使用方将 SessionToken 注入 H5

    Note over User, BFF: ═══ 第四阶段：H5 携带 SessionToken 访问平台方服务 ═══
    H5->>H5: 存储 SessionToken 到内存
    Note right of H5: 安全存储，不落盘
    loop 每次业务请求
        H5->>BFF: GET/POST /api/v1/*
        Note right of H5: Authorization: Bearer {session_token}
        BFF->>BFF: 中间件解析 SessionToken
        BFF->>Redis: 校验 Session 有效性
        Redis-->>BFF: Session 有效 → user_id + permissions
        Note right of BFF: 注入 user_id + role<br/>到 Request Context
        BFF->>BFF: 转发业务逻辑处理
        BFF-->>H5: 返回业务数据
        H5-->>User: 渲染 AI 智能体界面
    end

    Note over User, BFF: ═══ 第五阶段：Session 管理与异常处理 ═══
    alt 正常活跃续期
        BFF->>Redis: 刷新 Session TTL (滑动窗口 30min)
    else Token 过期（使用方静默续期）
        H5->>App: JSBridge: requestRefreshToken()
        App->>AppSrv: 请求续期
        AppSrv->>GoAuth: POST /api/v1/auth/refresh
        Note over AppSrv, GoAuth: ★ 使用方调用平台方续期
        GoAuth-->>AppSrv: 200 { new_session_token }
        AppSrv-->>H5: 返回新 SessionToken
    else 用户退出登录
        App->>H5: JSBridge: notifyLogout()
        H5->>BFF: POST /api/v1/auth/logout
        BFF->>Redis: 删除 Session
        BFF-->>H5: Clear Token 响应
        H5->>H5: 清除本地 SessionToken
    else 服务端强制踢出
        BFF->>Redis: 删除 Session
        BFF-->>H5: 401 Unauthorized
        H5->>App: JSBridge: notifyKickedOut()
    end`,
    },
    {
      type: 'heading',
      level: 3,
      text: '7.3 浏览器访问策略',
    },
    {
      type: 'table',
      headers: ['策略', '行为', '适用场景'],
      rows: [
        ['<span class="hl-warn">A：App Only</span>', 'User-Agent 白名单 + 来源校验；非 App 环境返回 403', '使用方要求全封闭场景'],
        ['<span class="hl-good">B：受限浏览器（默认）</span>', '浏览器可访问，游客每日 5 次额度；完整功能需扫码绑定 App 账号后登录', 'Phase 1 默认策略'],
        ['<span class="hl-info">C：完全开放</span>', '独立 Web 注册登录，额度与 App 共享', 'Phase 2 评估'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '8. 对话与检索链路',
    },
    {
      type: 'heading',
      level: 3,
      text: '8.1 Phase 1 标准链路（Mastra RAG）',
    },
    {
      type: 'paragraph',
      text: '<code>用户提问 → Go BFF（鉴权/内容安全/额度预扣）→ Mastra Agent（检索判断 → pgvector ANN 召回 → 上下文拼接 → System Prompt 注入）→ LLM 流式生成 → Mastra SSE 组装（delta + citation 事件）→ Go BFF 透传 + 引用合法性校验 + 审计 → SSE 推送至 H5 → 打字机渲染 + 引用展示</code>',
    },
    {
      type: 'heading',
      level: 3,
      text: '8.2 RAGFlow 增强链路（按需启用）',
    },
    {
      type: 'paragraph',
      text: '<code>用户提问 → Go BFF（同上）→ Mastra → 判断需深度检索 → Go BFF 旁路 RAGFlow（向量+BM25 双路召回 → Rerank → Top-K 片段+溯源页码）→ 片段注入 Mastra 上下文 → LLM 生成 → SSE</code>',
    },
    {
      type: 'paragraph',
      text: '<span class="hl-label">RAGFlow 启用条件（满足任一）：</span>',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '复杂 PDF/扫描件/含表格文档解析质量不满足业务要求',
        '约定评测集 Top-3 召回率 < 85%',
        '需页级/块级强溯源引用，且 Mastra 侧能力不足',
        '文档规模 > 10,000 chunks，pgvector 单表检索性能下降',
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: '8.3 质量保障基线',
    },
    {
      type: 'table',
      headers: ['维度', '指标', '目标值', '度量方式'],
      rows: [
        ['检索质量', 'Top-3 召回率', '≥ 85%', '约定评测集 + 周度自动化评测'],
        ['检索质量', 'MRR (Mean Reciprocal Rank)', '≥ 0.75', '评测集 Mean Reciprocal Rank'],
        ['生成质量', '引用准确率', '≥ 95%', '人工抽检 + BFF 自动校验'],
        ['生成质量', '拒答率（无依据问题）', '≥ 90% 正确拒答', 'System Prompt + BFF 后校验'],
        ['响应延迟', '首 Token 时间（TTFT）', 'P50 ≤ 1.5s, P99 ≤ 3s', 'BFF 层埋点 OpenTelemetry Span'],
        ['响应延迟', '完整响应时间', 'P50 ≤ 8s, P99 ≤ 20s', '端到端 Span 统计'],
        ['内容安全', '拦截率', '敏感内容 100% 拦截', 'BFF 合规引擎 + 审计回溯'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '9. 模型调用与成本控制',
      card: true,
    },
    {
      type: 'heading',
      level: 3,
      text: '9.1 主备双路架构',
    },
    {
      type: 'paragraph',
      text: '<code>primary: {baseURL, apiKey, model} → 超时 30s / 连续失败 3 次 → fallback: {baseURL, apiKey, model} → 超时 30s → 返回错误 + 审计告警</code>',
    },
    {
      type: 'paragraph',
      text: '切换逻辑在 BFF 或 Mastra 层实现（代码级，不依赖外部网关）。切换事件写入审计日志并触发告警通知。主路恢复后自动切回（需连续成功 3 次确认）。',
    },
    {
      type: 'heading',
      level: 3,
      text: '9.2 成本控制策略',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '<span class="hl-label">Prompt 缓存：</span>System Prompt 与检索到的知识片段通过内容哈希去重，避免重复消耗 Token',
        '<span class="hl-label">上下文窗口控制：</span>滑动窗口保留最近 N 轮对话（默认 10 轮），超出部分摘要压缩而非完整保留',
        '<span class="hl-label">温度参数：</span>知识问答场景使用 temperature=0.1~0.2，减少随机性降低重复生成',
        '<span class="hl-label">Embedding 批处理：</span>文档入库时批量调用 Embedding API，降低 API 调用次数',
        '<span class="hl-label">用量归因：</span>每次调用记录 user_id + session_id + purpose，支持按用户/场景/时段做成本分析',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '10. 对外 API 规范（Go BFF）',
    },
    {
      type: 'table',
      headers: ['接口', '方法', '认证', '说明'],
      rows: [
        ['<span class="hl-accent">/api/v1/auth/app-code</span>', 'POST', '服务端凭证 (API Key / mTLS)', 'App 服务端申请一次性授权码'],
        ['<span class="hl-accent">/api/v1/auth/exchange</span>', 'POST', '一次性 code', 'code 换 Session（Set-Cookie）'],
        ['<span class="hl-accent">/api/v1/auth/logout</span>', 'POST', 'Session Cookie', '退出登录（清 Redis + Clear Cookie）'],
        ['<span class="hl-accent">/api/v1/chat/completions</span>', 'POST', 'Session Cookie', '对话（SSE 流式：meta / delta / citation / done / error）'],
        ['<span class="hl-accent">/api/v1/chat/history</span>', 'GET', 'Session Cookie', '获取历史对话列表（分页）'],
        ['<span class="hl-accent">/api/v1/chat/threads/:id</span>', 'GET', 'Session Cookie', '获取指定对话线程详情'],
        ['<span class="hl-accent">/api/v1/me/quota</span>', 'GET', 'Session Cookie', '剩余额度与套餐信息'],
        ['<span class="hl-accent">/api/v1/me/feedback</span>', 'POST', 'Session Cookie', '用户反馈（赞/踩 + 文本）'],
        ['<span class="hl-accent">/api/v1/knowledge/search</span>', 'GET', 'Session Cookie', '知识库关键词搜索/分类浏览'],
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: 'SSE 事件协议',
    },
    {
      type: 'table',
      headers: ['事件类型', '字段', '说明'],
      rows: [
        ['<span class="hl-accent">meta</span>', '{"session_id":"...","thread_id":"..."}', '对话元信息，首次事件必发'],
        ['<span class="hl-accent">delta</span>', '{"content":"...","token_index":123}', '增量文本 Token'],
        ['<span class="hl-accent">citation</span>', '{"index":1,"doc_title":"...","chunk":"...","page":3}', '引用片段，完成时批量或逐个推送'],
        ['<span class="hl-accent">done</span>', '{"total_tokens":456,"cost":0.023}', '完成信号 + Token 用量'],
        ['<span class="hl-accent">error</span>', '{"code":"...","message":"...","retryable":true}', '错误事件，可重试标记'],
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: '统一错误码',
    },
    {
      type: 'table',
      headers: ['错误码', 'HTTP 状态码', '含义', '客户端动作'],
      rows: [
        ['<span class="hl-warn">UNAUTHORIZED</span>', '401', '未登录或 Session 失效', '引导重新登录'],
        ['<span class="hl-warn">FORBIDDEN</span>', '403', '无权限访问该资源', '提示权限不足'],
        ['<span class="hl-warn">QUOTA_EXCEEDED</span>', '429', '额度不足', '提示充值或等待重置'],
        ['<span class="hl-warn">RATE_LIMITED</span>', '429', '请求频率超限', '提示稍后重试 + Retry-After'],
        ['<span class="hl-warn">CONTENT_BLOCKED</span>', '422', '内容安全拦截', '提示内容不合规'],
        ['<span class="hl-warn">INVALID_CODE</span>', '400', '授权码无效或已使用', 'App 重新申请 code'],
        ['<span class="hl-warn">UPSTREAM_ERROR</span>', '502', '上游模型或引擎异常', '自动重试 or 提示稍后'],
        ['<span class="hl-warn">INTERNAL_ERROR</span>', '500', '服务内部错误', '自动重试 or 联系运维'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '11. 可观测性体系',
    },
    {
      type: 'heading',
      level: 3,
      text: '11.1 三大支柱',
    },
    {
      type: 'table',
      headers: ['支柱', '技术选型', '实施要点'],
      rows: [
        ['<span class="hl-label">Logging（日志）</span>', 'Go: zerolog → stdout → Docker log driver', '统一 JSON Schema；请求 ID 贯穿全链路；分级（DEBUG/INFO/WARN/ERROR）'],
        ['<span class="hl-label">Metrics（指标）</span>', 'Prometheus + Grafana', 'RED 指标（Rate/Errors/Duration）；LLM Token 用量；SSE 连接数；配额消耗趋势'],
        ['<span class="hl-label">Tracing（追踪）</span>', 'OpenTelemetry → Jaeger', '每个请求一个 TraceID：BFF → Auth → Billing → Mastra → LLM → 响应；Span 包含关键属性'],
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: '11.2 关键告警规则',
    },
    {
      type: 'table',
      headers: ['告警项', '条件', '级别', '通知方式'],
      rows: [
        ['BFF 错误率', '5xx 错误率 > 1%（5min 窗口）', 'P1', '即时通知'],
        ['LLM 调用失败率', '主路 + 备路均失败 > 3 次连续', 'P0', '即时通知 + 电话'],
        ['SSE 连接异常断开', '异常断开率 > 5%（5min 窗口）', 'P2', '即时通知'],
        ['额度扣减成功率', '成功率 < 99.9%（5min 窗口）', 'P1', '即时通知'],
        ['对话 P99 延迟', 'P99 > 5s（5min 窗口）', 'P2', '即时通知'],
        ['磁盘使用率', 'PostgreSQL / MinIO > 80%', 'P2', '即时通知'],
        ['内存使用率', '任意关键服务 > 85%', 'P3', '日报告警汇总'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '12. 安全架构',
    },
    {
      type: 'heading',
      level: 3,
      text: '12.1 纵深防御层次',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '<span class="hl-label">L1 — 网络边界：</span>Caddy TLS 终止 + IP 白名单（可选）+ 基础限流；仅暴露 443 端口',
        '<span class="hl-label">L2 — 应用网关：</span>Go BFF 统一鉴权 + 内容安全钩子 + 请求参数校验；所有入参经过严格 validate + sanitize',
        '<span class="hl-label">L3 — 服务间：</span>内网服务通过 mTLS 或预共享密钥互认；网络策略限制东西向流量',
        '<span class="hl-label">L4 — 数据层：</span>PostgreSQL 连接 TLS；敏感字段 AES-256 加密存储；审计日志不可篡改（append-only 表）',
        '<span class="hl-label">L5 — 模型层：</span>Prompt 注入防护（输入净化 + 角色边界指令）；LLM 输出校验（格式 + 引用合法性 + 敏感信息检测）',
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: '12.2 内容安全引擎',
    },
    {
      type: 'paragraph',
      text: 'Go BFF 内置内容安全引擎，支持可配置的敏感词库与拦截策略：',
    },
    {
      type: 'table',
      headers: ['检测点', '策略', '动作'],
      rows: [
        ['用户输入', '敏感词匹配（AC 自动机）+ 关键词权重评分', '≥阈值 → 拒绝请求 + 返回 CONTENT_BLOCKED'],
        ['LLM 输出', '敏感词检测 + 格式校验 + 引用合法性', '含敏感内容 → 替换为预设兜底话术 + 审计告警'],
        ['文件上传', '文件类型白名单 + 病毒扫描（ClamAV） + 大小限制', '不合规 → 拒绝上传'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '13. 部署拓扑',
    },
    {
      type: 'heading',
      level: 3,
      text: '13.1 Phase 1 单机部署（Docker Compose）',
    },
    {
      type: 'paragraph',
      text: '<span class="doc-code-block">+=================================================================+<br>|                   CLIENT SERVER (Linux x86_64)                  |<br>|                                                                 |<br>|  +-------------------------------------------------------------+|<br>|  | Caddy (TLS Termination + Reverse Proxy)                    | |<br>|  | Port: 443 -> Internal Routes                               | |<br>|  +-----------------------------+-------------------------------+|<br>|                                v                                |<br>|  +-------------------------------------------------------------+|<br>|  | Go BFF (Port: 8080)                                        | |<br>|  +--+-------------+-------------+-----------------------------+ |<br>|                 v  v             v             v                |<br>|  +--+--+ +--------+----+ +------+---------+                     |<br>|  | Auth | |  Billing    | |    Mastra      |                    |<br>|  | :8081| |  :8082      | |    :3000       |                    |<br>|  +--+---+ +-------+-----+ +---+------------+                    |<br>|                 v  v             v             v                |<br>|  +--v--------v----+  +----------v--------+                      |<br>|  | PostgreSQL 16  |  |      Redis 7      |                      |<br>|  | (:5432)        |  |      (:6379)      |                      |<br>|  | +pgvector ext  |  |  Quota Cache      |                      |<br>|  | Session/Audit  |  |  Rate-Limit       |                      |<br>|  +----------------+  +-------------------+                      |<br>|                                                                 |<br>|  +------------------+  +---------------------------+            |<br>|  |      MinIO       |  |  RAGFlow (On-Demand)      |            |<br>|  |      :9000       |  |  :8088                    |            |<br>|  |  Doc Storage     |  |  Doc Parse + Hybrid Srch  |            |<br>|  +------------------+  +---------------------------+            |<br>|                                                                 |<br>|  +-------------------------------------------------------------+|<br>|  | Prometheus + Grafana + Jaeger (Optional)                   | |<br>|  +-------------------------------------------------------------+|<br>+=================================================================+</span>',
    },
    {
      type: 'heading',
      level: 3,
      text: '13.2 资源配置参考（Phase 1）',
    },
    {
      type: 'table',
      headers: ['服务', 'CPU', '内存', '磁盘', '备注'],
      rows: [
        ['Go BFF + Auth + Billing', '2 Core', '1 GB', '—', '可合并部署'],
        ['Mastra Agent', '4 Core', '4 GB', '—', '含 Node.js 运行时'],
        ['RAGFlow（按需）', '4 Core', '8 GB', '20 GB', '含 Elasticsearch + 解析服务'],
        ['PostgreSQL 16', '2 Core', '2 GB', '50 GB 起', '含 pgvector 索引'],
        ['Redis 7', '1 Core', '512 MB', '—', 'AOF 持久化建议开启'],
        ['MinIO', '1 Core', '512 MB', '100 GB 起', '按文档规模扩容'],
        ['Caddy', '0.5 Core', '128 MB', '—', '—'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '14. 持续集成与交付（CI/CD）',
    },
    {
      type: 'table',
      headers: ['阶段', '工具/方法', '说明'],
      rows: [
        ['代码管理', 'Git（使用方指定仓库）', '主干开发 + 功能分支；PR Review 必选'],
        ['代码质量', 'golangci-lint (Go) / ESLint (TS/React)', '提交前自动检查；CI 阻断不通过'],
        ['构建', '多阶段 Docker Build', '静态编译 Go 二进制 → Distroless 基础镜像；前端 → Nginx Alpine / 静态文件'],
        ['测试', 'Go: testify + httptest; 前端: Vitest', '单元测试 CI 必过；集成测试按需'],
        ['制品管理', 'Docker Registry（使用方内部或 Harbor）', '镜像 tag: {git_sha}-{timestamp}'],
        ['部署', 'Docker Compose / Ansible', 'Phase 1: docker compose up -d + 健康检查'],
        ['回滚', 'Docker tag 回指 + 重启', '保留最近 3 个版本镜像；回滚时间 ≤ 5 分钟'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '15. 技术风险评估',
    },
    {
      type: 'table',
      headers: ['风险项', '概率', '影响', '缓解措施'],
      rows: [
        ['LLM API 供应商不稳定', '中', '高', '主备双路代码级切换 + 本地缓存高频问答 + 降级兜底话术'],
        ['RAGFlow 集成复杂度超预期', '中', '中', 'Phase 1 默认 Mastra RAG；RAGFlow 按需启用，不阻塞交付'],
        ['使用方 App WebView 兼容性问题', '中', '中', 'WkWebView (iOS) / Chromium WebView (Android) 双端专项测试；白屏兜底 + 降级 H5'],
        ['PostgreSQL 性能瓶颈', '低', '中', 'pgvector IVFFlat/HNSW 索引优化；连接池（PgBouncer）；只读副本分离分析查询'],
        ['并发量超预期', '低', '低', 'Redis 限流 + Go BFF 无状态水平扩展 + PostgreSQL 连接池'],
        ['合规审计要求变更', '低', '高', '审计日志 Schema 预留扩展字段（JSONB）；BFF 中间件链支持插拔'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '16. 交付范围',
    },
    {
      type: 'heading',
      level: 3,
      text: '16.1 Phase 1 交付物',
    },
    {
      type: 'table',
      headers: ['交付物', '说明'],
      rows: [
        ['<span class="hl-label">H5 对话应用</span>', '可嵌入使用方 App WebView；支持流式对话、引用展示、多轮历史、评价反馈'],
        ['<span class="hl-label">运营管理后台</span>', '知识库运维、合规词库管理、问答监控看板、权限与系统配置'],
        ['<span class="hl-label">Go BFF + Auth/Billing</span>', '含与使用方现有 OAuth 集成；Docker 镜像 + 源码'],
        ['<span class="hl-label">Mastra Agent 服务</span>', '内网部署配置；Agent/Workflow/Tool 定义；Memory 与基础 RAG 配置'],
        ['<span class="hl-label">RAGFlow（按需）</span>', '配置与发行版；与 Mastra 集成适配'],
        ['<span class="hl-label">技术文档</span>', '部署手册（含环境变量表、网络拓扑）、运维手册（含日常巡检、应急预案）、API 文档（OpenAPI 3.0）'],
        ['<span class="hl-label">联调与验收</span>', 'WebView 双端联调通过；约定评测集召回率 ≥85%；上线验收确认'],
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: '16.2 Phase 1 功能清单',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '文档导入与入库（PDF / Word，格式以所选引擎支持为准）',
        '三库索引搭建（招商库、产品库、合规库，逻辑隔离独立索引）',
        '流式知识库问答 + 原文引用溯源',
        '无依据拒答（System Prompt + BFF 后校验双重保障）',
        'App 一次性码免登接入',
        '用户级问答额度控制',
        '合规敏感词实时拦截与分级处理（警告/禁止）',
        '审计日志全量记录',
        '内容安全钩子（输入 + 输出双向检测）',
        '自研运营后台最小可用集',
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: '16.3 Phase 1 不含（明确边界）',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '生图 / 生视频 / 语音交互',
        '复杂商品推荐与 ERP / CRM 深度对接',
        '等保测评 / 信创适配打包',
        '开源引擎原生控制台作为产品界面直接交付',
        '原生 iOS / Android 对话 SDK',
        'NewAPI 类中转台交付',
        '多租户 SaaS 化改造',
        '自训练 / 微调模型',
      ],
    },
  ],
};