/**
 * Tech Selection & Architecture - English
 */
export var techSelectionDocEn = {
  title: 'Technology Selection & Architecture',
  sections: [
    { type: 'heading', level: 2, text: '1. Architectural Philosophy' },
    {
      type: 'paragraph',
      text: 'This solution follows three core principles: <span class="hl-label">API-first Design</span>, <span class="hl-label">Separation of Concerns</span>, and <span class="hl-label">Progressive Complexity Management</span>. We build upon proven open-source components rather than reinventing infrastructure. Rather than chasing technology trends, the primary goal is secure, compliant private deployment with long-term maintainability.',
    },
    {
      type: 'table',
      headers: ['Principle', 'Definition', 'Implementation'],
      rows: [
        ['<span class="hl-label">Layered Decoupling</span>', 'Each layer has a single responsibility; layers communicate via well-defined API contracts', 'Go BFF as sole external gateway; Mastra/RAGFlow deployed internally, consoles not exposed'],
        ['<span class="hl-label">Defensive Design</span>', 'Every component assumes upstream is untrusted and downstream is unreliable', 'Auth enforced at BFF boundary; all internal calls carry service credentials; graceful degradation on cascading failures'],
        ['<span class="hl-label">Observability First</span>', 'Key metrics and traces instrumented before go-live', 'OpenTelemetry across all services; structured JSON logging with unified schema; SLA monitors on critical paths'],
        ['<span class="hl-label">Config as Code</span>', 'All environment differences managed through config files and environment variables', '12-Factor App methodology; single Docker Compose deployment; zero-intrusion env-var-driven configuration'],
        ['<span class="hl-label">Progressive Enhancement</span>', 'Phase 1 delivers a minimal closed loop; Phase 2 extends from a stable foundation', 'RAGFlow enabled on-demand; Agent tools hot-pluggable via registry; model primary/fallback seamless switching'],
      ],
    },
    { type: 'heading', level: 2, text: '2. Build Objectives' },
    {
      type: 'table',
      headers: ['Phase', 'Objective', 'Core Deliverables', 'Acceptance Criteria'],
      rows: [
        ['<span class="hl-label">Phase 1</span>', 'Privately deployable KB Q&A assistant', 'Streaming dialogue, source citation, App auto-login, user quota, ops backend, compliance filtering', 'Recall ≥85%, P99 latency ≤3s, Availability ≥99.5%'],
        ['<span class="hl-label">Phase 2</span>', 'Multi-modal Agent intelligence', 'Product rec cards, marketing poster gen, short video tasks, Agent tool marketplace', 'Tool call success ≥95%, measurable CTR improvement'],
      ],
    },
    { type: 'heading', level: 2, text: '3. Overall Architecture' },
    {
      type: 'paragraph',
      text: '<span class="hl-label">Architecture Overview (Logical Layers)</span>',
    },
    {
      type: 'paragraph',
      text: '<span class="doc-code-block">+=================================================================+<br>|                        PRESENTATION LAYER                       |<br>|                                                                 |<br>|  +------------------------+  +------------------------+         |<br>|  | C-End H5 (WebView)    |  | Ops Admin (SPA)       |           |<br>|  | React + assistant-ui  |  | React + Ant Design    |           |<br>|  +-----------+------------+  +-----------+------------+         |<br>|             |  HTTPS+Session Cookie   |  | JWT Bearer           |<br>+=================================================================+<br>|                   v                          v                  |<br>|                          GATEWAY LAYER                          |<br>|                                                                 |<br>|  +-------------------------------------------------------------+|<br>|  |          Caddy / Traefik (TLS, Rate-Limit, WAF)            | |<br>|  +-----------------------------+-------------------------------+|<br>|                                v                                |<br>|  +-------------------------------------------------------------+|<br>|  |               Go BFF (Single External Entry)               | |<br>|  | - Unified Auth (C-End Session / Admin JWT)                 | |<br>|  | - Quota Verification & Deduction Proxy                     | |<br>|  | - SSE Streaming Proxy & Interrupt Handling                 | |<br>|  | - Audit Logging (Req/Resp/Citation/Decision)               | |<br>|  | - Content Safety Hook (Sensitive Word -> Block/Replace)    | |<br>|  +--+-----------+-----------+-------------+-------------------+ |<br>+=================================================================+<br>|             v           v           v             v             |<br>|                      BUSINESS SERVICE LAYER                     |<br>|                                                                 |<br>|  +----------+ +----------+ +-------------+ +------------------+ |<br>|  | Go Auth  | |Go Billing| |Mastra Agent | |    RAGFlow      |  |<br>|  | OAuth2   | | Quota    | | (Internal)  | | (On-Demand)     |  |<br>|  | OT Code  | | Engine   | | Agent/WF    | | Doc Parsing     |  |<br>|  | Exchange | | Metering | | Memory/RAG  | | Hybrid Search   |  |<br>|  +----+-----+ +----+-----+ +------+------+ +-------+----------+ |<br>+=================================================================+<br>|             v           v           v              v            |<br>|                       INFRASTRUCTURE LAYER                      |<br>|                                                                 |<br>|  +------------+ +----------+ +--------------------------------+ |<br>|  | PostgreSQL | | Redis    | | Domestic LLM/Embedding API     | |<br>|  | Sessions   | | Quota    | | - Active-Standby Switching     | |<br>|  | Audit Log  | | Cache    | | - OpenAI Compatible Protocol   | |<br>|  | Ops Data   | | Rate Lim | | - Usage Tracking & Cost        | |<br>|  +------------+ +----------+ +--------------------------------+ |<br>+=================================================================+</span>',
    },
    {
      type: 'paragraph',
      text: '<span class="hl-label">Key Architecture Decisions:</span>',
    },
    {
      type: 'list', ordered: false,
      items: [
        '<span class="hl-label">Single North-South Entry:</span> All client traffic passes through Go BFF for unified auth, rate-limiting, and auditing before forwarding to internal services. Mastra and RAGFlow native consoles are not exposed to business users.',
        '<span class="hl-label">East-West Service Auth:</span> Internal service calls carry mTLS or pre-shared keys to prevent lateral movement attacks.',
        '<span class="hl-label">SSE Streaming Chain:</span> Go BFF acts as SSE proxy, handling keep-alive, interruption cleanup, and partial response caching. Stateless Mastra enables horizontal scaling.',
        '<span class="hl-label">Model Active-Standby:</span> Code-level failover logic in BFF or Mastra layer; no external gateway dependency for model routing, reducing failure surface.',
      ],
    },
    { type: 'heading', level: 2, text: '4. Technology Selection Matrix' },
    {
      type: 'paragraph',
      text: 'Complete technology matrix for each layer, including version constraints, selection rationale, and alternatives.',
    },
    {
      type: 'table',
      headers: ['Layer', 'Selection', 'Version Constraint', 'License', 'Responsibility', 'Alternatives & Reasons Not Chosen'],
      rows: [
        ['C-End H5', '<span class="hl-accent">React 18 + Vite 5</span>', 'React ≥18.2, Vite ≥5.4', 'MIT', 'Streaming chat UI, citation rendering, custom message components, SSE consumption', 'Next.js: SSR adds complexity for WebView; increases deployment burden & build size'],
        ['C-End H5 UI', '<span class="hl-accent">assistant-ui</span>', 'latest stable', 'MIT', 'Chat bubbles, Markdown rendering, typewriter effect, file citation display', 'Custom-built: reinventing wheel; Ant Design X: heavy coupling'],
        ['Ops Admin', '<span class="hl-accent">React 18 + Vite 5</span>', 'React ≥18.2', 'MIT', 'KB operations, quota management, audit dashboard, system config', 'Vue 3: unified stack with C-End reduces team cognitive load'],
        ['Ops Admin UI', '<span class="hl-accent">Ant Design 5</span>', '≥5.0', 'MIT', 'Tables, forms, charts, permission routing', 'Shadcn/ui: good customizability but incomplete component library for admin scenarios'],
        ['Ingress Gateway', '<span class="hl-accent">Caddy 2</span>', '≥2.8', 'Apache-2.0', 'Auto TLS renewal, reverse proxy, rate limiting, static assets', 'Nginx: complex config, separate acme.sh for TLS; Traefik: over-engineered for simple deployment'],
        ['BFF Layer', '<span class="hl-accent">Go 1.22 + Gin</span>', 'Go ≥1.22, Gin ≥1.10', 'MIT', 'Auth, quota routing, SSE proxy, audit, content safety', 'Node.js Express: concurrency model unsuited for SSE long connections; Java Spring: over-engineering'],
        ['Auth Service', '<span class="hl-accent">Go 1.22 Custom</span>', 'Go ≥1.22', '—', 'OAuth2 authorization code flow, one-time code issuance & exchange, client user system integration', 'Keycloak: feature bloat, heavy deployment, difficult customization'],
        ['Billing Service', '<span class="hl-accent">Go 1.22 Custom</span>', 'Go ≥1.22', '—', 'Quota metering, atomic deduction, plan management, transaction records', '—'],
        ['Agent Engine', '<span class="hl-accent">Mastra</span>', 'latest Apache-2.0 core', 'Apache-2.0', 'Agent orchestration, Tool registration, Workflow engine, Memory mgmt, basic RAG', 'LangChain: over-abstraction, hard to debug; LlamaIndex: leans toward data side'],
        ['Search Engine', '<span class="hl-accent">RAGFlow</span> (on-demand)', 'latest stable', 'Apache-2.0', 'Complex doc parsing (PDF/scans/tables), hybrid search (vector+BM25), reranking, source tracing', 'Standalone Milvus: lacks document parsing; Elasticsearch: weak vector capabilities, needs extra components'],
        ['Object Storage', '<span class="hl-accent">MinIO</span>', 'latest stable', 'AGPL-3.0', 'Raw document storage, static asset hosting', 'Direct filesystem: no redundancy or access control'],
        ['Database', '<span class="hl-accent">PostgreSQL 16</span>', '≥16', 'PostgreSQL', 'Session threads, agent memory, workflow snapshots, audit logs, operational data', 'MySQL: JSON/vector extensions inferior; MongoDB: transaction consistency issues'],
        ['Cache', '<span class="hl-accent">Redis 7</span>', '≥7.2', 'BSD-3/RSALv2', 'Quota cache, rate-limit counters, temporary session data, distributed locks', 'Valkey: less mature ecosystem'],
        ['Vector Store', '<span class="hl-accent">pgvector</span>', '≥0.7', 'PostgreSQL', 'Embedding vector storage & ANN search', 'Standalone vector DB: reduces operational components; pgvector sufficient for Phase 1 scale'],
        ['LLM', '<span class="hl-accent">Domestic OpenAI-Compatible API</span>', '—', '—', 'Chat Completion / Embedding; code-level active-standby switching', 'Local model deployment: high GPU cost, complex ops, unnecessary for Phase 1'],
        ['Observability', '<span class="hl-accent">OpenTelemetry + Prometheus + Grafana</span>', '—', 'Apache-2.0', 'Distributed tracing, metrics collection, alerting, dashboards', 'ELK: log-focused, lacks distributed tracing'],
        ['Container Orchestration', '<span class="hl-accent">Docker Compose</span> (Phase 1)', '—', '—', 'Single-node multi-container orchestration, one-click deployment', 'K8s: too heavy for Phase 1; evaluate migration to K3s in Phase 2'],
      ],
    },
    { type: 'heading', level: 2, text: '5. Component Responsibilities & Interaction Matrix' },
    { type: 'heading', level: 3, text: '5.1 Component Responsibilities' },
    {
      type: 'table',
      headers: ['Component', 'Core Responsibility', 'Boundary Constraints'],
      rows: [
        ['<span class="hl-label">React H5</span>', 'Chat UI rendering, SSE stream consumption, Session management, citation/card display, WebView lifecycle', 'No direct Mastra/RAGFlow calls; never holds long-term keys; all API via BFF'],
        ['<span class="hl-label">Ops Admin</span>', 'Document upload & index management, compliance lexicon config, Q&A monitoring dashboard (charts+export), RBAC', 'Independent account system; no C-End session sharing; all ops audited'],
        ['<span class="hl-label">Go BFF</span>', 'Single public API; unified auth (C-End Session/Admin JWT); quota pre-check & post-confirm; SSE streaming proxy; citation validation; audit logging', 'No business logic; no model inference; no doc parsing; P99 < 50ms (non-SSE)'],
        ['<span class="hl-label">Go Auth</span>', 'OAuth2 authorization code mode; one-time code issuance (TTL ≤5min, single-use); code-to-session exchange; client app user system integration', 'Only handles identity credentials; no authorization decisions (done by BFF); no business data storage'],
        ['<span class="hl-label">Go Billing</span>', 'User quota management & metering; atomic deduction (Lua script); plan configuration; consumption records', 'No business logic; returns quota results only; idempotent deduction design'],
        ['<span class="hl-label">Mastra Agent</span>', 'Chat Agent orchestration; Tool registration & invocation; Workflow definition & execution; context Memory management; streaming SSE output', 'Not exposed publicly; holds no user identity; stores no raw documents'],
        ['<span class="hl-label">RAGFlow</span>', 'Document parsing (PDF/Word/scans); vector+BM25 dual recall; Rerank; source tracing; KB versioning', 'Search API only; no Agent or business auth responsibility; enabled on-demand'],
        ['<span class="hl-label">LLM API</span>', 'Chat text generation; Embedding vectorization', 'Stateless calls; no result caching (managed by Mastra)'],
      ],
    },
    { type: 'heading', level: 3, text: '5.2 Service Interaction Topology' },
    {
      type: 'paragraph',
      text: '<span class="doc-code-block">                          +----------+<br>                          |Client App|<br>                          | WebView  |<br>                          +----+-----+<br>                               | (1) POST /api/v1/auth/app-code<br>                     +---------v---------+<br>                     |     Go Auth       |<br>                     |  Issue one-time   |<br>                     |  code (TTL 5min)  |<br>                     +---------+---------+<br>                               | (2) Return code<br>                     +---------v---------+<br>                     |   Client App      |<br>                     |   Open WebView    |<br>                     |   ?code=...       |<br>                     +---------+---------+<br>                               | (3) POST /api/v1/auth/exchange<br>                     +---------v---------+<br>                     |      Go BFF       |<br>                     |  code -> Session  |<br>                     |  Set-Cookie       |<br>                     +---------+---------+<br>                               | (4) POST /api/v1/chat/completions<br>                               |     (Cookie -> BFF Auth)<br>                     +---------v---------+    Go Billing<br>                     |      Go BFF       |--- (quota check<br>                     | - Auth           |--- + pre-deduct)<br>                     | - Content Safety |<br>                     | - Route Decision |<br>                     +--+-----------+----+<br>                        |           |<br>                  (5)   |           | (6) Search<br>               Question |           | (on-demand)<br>               Forward  |           |<br>                +-------v--+   +----v--------+<br>                |  Mastra  |   |  RAGFlow    |<br>                |  Agent   |<--+  Results    |<br>                +----+-----+   +-------------+<br>                     | (7) LLM API Call<br>                     | (primary/fallback)<br>                +----v-----+<br>                |  LLM API |<br>                | (OpenAI  |<br>                |  Compat) |<br>                +----+-----+<br>                     | (8) Streaming Tokens<br>                +----v-----+<br>                |  Mastra  |<br>                | SSE Pack |<br>                +----+-----+<br>                     | (9) SSE Stream<br>                     | (delta/citation/done)<br>                +----v-----+<br>                |  Go BFF  |<br>                |Proxy+Audit|<br>                +----+-----+<br>                     | (10) SSE -> H5<br>                +----v-----+<br>                | React H5 |<br>                +----------+</span>',
    },
    { type: 'heading', level: 2, text: '6. Data Architecture' },
    { type: 'heading', level: 3, text: '6.1 Storage Distribution' },
    {
      type: 'table',
      headers: ['Data Domain', 'Storage Engine', 'Schema Strategy', 'Lifecycle'],
      rows: [
        ['Users & OAuth', 'Go Auth → PostgreSQL (client existing DB)', 'Reuse existing user table schema', 'Follows client user lifecycle'],
        ['Membership & Plans', 'Go Auth existing DB', 'Extended membership & plan tables', 'Per business cycle'],
        ['Quota Accounts', 'Go Billing → PostgreSQL', 'user_id | capability | total | used | frozen', 'Persistent'],
        ['Quota Cache', 'Redis', 'quota:{user_id}:{capability} → remaining', 'TTL synced with DB refresh'],
        ['Billing Records', 'Go Billing → PostgreSQL', 'Transaction table, monthly partitioned', 'Retain ≥1yr, archive as needed'],
        ['Audit Logs', 'Go BFF → PostgreSQL', 'Unified schema: timestamp | actor | action | resource | result | detail(JSONB)', 'Retain ≥180d, daily partitioned'],
        ['Chat Threads', 'Mastra → PostgreSQL', 'Mastra Storage native schema', 'User delete or 90d inactivity cleanup'],
        ['Agent Memory', 'Mastra → PostgreSQL', 'Key-Value + time decay', 'Cascade with thread deletion'],
        ['Workflow Snapshots', 'Mastra → PostgreSQL', 'JSONB serialized state', 'Keep 30d post workflow completion'],
        ['Doc Chunks & Vectors (Basic)', 'PostgreSQL + pgvector', 'doc_id | chunk_index | content | embedding(1536d) | metadata', 'Cascade on doc deletion'],
        ['Doc Chunks & Vectors (Enhanced)', 'RAGFlow native storage', 'RAGFlow built-in schema', 'Follows RAGFlow KB lifecycle'],
        ['Original Files', 'MinIO / Local FS', 'Object bucket: knowledge-base/{doc_id}/{version}/raw', 'Bound to doc version'],
      ],
    },
    { type: 'heading', level: 3, text: '6.2 Data Governance Principles' },
    {
      type: 'list', ordered: false,
      items: [
        '<span class="hl-label">Sensitive data stays in BFF:</span> PII such as phone numbers and ID numbers are only accessible at BFF layer; never passed to Mastra or LLM. All user identifiers in prompts use anonymized tokens.',
        '<span class="hl-label">Full audit coverage:</span> Every chat request input, search result, LLM output, citation, and blocking decision is written to audit logs; searchable by user, time, and session.',
        '<span class="hl-label">Data isolation:</span> C-End data and ops data are physically separated (different schemas); admin console accesses via separate DB user.',
        '<span class="hl-label">Vector-original co-lifecycle:</span> When a document is deleted, corresponding vector chunks and MinIO files are cascade-deleted, leaving no orphan data.',
      ],
    },
    { type: 'heading', level: 2, text: '7. Identity & Access Management (IAM)' },
    { type: 'heading', level: 3, text: '7.1 Dual-Domain Isolation Model' },
    {
      type: 'table',
      headers: ['Domain', 'User Source', 'Auth Method', 'Credential Type', 'Authorization Scope'],
      rows: [
        ['C-End Users', 'Client App user system', 'One-time code → Go Auth exchange', 'HttpOnly Secure Cookie (Session)', 'Chat, query, personal quota'],
        ['Ops Personnel', 'Proprietary admin accounts', 'Username + Password + OTP (optional)', 'JWT Bearer Token (≤2h expiry)', 'KB mgmt, quota config, audit view'],
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-label">Isolation Rules:</span> App Tokens cannot log into admin backend; ops accounts cannot impersonate C-End users by default (requires Impersonate approval workflow). JWT and Session Cookie are validated in separate BFF middleware chains and are not interchangeable.',
    },
    { type: 'heading', level: 3, text: '7.2 App Auto-Login Sequence (Detailed)' },
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

    Note over User, BFF: Phase 1: 使用方 APP requests one-time auth code from 平台方
    User->>App: 点击 AI 智能体入口
    App->>App: 收集当前登录用户身份
    Note right of App: 使用方本地已登录用户
    App->>GoAuth: POST /api/v1/auth/app-code
    Note right of App: Header: API Key / mTLS cert
    Note right of App: Body: { user_id, account_name }
    Note over App, GoAuth: Client (使用方) calls Service Provider (平台方) for auth code
    GoAuth->>GoAuth: 校验 API Key
    GoAuth->>Redis: 写入 code → user_id
    Note right of GoAuth: code: 32-byte random<br/>TTL: 5 min
    Redis-->>GoAuth: OK
    GoAuth-->>App: 200 OK { code, expires_in: 300 }

    Note over User, BFF: Phase 2: 使用方 opens WebView with code
    App->>WebView: 初始化 WebView
    App->>WebView: 加载 H5 地址
    Note right of App: https://h5-domain/chat?code=xxx&app_id=xxx

    Note over User, BFF: Phase 3: 使用方 server exchanges code for SessionToken (Core Auth)
    WebView->>H5: 加载 H5 页面
    H5->>H5: 从 URL 解析 code
    H5->>App: JSBridge: postMessage({ type: "exchangeCode", code })
    Note right of H5: H5 sends code back to 使用方 via JSBridge
    App->>AppSrv: 转发 code
    Note right of App: 使用方 APP proxies to backend
    AppSrv->>GoAuth: POST /api/v1/auth/exchange
    Note right of AppSrv: Body: { code }
    Note over AppSrv, GoAuth: Client (使用方) calls Service Provider (平台方) to exchange code
    GoAuth->>Redis: 查询 code → user_id
    Redis-->>GoAuth: code valid → user_id
    GoAuth->>Redis: DELETE code (anti-replay)
    GoAuth->>GoAuth: 生成 SessionToken (JWT)
    GoAuth->>Redis: 存储 Session
    Note right of GoAuth: Session TTL: 24h<br/>Sliding window: 30min
    GoAuth-->>AppSrv: 200 OK { session_token, user_id, permissions }
    AppSrv-->>App: 返回 session_token
    App->>H5: JSBridge callback({ session_token })
    Note left of App: 使用方 injects SessionToken into H5

    Note over User, BFF: Phase 4: H5 accesses 平台方 services with SessionToken
    H5->>H5: 存储 SessionToken (memory only)
    Note right of H5: Secure storage, no disk persist
    loop 每次业务请求
        H5->>BFF: GET/POST /api/v1/*
        Note right of H5: Authorization: Bearer {session_token}
        BFF->>BFF: 中间件解析 SessionToken
        BFF->>Redis: 校验 Session
        Redis-->>BFF: Session valid → user_id + permissions
        Note right of BFF: Inject user_id + role<br/>into Request Context
        BFF->>BFF: 转发业务逻辑
        BFF-->>H5: 返回响应
        H5-->>User: 渲染 AI 智能体界面
    end

    Note over User, BFF: Phase 5: Session lifecycle & error handling
    alt 正常活跃续期
        BFF->>Redis: 刷新 Session TTL (sliding 30min)
    else Token 过期（使用方静默续期）
        H5->>App: JSBridge: requestRefreshToken()
        App->>AppSrv: 请求续期
        AppSrv->>GoAuth: POST /api/v1/auth/refresh
        Note over AppSrv, GoAuth: Client (使用方) calls Service Provider (平台方) to refresh
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
    { type: 'heading', level: 3, text: '7.3 Browser Access Policy' },
    {
      type: 'table',
      headers: ['Policy', 'Behavior', 'Use Case'],
      rows: [
        ['<span class="hl-warn">A: App Only</span>', 'User-Agent whitelist + origin check; non-App returns 403', 'Fully closed deployment scenarios'],
        ['<span class="hl-good">B: Restricted Browser (Default)</span>', 'Browser accessible; guest users 5 queries/day; full features require App account binding & login', 'Phase 1 default'],
        ['<span class="hl-info">C: Fully Open</span>', 'Independent web registration & login; quota shared with App', 'Phase 2 evaluation'],
      ],
    },
    { type: 'heading', level: 2, text: '8. Chat & Search Pipeline' },
    { type: 'heading', level: 3, text: '8.1 Phase 1 Default Pipeline (Mastra RAG)' },
    {
      type: 'paragraph',
      text: '<code>User Query → Go BFF (auth/content-safety/quota pre-deduct) → Mastra Agent (search decision → pgvector ANN recall → context assembly → System Prompt injection) → LLM streaming → Mastra SSE assembly (delta + citation events) → Go BFF proxy + citation validation + audit → SSE push to H5 → Typewriter rendering + citation display</code>',
    },
    { type: 'heading', level: 3, text: '8.2 RAGFlow Enhanced Pipeline (On-Demand)' },
    {
      type: 'paragraph',
      text: '<code>User Query → Go BFF (same as above) → Mastra → determines deep search needed → Go BFF side-channel RAGFlow (vector+BM25 dual recall → Rerank → Top-K + source pages) → fragments injected into Mastra context → LLM generation → SSE</code>',
    },
    {
      type: 'paragraph',
      text: '<span class="hl-label">RAGFlow Enablement Conditions (any met):</span>',
    },
    {
      type: 'list', ordered: false,
      items: [
        'Complex PDF/scanned/tabular document parsing quality insufficient for business requirements',
        'Agreed evaluation set Top-3 recall rate < 85%',
        'Page-level/block-level strong citation needed, and Mastra side insufficient',
        'Document scale > 10,000 chunks, pgvector single-table search performance degradation',
      ],
    },
    { type: 'heading', level: 3, text: '8.3 Quality Baseline' },
    {
      type: 'table',
      headers: ['Dimension', 'Metric', 'Target', 'Measurement'],
      rows: [
        ['Search Quality', 'Top-3 Recall Rate', '≥ 85%', 'Agreed eval set + weekly automated evaluation'],
        ['Search Quality', 'MRR (Mean Reciprocal Rank)', '≥ 0.75', 'Eval set MRR'],
        ['Generation Quality', 'Citation Accuracy', '≥ 95%', 'Manual sampling + BFF auto-validation'],
        ['Generation Quality', 'No-Basis Refusal Rate', '≥ 90% correct refusal', 'System Prompt + BFF post-validation'],
        ['Response Latency', 'Time to First Token (TTFT)', 'P50 ≤ 1.5s, P99 ≤ 3s', 'BFF OpenTelemetry Span instrumentation'],
        ['Response Latency', 'Full Response Time', 'P50 ≤ 8s, P99 ≤ 20s', 'End-to-end Span stats'],
        ['Content Safety', 'Block Rate', '100% blocking of sensitive content', 'BFF compliance engine + audit review'],
      ],
    },
    { type: 'heading', level: 2, text: '9. Model Invocation & Cost Control', card: true },
    { type: 'heading', level: 3, text: '9.1 Active-Standby Dual-Path Architecture' },
    {
      type: 'paragraph',
      text: '<code>primary: {baseURL, apiKey, model} → timeout 30s / 3 consecutive failures → fallback: {baseURL, apiKey, model} → timeout 30s → return error + audit alert</code>',
    },
    {
      type: 'paragraph',
      text: 'Switching logic implemented at BFF or Mastra layer (code-level, no external gateway dependency). Switch events written to audit log with alert notification. Auto-switch back after primary recovery confirmed by 3 consecutive successes.',
    },
    { type: 'heading', level: 3, text: '9.2 Cost Control Strategies' },
    {
      type: 'list', ordered: false,
      items: [
        '<span class="hl-label">Prompt Caching:</span> System Prompt and retrieved knowledge fragments deduplicated via content hash to avoid redundant Token consumption',
        '<span class="hl-label">Context Window Control:</span> Sliding window retains last N turns (default 10); older turns summarized rather than kept in full',
        '<span class="hl-label">Temperature Setting:</span> Knowledge Q&A uses temperature=0.1~0.2 to reduce randomness and repeated generation',
        '<span class="hl-label">Embedding Batching:</span> Batch Embedding API calls during document ingestion to reduce API call count',
        '<span class="hl-label">Usage Attribution:</span> Each call records user_id + session_id + purpose for cost analysis by user/scenario/period',
      ],
    },
    { type: 'heading', level: 2, text: '10. External API Specification (Go BFF)' },
    {
      type: 'table',
      headers: ['Endpoint', 'Method', 'Auth', 'Description'],
      rows: [
        ['<span class="hl-accent">/api/v1/auth/app-code</span>', 'POST', 'Server Credential (API Key / mTLS)', 'App server requests one-time auth code'],
        ['<span class="hl-accent">/api/v1/auth/exchange</span>', 'POST', 'One-time code', 'Code to Session exchange (Set-Cookie)'],
        ['<span class="hl-accent">/api/v1/auth/logout</span>', 'POST', 'Session Cookie', 'Logout (clear Redis + Clear Cookie)'],
        ['<span class="hl-accent">/api/v1/chat/completions</span>', 'POST', 'Session Cookie', 'Chat (SSE stream: meta / delta / citation / done / error)'],
        ['<span class="hl-accent">/api/v1/chat/history</span>', 'GET', 'Session Cookie', 'List historical conversations (paginated)'],
        ['<span class="hl-accent">/api/v1/chat/threads/:id</span>', 'GET', 'Session Cookie', 'Get specific thread details'],
        ['<span class="hl-accent">/api/v1/me/quota</span>', 'GET', 'Session Cookie', 'Remaining quota & plan info'],
        ['<span class="hl-accent">/api/v1/me/feedback</span>', 'POST', 'Session Cookie', 'User feedback (thumbs up/down + text)'],
        ['<span class="hl-accent">/api/v1/knowledge/search</span>', 'GET', 'Session Cookie', 'Knowledge base keyword search / category browse'],
      ],
    },
    { type: 'heading', level: 3, text: 'SSE Event Protocol' },
    {
      type: 'table',
      headers: ['Event Type', 'Fields', 'Description'],
      rows: [
        ['<span class="hl-accent">meta</span>', '{"session_id":"...","thread_id":"..."}', 'Chat metadata; must be first event'],
        ['<span class="hl-accent">delta</span>', '{"content":"...","token_index":123}', 'Incremental text token'],
        ['<span class="hl-accent">citation</span>', '{"index":1,"doc_title":"...","chunk":"...","page":3}', 'Citation fragment; batched or individual push on completion'],
        ['<span class="hl-accent">done</span>', '{"total_tokens":456,"cost":0.023}', 'Completion signal + token usage'],
        ['<span class="hl-accent">error</span>', '{"code":"...","message":"...","retryable":true}', 'Error event with retryable flag'],
      ],
    },
    { type: 'heading', level: 3, text: 'Unified Error Codes' },
    {
      type: 'table',
      headers: ['Error Code', 'HTTP Status', 'Meaning', 'Client Action'],
      rows: [
        ['<span class="hl-warn">UNAUTHORIZED</span>', '401', 'Not logged in or Session expired', 'Redirect to login'],
        ['<span class="hl-warn">FORBIDDEN</span>', '403', 'No permission to access resource', 'Show permission denied'],
        ['<span class="hl-warn">QUOTA_EXCEEDED</span>', '429', 'Insufficient quota', 'Prompt top-up or wait for reset'],
        ['<span class="hl-warn">RATE_LIMITED</span>', '429', 'Request frequency exceeded', 'Prompt retry later + Retry-After'],
        ['<span class="hl-warn">CONTENT_BLOCKED</span>', '422', 'Content safety interception', 'Show compliance message'],
        ['<span class="hl-warn">INVALID_CODE</span>', '400', 'Auth code invalid or already used', 'App re-request code'],
        ['<span class="hl-warn">UPSTREAM_ERROR</span>', '502', 'Upstream model or engine error', 'Auto retry or prompt try later'],
        ['<span class="hl-warn">INTERNAL_ERROR</span>', '500', 'Internal server error', 'Auto retry or contact ops'],
      ],
    },
    { type: 'heading', level: 2, text: '11. Observability' },
    { type: 'heading', level: 3, text: '11.1 Three Pillars' },
    {
      type: 'table',
      headers: ['Pillar', 'Technology', 'Implementation Highlights'],
      rows: [
        ['<span class="hl-label">Logging</span>', 'Go: zerolog → stdout → Docker log driver', 'Unified JSON Schema; request ID across all services; levels (DEBUG/INFO/WARN/ERROR)'],
        ['<span class="hl-label">Metrics</span>', 'Prometheus + Grafana', 'RED metrics (Rate/Errors/Duration); LLM Token usage; SSE connection count; quota consumption trends'],
        ['<span class="hl-label">Tracing</span>', 'OpenTelemetry → Jaeger', 'One TraceID per request: BFF → Auth → Billing → Mastra → LLM → Response; spans with key attributes'],
      ],
    },
    { type: 'heading', level: 3, text: '11.2 Key Alert Rules' },
    {
      type: 'table',
      headers: ['Alert', 'Condition', 'Severity', 'Notification'],
      rows: [
        ['BFF Error Rate', '5xx error rate > 1% (5min window)', 'P1', 'Instant notification'],
        ['LLM Call Failure Rate', 'Both primary + fallback fail > 3 consecutive', 'P0', 'Instant + phone'],
        ['SSE Abnormal Disconnect', 'Abnormal disconnect rate > 5% (5min window)', 'P2', 'Instant notification'],
        ['Quota Deduction Success Rate', 'Success rate < 99.9% (5min window)', 'P1', 'Instant notification'],
        ['Chat P99 Latency', 'P99 > 5s (5min window)', 'P2', 'Instant notification'],
        ['Disk Usage', 'PostgreSQL / MinIO > 80%', 'P2', 'Instant notification'],
        ['Memory Usage', 'Any critical service > 85%', 'P3', 'Daily alert summary'],
      ],
    },
    { type: 'heading', level: 2, text: '12. Security Architecture' },
    { type: 'heading', level: 3, text: '12.1 Defense in Depth' },
    {
      type: 'list', ordered: false,
      items: [
        '<span class="hl-label">L1 — Network Perimeter:</span> Caddy TLS termination + IP whitelist (optional) + basic rate limiting; only port 443 exposed',
        '<span class="hl-label">L2 — Application Gateway:</span> Go BFF unified auth + content safety hooks + request parameter validation; all inputs strictly validated & sanitized',
        '<span class="hl-label">L3 — Inter-Service:</span> Internal services mutually authenticated via mTLS or pre-shared keys; network policies restrict east-west traffic',
        '<span class="hl-label">L4 — Data Layer:</span> PostgreSQL TLS connections; sensitive fields AES-256 encrypted; audit logs immutable (append-only tables)',
        '<span class="hl-label">L5 — Model Layer:</span> Prompt injection prevention (input sanitization + role boundary instructions); LLM output validation (format + citation legality + PII detection)',
      ],
    },
    { type: 'heading', level: 3, text: '12.2 Content Safety Engine' },
    {
      type: 'paragraph',
      text: 'Go BFF includes a built-in content safety engine with configurable sensitive word lexicon and blocking strategies:',
    },
    {
      type: 'table',
      headers: ['Detection Point', 'Strategy', 'Action'],
      rows: [
        ['User Input', 'Sensitive word matching (Aho-Corasick) + keyword weight scoring', '≥ threshold → reject request + CONTENT_BLOCKED'],
        ['LLM Output', 'Sensitive word detection + format validation + citation legality', 'Contains sensitive content → replace with preset fallback + audit alert'],
        ['File Upload', 'File type whitelist + virus scan (ClamAV) + size limit', 'Non-compliant → reject upload'],
      ],
    },
    { type: 'heading', level: 2, text: '13. Deployment Topology' },
    { type: 'heading', level: 3, text: '13.1 Phase 1 Single-Node Deployment (Docker Compose)' },
    {
      type: 'paragraph',
      text: '<span class="doc-code-block">+=================================================================+<br>|                   CLIENT SERVER (Linux x86_64)                  |<br>|                                                                 |<br>|  +-------------------------------------------------------------+|<br>|  | Caddy (TLS Termination + Reverse Proxy)                    | |<br>|  | Port: 443 -> Internal Routes                               | |<br>|  +-----------------------------+-------------------------------+|<br>|                                v                                |<br>|  +-------------------------------------------------------------+|<br>|  | Go BFF (Port: 8080)                                        | |<br>|  +--+-------------+-------------+-----------------------------+ |<br>|                 v  v             v             v                |<br>|  +--+--+ +--------+----+ +------+---------+                     |<br>|  | Auth | |  Billing    | |    Mastra      |                    |<br>|  | :8081| |  :8082      | |    :3000       |                    |<br>|  +--+---+ +-------+-----+ +---+------------+                    |<br>|                 v  v             v             v                |<br>|  +--v--------v----+  +----------v--------+                      |<br>|  | PostgreSQL 16  |  |      Redis 7      |                      |<br>|  | (:5432)        |  |      (:6379)      |                      |<br>|  | +pgvector ext  |  |  Quota Cache      |                      |<br>|  | Session/Audit  |  |  Rate-Limit       |                      |<br>|  +----------------+  +-------------------+                      |<br>|                                                                 |<br>|  +------------------+  +---------------------------+            |<br>|  |      MinIO       |  |  RAGFlow (On-Demand)      |            |<br>|  |      :9000       |  |  :8088                    |            |<br>|  |  Doc Storage     |  |  Doc Parse + Hybrid Srch  |            |<br>|  +------------------+  +---------------------------+            |<br>|                                                                 |<br>|  +-------------------------------------------------------------+|<br>|  | Prometheus + Grafana + Jaeger (Optional)                   | |<br>|  +-------------------------------------------------------------+|<br>+=================================================================+</span>',
    },
    { type: 'heading', level: 3, text: '13.2 Resource Reference (Phase 1)' },
    {
      type: 'table',
      headers: ['Service', 'CPU', 'Memory', 'Disk', 'Notes'],
      rows: [
        ['Go BFF + Auth + Billing', '2 Core', '1 GB', '—', 'Can be co-deployed'],
        ['Mastra Agent', '4 Core', '4 GB', '—', 'Includes Node.js runtime'],
        ['RAGFlow (on-demand)', '4 Core', '8 GB', '20 GB', 'Includes Elasticsearch + parsing services'],
        ['PostgreSQL 16', '2 Core', '2 GB', '50 GB+', 'Includes pgvector indexes'],
        ['Redis 7', '1 Core', '512 MB', '—', 'AOF persistence recommended'],
        ['MinIO', '1 Core', '512 MB', '100 GB+', 'Scale with document volume'],
        ['Caddy', '0.5 Core', '128 MB', '—', '—'],
        ['Monitoring Suite (optional)', '2 Core', '2 GB', '20 GB', 'Prometheus + Grafana + Jaeger'],
      ],
    },
    { type: 'heading', level: 2, text: '14. CI/CD' },
    {
      type: 'table',
      headers: ['Stage', 'Tool/Method', 'Description'],
      rows: [
        ['Version Control', 'Git (client-specified repo)', 'Trunk-based dev + feature branches; PR review required'],
        ['Code Quality', 'golangci-lint (Go) / ESLint (TS/React)', 'Pre-commit auto check; CI blocks on failure'],
        ['Build', 'Multi-stage Docker Build', 'Static Go binary → Distroless base image; Frontend → Nginx Alpine / static files'],
        ['Test', 'Go: testify + httptest; Frontend: Vitest', 'Unit tests mandatory in CI; integration tests as needed'],
        ['Artifact', 'Docker Registry (internal or Harbor)', 'Image tag: {git_sha}-{timestamp}'],
        ['Deploy', 'Docker Compose / Ansible', 'Phase 1: docker compose up -d + health check'],
        ['Rollback', 'Docker tag re-point + restart', 'Keep last 3 version images; rollback time ≤ 5 min'],
      ],
    },
    { type: 'heading', level: 2, text: '15. Technical Risk Assessment' },
    {
      type: 'table',
      headers: ['Risk', 'Probability', 'Impact', 'Mitigation'],
      rows: [
        ['LLM API provider instability', 'Medium', 'High', 'Dual-path code-level failover + local cache for hot Q&A + degraded fallback responses'],
        ['RAGFlow integration complexity exceeds expectations', 'Medium', 'Medium', 'Phase 1 defaults to Mastra RAG; RAGFlow on-demand, non-blocking for delivery'],
        ['Client App WebView compatibility issues', 'Medium', 'Medium', 'Dedicated WkWebView (iOS) / Chromium WebView (Android) testing; white-screen fallback + degraded H5'],
        ['PostgreSQL performance bottleneck', 'Low', 'Medium', 'pgvector IVFFlat/HNSW index optimization; connection pooling (PgBouncer); read replicas for analytical queries'],
        ['Concurrency exceeds expectations', 'Low', 'Low', 'Redis rate limiting + Go BFF stateless horizontal scaling + PostgreSQL connection pooling'],
        ['Compliance audit requirements change', 'Low', 'High', 'Audit log schema reserves extension fields (JSONB); BFF middleware chain supports hot-plugging'],
      ],
    },
    { type: 'heading', level: 2, text: '16. Delivery Scope' },
    { type: 'heading', level: 3, text: '16.1 Phase 1 Deliverables' },
    {
      type: 'table',
      headers: ['Deliverable', 'Description'],
      rows: [
        ['<span class="hl-label">H5 Chat Application</span>', 'Embeddable in client App WebView; supports streaming chat, citation display, multi-turn history, feedback'],
        ['<span class="hl-label">Ops Admin Backend</span>', 'KB operations, compliance lexicon management, Q&A dashboard, permission & system config'],
        ['<span class="hl-label">Go BFF + Auth/Billing</span>', 'Includes existing OAuth integration; Docker images + source code'],
        ['<span class="hl-label">Mastra Agent Service</span>', 'Internal deployment config; Agent/Workflow/Tool definitions; Memory & basic RAG setup'],
        ['<span class="hl-label">RAGFlow (On-Demand)</span>', 'Config & distribution; Mastra integration adaptation'],
        ['<span class="hl-label">Technical Documentation</span>', 'Deployment manual (env vars, network topology), ops manual (daily checks, incident response), API docs (OpenAPI 3.0)'],
        ['<span class="hl-label">Integration & Acceptance</span>', 'WebView dual-platform integration passed; agreed eval set recall ≥85%; go-live acceptance sign-off'],
      ],
    },
    { type: 'heading', level: 3, text: '16.2 Phase 1 Feature List' },
    {
      type: 'list', ordered: false,
      items: [
        'Document import & ingestion (PDF/Word, format per selected engine support)',
        'Three KB indexes (Investment, Product, Compliance; logically isolated)',
        'Streaming KB Q&A + original source citation',
        'No-basis refusal (System Prompt + BFF post-validation dual guard)',
        'App one-time code auto-login',
        'User-level Q&A quota control',
        'Compliance sensitive word real-time blocking & tiered processing (warn/block)',
        'Full audit logging',
        'Content safety hooks (bidirectional input + output detection)',
        'Proprietary ops admin backend minimum viable set',
      ],
    },
    { type: 'heading', level: 3, text: '16.3 Phase 1 Excludes (Clear Boundaries)' },
    {
      type: 'list', ordered: false,
      items: [
        'Image/video generation / voice interaction',
        'Complex product recommendations & deep ERP/CRM integration',
        'Security certification / Xinchuang adaptation packaging',
        'Open-source engine native consoles as product UI delivered directly',
        'Native iOS/Android chat SDK',
        'NewAPI-type relay platform delivery',
        'Multi-tenant SaaS adaptation',
        'Self-training / fine-tuned models',
      ],
    },
  ],
};