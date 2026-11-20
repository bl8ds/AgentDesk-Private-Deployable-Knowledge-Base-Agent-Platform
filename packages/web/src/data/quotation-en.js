/**
 * Quotation - Phase 1 MVP (English)
 * English translation aligned with Chinese quotation.js
 * Total: CNY 128,000 | 48.000 person-days | 30 working days
 */
export var quotationDocEn = {
  title: 'MVP Quotation',
  cards: [
    { label: 'Total Price', value: '<span class="hl-good">CNY 128,000</span>' },
    { label: 'Total Hours', value: '<span class="hl-warn">48.000 person-days</span>' },
    { label: 'Team Size', value: '3 Engineers' },
    { label: 'Timeline', value: '30 working days' },
    { label: 'Daily Rate', value: '<span class="hl-accent">CNY 2,000</span>' },
    { label: 'Modules', value: '4 modules' },
  ],
  sections: [
    {
      type: 'heading',
      level: 3,
      text: 'Core Delivery Principles',
    },
    {
      type: 'paragraph',
      text: 'Four modules are independently closed-loop. Each owner is fully responsible for their module\'s frontend, backend, logic, integration, and bug fixes. <span class="hl-warn">Single person, single module, end-to-end complete delivery.</span> Modules are loosely coupled and can be developed in parallel.',
    },
    {
      type: 'heading',
      level: 3,
      text: 'Phase 1 Core Delivery Scope',
    },
    {
      type: 'paragraph',
      text: 'Lightweight RAG Q&A engine + Ops admin backend + APP-embedded user H5 + Client private deployment & system integration. Focus on core Q&A, compliance, and private deployment security capabilities.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'I. Project Team & Overall Hours Summary',
    },
    {
      type: 'table',
      headers: ['Module', 'Role', 'Est. Hours (person-days)', 'Total Cost (CNY)', 'Core Positioning'],
      rows: [
        ['Lightweight RAG Q&A Engine', 'AI Engineer', '14.5 person-days', '<span class="hl-accent">29,000</span>', 'Knowledge base foundation, search & attribution, compliance interception, dialogue orchestration'],
        ['Ops Admin Backend', 'AI Engineer', '11 person-days', '<span class="hl-accent">22,000</span>', 'KB ops, Q&A dashboard, permission control, parameter config'],
        ['APP-Embedded User H5', 'AI Engineer', '10.5 person-days', '<span class="hl-accent">21,000</span>', 'Streaming dialogue UI, auto-login, WebView full adaptation'],
        ['Private Deploy & System Integration', 'AI Engineer (3-person shared)', '6.871 person-days (team)', '<span class="hl-accent">13,742</span>', 'Service deployment & integration, client coordination, documentation & training, go-live acceptance'],
        ['Total', '', '<span class="hl-warn">48.000 person-days</span>', '<span class="hl-good">85,742</span>', '—'],
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: 'Team Member Hours Breakdown',
    },
    {
      type: 'paragraph',
      text: 'AI Engineer A 16.8 person-days (14.5 + 2.3 deployment) | AI Engineer B 13.3 person-days (11 + 2.3 deployment) | AI Engineer C 12.771 person-days (10.5 + 2.271 deployment), total <span class="hl-warn">48.000 person-days</span>.',
    },
    {
      type: 'heading',
      level: 2,
      text: 'II. Detailed Quotation (Module 1: RAG Q&A Engine) — 14.5 person-days / 29,000 CNY',
    },
    {
      type: 'paragraph',
      text: 'Owner: AI Engineer | Rate: <span class="hl-accent">2,000 CNY/person-day</span> | Hours: 14.5 person-days | Subtotal: 29,000 CNY',
    },
    {
      type: 'table',
      headers: ['Sub-Feature', 'Work Content', 'Hours (days)', 'Subtotal (CNY)'],
      rows: [
        ['Document Parsing & Ingestion', 'Recruitment/product/compliance/FAQ four-category doc PDF/Word parsing & adaptation, structured import into vector database', '2.0', '4,000'],
        ['Three-Database Index Setup', 'Recruitment, product, compliance three Collection initialization, logically isolated independent indexes', '1.5', '3,000'],
        ['Search & Attribution Engine', 'Vector search + BM25 dual-path recall + Rerank re-ranking, source citation, confidence assessment & fallback strategy', '3.0', '6,000'],
        ['KB Updates', 'Auto-segment chunking on doc add/delete/modify, version management & expiration removal', '1.0', '2,000'],
        ['Compliance Intercept Engine', 'Real-time sensitive word detection, violation level grading (warn/block), intercept with alternative suggestions', '1.5', '3,000'],
        ['Multi-Turn Dialogue Service', 'Recruitment/product/after-sales three-scenario dialogue orchestration, context memory management, turn limit control', '2.5', '5,000'],
        ['API Integration & Testing', 'Go BFF API integration, search accuracy validation, SSE streaming debugging, edge case fixes', '3.0', '6,000'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'III. Detailed Quotation (Module 2: Ops Admin Backend) — 11 person-days / 22,000 CNY',
    },
    {
      type: 'paragraph',
      text: 'Owner: AI Engineer | Rate: 2,000 CNY/person-day | Hours: 11 person-days | Subtotal: 22,000 CNY',
    },
    {
      type: 'table',
      headers: ['Sub-Feature', 'Work Content', 'Hours (days)', 'Subtotal (CNY)'],
      rows: [
        ['Backend Framework Setup', 'React+Vite admin architecture + routing + base component library + API integration layer', '1.5', '3,000'],
        ['Document & Index Management', 'Multi-format document upload, category management, version control, index rebuild/rollback', '2.0', '4,000'],
        ['Compliance Word Library Mgmt', 'Sensitive word CRUD, violation level config, interception policy real-time activation', '1.0', '2,000'],
        ['Q&A Monitoring Dashboard', 'Statistical charts (total/high-frequency/low-confidence/unhelpful rate), date filtering, data export', '2.0', '4,000'],
        ['Permission & System Config', 'Admin RBAC (button-level permissions), search params/fallback responses visual configuration', '2.0', '4,000'],
        ['Integration & Testing', 'Full-process backend testing, permission boundary validation, API integration, bug fixes', '2.5', '5,000'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'IV. Detailed Quotation (Module 3: APP-Embedded H5) — 10.5 person-days / 21,000 CNY',
    },
    {
      type: 'paragraph',
      text: 'Owner: AI Engineer | Rate: 2,000 CNY/person-day | Hours: 10.5 person-days | Subtotal: 21,000 CNY',
    },
    {
      type: 'table',
      headers: ['Sub-Feature', 'Work Content', 'Hours (days)', 'Subtotal (CNY)'],
      rows: [
        ['H5 Framework Setup', 'React+Vite SPA scaffold, SSE request layer encapsulation, assistant-ui integration', '1.0', '2,000'],
        ['Streaming Dialogue UI', 'SSE message rendering (typewriter effect), citation snippet display, multi-turn dialogue & history management', '2.5', '5,000'],
        ['Auto-Login & Permissions', 'Token integration, code-to-Session exchange, agent tier-based display, seamless login', '1.5', '3,000'],
        ['WebView Adaptation', 'iOS/Android dual-platform container adaptation, white screen fallback, page lifecycle management', '1.5', '3,000'],
        ['Knowledge Query & Learning', 'Keyword search/category browse documents, standard script display, rating & feedback component', '1.5', '3,000'],
        ['Adaptation & Testing', 'Responsive layout (320px-1200px), dark mode, dual-platform compatibility testing, bug fixes', '2.5', '5,000'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'V. Detailed Quotation (Module 4: Deployment & Integration) — 6.871 person-days / 13,742 CNY',
    },
    {
      type: 'paragraph',
      text: 'AI Engineers (3-person shared) | Rate: 2,000 CNY/person-day | Hours: 6.871 person-days | Subtotal: 13,742 CNY',
    },
    {
      type: 'table',
      headers: ['Sub-Feature', 'Work Content', 'Hours (days)', 'Subtotal (CNY)'],
      rows: [
        ['Server & Database', 'Linux environment config, vector database/PostgreSQL/Redis setup & initialization', '1.0', '2,000'],
        ['Core Service Deployment', 'Go BFF+Mastra+RAGFlow build & deploy, process daemon, health checks', '2.0', '4,000'],
        ['Frontend-Backend Deployment', 'Admin backend build & deploy, H5 release, Nginx reverse proxy, API gateway integration', '1.5', '3,000'],
        ['WebView Integration & CDN', 'H5 embed in client APP integration validation, CDN acceleration config & asset publishing', '1.0', '2,000'],
        ['Documentation & Training & Acceptance', 'Deployment docs/ops manual writing, operations training (ops + tech), go-live acceptance', '1.371', '2,742'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'VI. Quotation Summary',
    },
    {
      type: 'table',
      headers: ['Module', 'Person-Days', 'Amount (CNY)'],
      rows: [
        ['Module 1: Lightweight RAG Q&A Engine', '14.5', '29,000'],
        ['Module 2: Ops Admin Backend', '11', '22,000'],
        ['Module 3: APP-Embedded User H5', '10.5', '21,000'],
        ['Module 4: Private Deployment & System Integration', '6.871', '13,742'],
        ['Total Project Price', '<span class="hl-warn">48.000</span>', '<span class="hl-good">85,742</span>'],
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-accent">Total (in words): RMB Eighty-Five Thousand Seven Hundred Forty-Two Only</span>',
    },
    {
      type: 'paragraph',
      text: '<span class="hl-accent">Total (in figures): CNY 128,000.00</span>',
    },
    {
      type: 'heading',
      level: 2,
      text: 'VII. Iteration Schedule & Milestones',
    },
    {
      type: 'paragraph',
      text: 'Total project duration: <span class="hl-accent">30 working days</span>. Single-person per module parallel development model. Each module is internally closed-loop with low inter-module coupling. Key milestones:',
    },
    {
      type: 'table',
      headers: ['Milestone', 'Timeline', 'Deliverables', 'Acceptance Criteria'],
      rows: [
        ['Project Kickoff', 'Day 1-2', 'Environment setup, tech stack confirmation, project initialization', 'Dev environment ready, third-party services activated'],
        ['Module 1 Complete (RAG Engine)', 'Day 3-12', 'Document parsing, three-database index, search engine, compliance intercept, dialogue service', 'Vector search accuracy met, compliance intercept active'],
        ['Module 2 Complete (Admin Backend)', 'Day 3-10', 'Backend framework, document management, Q&A dashboard, permission config', 'CRUD functions complete, dashboard data correct'],
        ['Module 3 Complete (User H5)', 'Day 3-10', 'H5 framework, dialogue UI, auto-login, WebView adaptation', 'Dual-platform rendering normal, SSE streaming stable'],
        ['Module 4 Phase 1 (Server Deploy)', 'Day 11-18', 'Server environment, database initialization, core service deployment', 'Health checks passing, process daemon active'],
        ['Module 4 Phase 2 (Integration)', 'Day 18-24', 'Frontend-backend integration, Nginx reverse proxy, WebView integration', 'Full chain connected, H5 embedded in client APP working'],
        ['Full-Chain Integration Test', 'Day 24-27', 'End-to-end regression testing, edge case coverage, performance stress testing', '100% test case pass rate, P0/P1 bugs cleared'],
        ['Documentation, Training & Acceptance', 'Day 27-30', 'Deployment docs delivery, ops/tech training, go-live acceptance', 'Docs signed off, training completed, acceptance approved'],
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'VIII. Payment Terms',
    },
    {
      type: 'list',
      ordered: true,
      items: [
        'Within 5 business days of contract signing: <span class="hl-accent">40%</span> of total, i.e. CNY 34,297',
        'Within 5 business days of MVP go-live: <span class="hl-accent">30%</span> of total, i.e. CNY 25,723',
        'Within 5 business days of project acceptance: <span class="hl-accent">30%</span> of total, i.e. CNY 25,722',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: 'IX. Commercial Terms',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        'Quotation includes software development, deployment, training, 1-year free warranty O&M; excludes third-party hardware, cloud servers, and LLM API call costs',
        'During warranty: bug-type and non-new-requirement issues fixed for free; custom development of new features separately quoted (CNY 1,500/person-day)',
        'Warranty Period: 1 year from system go-live acceptance date',
        'Quotation Validity: <span class="hl-warn">30 days</span>',
      ],
    },
    {
      type: 'paragraph',
      text: 'This quotation is confidential. Unauthorized reproduction or distribution is prohibited. Yunfan Intelligent (Hangzhou) Technology Co., Ltd.',
    },
  ],
};