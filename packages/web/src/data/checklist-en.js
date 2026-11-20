/**
 * Integration Checklist - English
 * 
 * Legend:
 *   [Confirmed]: Requirements are clear, both parties' responsibilities are well-defined
 *   [Needs Clarification]: Requires Client to make decisions, fill in values, or provide materials before proceeding
 *   [Partial Clarification]: Section is mostly confirmed but has individual items requiring Client input
 */
export var checklistDocEn = {
  title: 'Integration Checklist',
  sections: [
    // ==================== Overview ====================
    { type: 'heading', level: 2, text: '0. Checklist Overview (Status Index)' },
    {
      type: 'paragraph',
      text: 'This document categorizes all integration items by confirmation status: <span class="hl-good">Confirmed</span> means requirements are finalized and both parties\' responsibilities are clear — ready to proceed. <span class="hl-warn">Needs Clarification</span> means Client must make decisions, fill in values, or provide materials before work can advance.',
    },
    {
      type: 'table',
      headers: ['Status', 'Meaning', 'Typical Scenarios', 'Relevant Sections'],
      rows: [
        ['<span class="hl-good">Confirmed</span>', 'Both parties aligned; no additional Client input needed', 'Responsibility boundaries, vendor scope, confirmed resource requirements, app-side integration tasks', '§1 / §5 / §6 / §7 / §8 (partial)'],
        ['<span class="hl-warn">Needs Clarification</span>', 'Client must decide, fill in, or provide materials', 'Vendor selection, entitlement mapping rules, decision items, material delivery details', '§2 (partial) / §3 (partial) / §4 / §8 (partial)'],
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-warn">Key Reminder:</span> Section 4 "Decision Items Client Must Confirm" (C1–C10) contains the most concentrated set of pending confirmations. Client should prioritize these to avoid blocking the development schedule.',
    },

    // ==================== 1. Responsibility Boundary [Confirmed] ====================
    { type: 'heading', level: 2, text: '1. Responsibility Boundary Overview <span class="hl-good">[Confirmed]</span>' },
    {
      type: 'paragraph',
      text: 'The following responsibility boundaries have been agreed upon in prior discussions. Both parties have clear, unambiguous responsibilities.',
    },
    {
      type: 'table',
      headers: ['Domain', 'Client (Client)', 'Vendor (Service Provider)'],
      rows: [
        ['Infrastructure', 'Servers, domain, certificates, network policies', 'Deployment, Docker orchestration'],
        ['LLM', 'Purchase account, cover costs, provide Key', 'Integration, primary/backup routing, tuning'],
        ['Content Safety', 'Purchase account, provide Key, sensitive word rules', 'Integration, bidirectional audit hooks'],
        ['User Identity', 'App login, issue one-time code/user tier', 'Code exchange, Session, authentication'],
        ['User Tier Gating', 'Define tier-to-AI entitlement mapping, provide determination source', 'Configurable implementation, interception & guidance'],
        ['Quota Billing', 'Confirm plan & quota rules', 'Quota deduction, interception, details'],
        ['Knowledge Content', 'Provide corpus, responsible for content quality & updates', 'Ingestion pipeline, search tuning'],
        ['Frontend Integration', 'WebView container, JSBridge, acceptance test set', 'H5, ops backend, integration testing'],
        ['Compliance', 'Legal copy (privacy/disclaimer/agreement)', 'Page mounting, audit logs'],
      ],
    },

    // ==================== 2. Materials [Partial Clarification] ====================
    { type: 'heading', level: 2, text: '2. Materials Client Must Provide (Support Items) <span class="hl-warn">[Partial Clarification]</span>' },
    {
      type: 'paragraph',
      text: 'The materials list is complete. Items <span class="hl-warn">P4–P13 require Client to confirm specific vendors/formats/content</span> before work can proceed.',
    },
    {
      type: 'table',
      headers: ['#', 'Material', 'Purpose', 'Delivery Format', 'Suggested Timeline', 'Status'],
      rows: [
        ['<span class="hl-warn">P1</span>', 'Server (recommended >=4C8G, SSD >=80G)', 'Private deployment', 'Access credentials/resources', '<span class="hl-accent">T0</span>', '<span class="hl-good">Confirmed</span>'],
        ['<span class="hl-warn">P2</span>', 'Domain + HTTPS Certificate', 'External access', 'Config info', '<span class="hl-accent">T0</span>', '<span class="hl-good">Confirmed</span>'],
        ['<span class="hl-warn">P3</span>', 'Intranet/egress network policies', 'Deployment & model calls', 'Network documentation', '<span class="hl-accent">T0</span>', '<span class="hl-good">Confirmed</span>'],
        ['<span class="hl-label">P4</span>', 'LLM API Key (Chat)', 'Generation', 'Key + endpoint', 'T0+1', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-label">P5</span>', 'Embedding API Key', 'Vectorization', 'Key + endpoint', 'T0+1', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-info">P6</span>', 'Content Safety API Key + Sensitive Word Library', 'Input/output audit', 'Key + rules', 'T0+2', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-info">P7</span>', 'Initial Knowledge Corpus', 'Ingestion', 'File package/object storage', 'T0+3', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-info">P8</span>', 'App User Field Mapping', 'Auth & tier gating', 'Field table', 'T0+3', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-info">P9</span>', 'User Tier -> AI Entitlement Mapping Rules', 'Gating & plans', 'Rule table', 'T0+3', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-label">P10</span>', 'App Server-Side Integration with Our Issuance API', 'App auto-login', 'API docs/test account', 'T0+5', '<span class="hl-warn">Needs Clarification</span>'],
        ['P11', 'Acceptance test set 30-50 items (with expected sources)', 'Recall acceptance', 'Spreadsheet', 'T0+7', '<span class="hl-warn">Needs Clarification</span>'],
        ['P12', 'Testable App WebView build', 'Integration testing', 'Test build', 'T0+10', '<span class="hl-warn">Needs Clarification</span>'],
        ['P13', 'Legal copy (privacy/disclaimer/user agreement)', 'Compliance mounting', 'Document', '<span class="hl-warn">Before go-live</span>', '<span class="hl-warn">Needs Clarification</span>'],
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-info">Summary:</span> P1–P3 are infrastructure items with clear requirements — ready to prepare. P4–P13 are <span class="hl-warn">pending Client confirmation/provision</span> — 10 items in total that need to be driven forward.',
    },

    // ==================== 3. User Tier Gating [Needs Clarification] ====================
    { type: 'heading', level: 2, text: '3. User Tier Gating (Support Details) <span class="hl-warn">[Needs Clarification]</span>' },
    {
      type: 'paragraph',
      text: 'Scenario: Based on client user system, only <span class="hl-accent">specific tier users</span> have AI functionality enabled. All items in this section require Client confirmation.',
    },
    { type: 'heading', level: 3, text: '3.1 Determination Source Client Must Confirm (Choose One) <span class="hl-warn">[Needs Clarification]</span>' },
    {
      type: 'table',
      headers: ['Method', 'Client Work', 'Characteristics', 'Status'],
      rows: [
        ['<span class="hl-good">A. Token-Embedded Tier (Recommended)</span>', 'Include level/vip_level/role in code/JWT', 'No extra API; timeliness = login cycle', '<span class="hl-warn">Needs Clarification</span>'],
        ['B. Entitlement Query API', 'Provide GET user entitlement(uid)', 'Good real-time; requires API integration', '<span class="hl-warn">Needs Clarification</span>'],
        ['C. Entitlement Batch/Incremental Sync', 'Push tier data to this system', 'Fast local determination; sync latency exists', '<span class="hl-warn">Needs Clarification</span>'],
      ],
    },
    { type: 'heading', level: 3, text: '3.2 Mapping Rules Client Must Confirm (Pending Client Input) <span class="hl-warn">[Needs Clarification]</span>' },
    {
      type: 'paragraph',
      text: 'The following is a template example. Actual values <span class="hl-warn">must be confirmed and filled in by Client</span>.',
    },
    {
      type: 'table',
      headers: ['User Tier', 'AI Available?', 'Daily Quota', 'Available Capabilities', 'Status'],
      rows: [
        ['Regular User', '<span class="hl-warn">No / Yes</span>', '—', 'Q&A', '<span class="hl-warn">Needs Clarification</span>'],
        ['Member', '<span class="hl-good">Yes</span>', '—', 'Q&A (+ product cards Phase 2)', '<span class="hl-warn">Needs Clarification</span>'],
        ['Premium Member', '<span class="hl-good">Yes</span>', '—', 'Q&A + advanced (Phase 2)', '<span class="hl-warn">Needs Clarification</span>'],
      ],
    },
    { type: 'heading', level: 3, text: '3.3 Interaction Agreements <span class="hl-warn">[Partial Clarification]</span>' },
    {
      type: 'list', ordered: false,
      items: [
        '<span class="hl-good">[Confirmed]</span> Non-qualified users: return <span class="hl-warn">AI_NOT_ENTITLED</span>, frontend shows upgrade guidance (copy provided by client)',
        '<span class="hl-warn">[Needs Clarification]</span> Tier change effective timing: depends on chosen source (A/B/C); client must confirm acceptable range',
        '<span class="hl-good">[Confirmed]</span> Privilege escalation guard: frontend hides entry + <span class="hl-warn">BFF secondary validation</span>',
      ],
    },

    // ==================== 4. Decision Items [Needs Clarification] ====================
    { type: 'heading', level: 2, text: '4. Decision Items Client Must Confirm <span class="hl-warn">[Needs Clarification]</span>' },
    {
      type: 'paragraph',
      text: 'C1–C10 are the <span class="hl-warn">most critical pending confirmations</span> in this checklist. Each is essential for advancing the project. Client should prioritize confirming them one by one. Default recommendations are noted for reference.',
    },
    {
      type: 'table',
      headers: ['#', 'Confirmation Item', 'Options (Defaults Annotated)', 'Client Input', 'Status'],
      rows: [
        ['<span class="hl-label">C1</span>', 'Browser Access Policy', 'A Prohibited / <span class="hl-info">B Restricted (default)</span> / C Fully Open', '—', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-label">C2</span>', 'Terminal Auth Method', '<span class="hl-good">One-time code (recommended)</span> / Short-lived JWT / Both', '—', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-label">C3</span>', 'User Tier Gating Source', '<span class="hl-good">A Token-embedded</span> / B Entitlement API / C Entitlement sync', '—', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-label">C4</span>', 'Tier->AI Entitlement Mapping', 'See §3.2 for details', '—', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-label">C5</span>', 'Allow Model Calls to External Cloud via Intranet?', 'Yes / <span class="hl-warn">No (No -> private model separately)</span>', '—', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-info">C6</span>', 'Must Admin Backend Integrate Client SSO?', '<span class="hl-info">No (default)</span> / Yes (change item)', '—', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-info">C7</span>', 'Content Safety Vendor', 'Baidu / Alibaba / Tencent / Other', '—', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-info">C8</span>', 'Enable RAGFlow in Phase 1?', '<span class="hl-info">No (default, Mastra basic RAG)</span> / Yes', '—', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-info">C9</span>', 'Include OCR Scanned Docs in Phase 1?', '<span class="hl-info">No (default)</span> / Yes (change item)', '—', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-info">C10</span>', 'Warranty Period', '— months', '—', '<span class="hl-warn">Needs Clarification</span>'],
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-info">Summary:</span> C1–C10 — 10 decision items total, all with <span class="hl-warn">[Needs Clarification]</span> status. Client should complete confirmation by T0+3. C1–C5 are high priority (impacts technical solution selection); C6–C10 are medium priority (can be confirmed after development begins).',
    },

    // ==================== 5. App Integration Tasks [Confirmed] ====================
    { type: 'heading', level: 2, text: '5. Client App-Side Integration Tasks <span class="hl-good">[Confirmed]</span>' },
    {
      type: 'paragraph',
      text: 'The following integration tasks are clearly defined. Client can proceed directly against this list. Phase 2 tasks are pre-embedded and do not block Phase 1 delivery.',
    },
    {
      type: 'table',
      headers: ['#', 'Task', 'Deliverable', 'Deadline', 'Status'],
      rows: [
        ['A1', 'WebView can open agreed domain (iOS/Android)', 'Test build or documentation', '<span class="hl-label">5 days before integration</span>', '<span class="hl-good">Confirmed</span>'],
        ['A2', 'Server-side one-time code request (keys not sent to frontend)', 'API docs + test account', '<span class="hl-label">5 days before integration</span>', '<span class="hl-good">Confirmed</span>'],
        ['A3', 'Pass user sub and tier fields', 'Field table', 'T0+3', '<span class="hl-good">Confirmed</span>'],
        ['A4', 'JSBridge close (Phase 1)', 'Method name docs', '<span class="hl-warn">3 days before integration</span>', '<span class="hl-good">Confirmed</span>'],
        ['A5', '(Phase 2) JSBridge openGoods/share/saveImage', 'Method name docs', 'Phase 2', '<span class="hl-good">Confirmed</span>'],
        ['A6', 'UAT network & certificate policies', 'Network documentation', '<span class="hl-warn">Before deployment</span>', '<span class="hl-good">Confirmed</span>'],
      ],
    },

    // ==================== 6. Vendor Scope [Confirmed] ====================
    { type: 'heading', level: 2, text: '6. Explicitly NOT Client Responsibility (Vendor Handles) <span class="hl-good">[Confirmed]</span>' },
    {
      type: 'paragraph',
      text: 'All items below are handled independently by the vendor. Client does not need to allocate resources.',
    },
    {
      type: 'list', ordered: false,
      items: [
        '<span class="hl-good">[Confirmed]</span> H5 dialogue app, ops backend, Go BFF development',
        '<span class="hl-good">[Confirmed]</span> Mastra Agent service, (on-demand) RAGFlow deployment & config',
        '<span class="hl-good">[Confirmed]</span> One-time code exchange, Session, quota deduction, audit logs',
        '<span class="hl-good">[Confirmed]</span> Configurable implementation of user tier gating & intercept logic',
        '<span class="hl-good">[Confirmed]</span> Model primary/backup routing & tuning',
      ],
    },

    // ==================== 7. Blocking & Timeline [Confirmed] ====================
    { type: 'heading', level: 2, text: '7. Blocking & Timeline Notes <span class="hl-good">[Confirmed]</span>' },
    {
      type: 'paragraph',
      text: '<span class="hl-good">[Confirmed]</span> Timeline starts from <span class="hl-warn">P1-P10 readiness</span>; <span class="hl-warn">Client material/confirmation delays do not count as vendor delays</span>.',
    },

    // ==================== 8. Phase 1 Resource Checklist [Partial Clarification] ====================
    { type: 'heading', level: 2, text: '8. Phase 1 Resource Checklist & Responsibility Boundary <span class="hl-warn">[Partial Clarification]</span>' },
    {
      type: 'paragraph',
      text: 'This chapter defines the hardware, cloud, permission, and API resources required for Phase 1 delivery. Strictly delineates Client (Xinglan E-commerce) and Service Provider boundaries. Resource ownership is mostly clear; some details <span class="hl-warn">require Client confirmation</span>.',
    },

    { type: 'heading', level: 3, text: '8.1 Server Resources (Core Deployment Resources) <span class="hl-good">[Confirmed]</span>' },
    {
      type: 'paragraph',
      text: 'Resource ownership: <span class="hl-label">Provided by Client (Xinglan E-commerce)</span>',
    },
    {
      type: 'list', ordered: false,
      items: [
        '<span class="hl-good">[Confirmed]</span> <span class="hl-label">Application Server</span>: Provide available Linux server/VM for deploying AI agent backend services, RAG orchestration service, and admin backend. Open corresponding ports, external access permissions, and firewall whitelist permissions.',
        '<span class="hl-good">[Confirmed]</span> <span class="hl-label">Compute Resources</span>: Client provides local server compute to support vector search, Q&A inference, and knowledge base parsing — no need for Service Provider to purchase additional public cloud compute. Achieves <span class="hl-good">100% data localization with no external transmission</span>.',
        '<span class="hl-good">[Confirmed]</span> <span class="hl-label">Runtime Environment</span>: Client assists with server base environment configuration (OS version, runtime dependencies, network policies) to ensure stable project deployment and operation.',
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-good">[Confirmed]</span> <span class="hl-info">Service Provider Responsibility</span>: Project code deployment, environment debugging, service start/stop configuration, runtime optimization, troubleshooting, and program version iteration updates.',
    },

    { type: 'heading', level: 3, text: '8.2 Database Resources (RDS / Vector DB) <span class="hl-warn">[Partial Clarification]</span>' },
    {
      type: 'paragraph',
      text: 'Resource ownership: <span class="hl-label">Tiered Definition</span>',
    },
    {
      type: 'table',
      headers: ['Database Type', 'Ownership', 'Description', 'Status'],
      rows: [
        ['<span class="hl-label">Business RDS Database</span>', '<span class="hl-label">Client Provides</span>', 'Reuse Xinglan E-commerce\'s existing business database for syncing user accounts, agent tiers, permission info, and log storage. Client grants read-only / specified read-write permissions to ensure data interoperability security.', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-label">Vector Knowledge Base</span>', '<span class="hl-label">Service Provider Builds</span>', 'Service Provider deploys, builds, and debugs a dedicated vector database for recruitment/product/compliance three-database independent indexing, semantic search, incremental updates, and source matching. Part of this custom development delivery.', '<span class="hl-good">Confirmed</span>'],
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-info">Clarification Needed:</span> Business RDS database read-only permission scope, table schema, and sync frequency require Client confirmation before integration.',
    },

    { type: 'heading', level: 3, text: '8.3 OSS Object Storage Resources <span class="hl-good">[Confirmed]</span>' },
    {
      type: 'paragraph',
      text: 'Resource ownership: <span class="hl-label">Client Provides</span>',
    },
    {
      type: 'list', ordered: false,
      items: [
        '<span class="hl-good">[Confirmed]</span> Client provides proprietary OSS storage permissions for: ingested original documents, KB attachments, system static resources, Q&A log backups, debugging files, etc.',
        '<span class="hl-good">[Confirmed]</span> <span class="hl-info">Service Provider Responsibility</span>: Configure storage paths, file upload rules, resource category management, permission adaptation for compliant, traceable, and backup-ready system file storage.',
      ],
    },

    { type: 'heading', level: 3, text: '8.4 CDN Acceleration Resources <span class="hl-good">[Confirmed]</span>' },
    {
      type: 'paragraph',
      text: 'Resource ownership: <span class="hl-label">Client Provides</span>',
    },
    {
      type: 'list', ordered: false,
      items: [
        '<span class="hl-good">[Confirmed]</span> Client provides proprietary CDN acceleration for: AI agent page static resource acceleration, mobile access speed improvement, fast image/static file loading — ensuring smooth in-app page access for Xinglan E-commerce APP.',
        '<span class="hl-good">[Confirmed]</span> <span class="hl-info">Service Provider Responsibility</span>: Adapt page resources to CDN rules, optimize static resource loading logic.',
      ],
    },

    { type: 'heading', level: 3, text: '8.5 Token & Account Permission Resources <span class="hl-warn">[Partial Clarification]</span>' },
    {
      type: 'paragraph',
      text: 'Resource ownership: <span class="hl-label">Client provides integration params, Service Provider adapts & develops</span>',
    },
    {
      type: 'table',
      headers: ['Token Type', 'Client Work', 'Service Provider Work', 'Status'],
      rows: [
        ['<span class="hl-label">Login Token System Integration</span>', 'Provide APP user login token validation rules, auto-login API, identity auth params', 'Complete token parsing, identity recognition, auto-login adaptation', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-label">Permission Token Tiers</span>', 'Based on token-carried user identity, agent tier, role permissions', 'Implement tiered content display, tiered Q&A permissions, data access permission control', '<span class="hl-warn">Needs Clarification</span>'],
        ['<span class="hl-info">Admin Token</span>', 'Provide ops admin account system', 'Configure backend operation permissions, operation logs linked to token traceability', '<span class="hl-good">Confirmed</span>'],
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-info">Clarification Needed:</span> Login token validation rules and permission token field formats require Client documentation before integration development can proceed.',
    },

    { type: 'heading', level: 3, text: '8.6 API Resources (Core Integration Boundary) <span class="hl-good">[Confirmed]</span>' },
    {
      type: 'table',
      headers: ['API Attribution', 'Specific APIs', 'Status'],
      rows: [
        ['<span class="hl-label">Client Provides Open APIs</span>', 'APP user login auth API, user identity/agent tier info query API, system permission validation API, basic user data sync API', '<span class="hl-good">Confirmed</span>'],
        ['<span class="hl-label">Service Provider Develops & Exposes APIs</span>', 'AI intelligent Q&A API, KB search API, compliance verification API, log statistics API, KB incremental update API', '<span class="hl-good">Confirmed</span>'],
        ['<span class="hl-info">Reserved APIs (pre-embedded, not developed)</span>', 'Phase 2 AIGC generation API, Phase 3 SCRM data sync API', '<span class="hl-good">Confirmed</span>'],
      ],
    },

    { type: 'heading', level: 3, text: '8.7 Domain, Network, Security Resources <span class="hl-good">[Confirmed]</span>' },
    {
      type: 'paragraph',
      text: 'Resource ownership: <span class="hl-label">Client Provides</span>',
    },
    {
      type: 'list', ordered: false,
      items: [
        '<span class="hl-good">[Confirmed]</span> Provide embedded page access <span class="hl-label">domain</span>, configure <span class="hl-label">HTTPS certificate</span>, configure firewall whitelist, open port access permissions',
        '<span class="hl-good">[Confirmed]</span> Responsible for enterprise intranet and external network policy adaptation, ensuring internal-external service connectivity',
        '<span class="hl-good">[Confirmed]</span> Provide enterprise security compliance policies; <span class="hl-info">Service Provider adapts to Client security standards for development and deployment</span>',
      ],
    },

    { type: 'heading', level: 3, text: '8.8 Resource Responsibility Summary <span class="hl-good">[Confirmed]</span>' },
    {
      type: 'table',
      headers: ['Role', 'Responsibility Scope', 'Status'],
      rows: [
        ['<span class="hl-label">Client Provides Resources</span>', 'Servers, compute, RDS business DB, OSS, CDN, domain, HTTPS certificate, login token, auth API, network security permissions', '<span class="hl-good">Confirmed</span>'],
        ['<span class="hl-label">Service Provider Provides Dev & Services</span>', 'Vector DB setup, RAG core algorithms, AI Q&A service, compliance system, APP embed development, permission system, backend ops, full deployment testing, training delivery', '<span class="hl-good">Confirmed</span>'],
      ],
    },
  ],
};