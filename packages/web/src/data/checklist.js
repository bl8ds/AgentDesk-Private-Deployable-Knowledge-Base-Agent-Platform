/**
 * 对接清单
 * 
 * 标记说明：
 *   [已罗列]：需求已明确，双方职责清晰，无需进一步确认
 *   [需澄清]：需使用方进一步决策、填写、提供物料后方可推进
 *   [部分需澄清]：章节整体已明确，但存在个别条目需使用方确认
 */
export const checklistDoc = {
  title: '对接清单',
  sections: [
    // ==================== 对接清单总览 ====================
    {
      type: 'heading',
      level: 2,
      text: '0. 对接清单总览（状态标记索引）',
    },
    {
      type: 'paragraph',
      text: '本文档将全部对接事项按确认状态分为两类：<span class="hl-good">已罗列</span> 表示需求已明确、双方职责清晰、可直接推进；<span class="hl-warn">需澄清</span> 表示需使用方进一步决策确认或提供物料后方可推进。',
    },
    {
      type: 'table',
      headers: ['状态标记', '含义', '典型场景', '对应章节'],
      rows: [
        ['<span class="hl-good">已罗列</span>', '双方已明确，无需使用方额外确认', '职责边界、平台方承担范围、已确定的资源需求、App 侧对接任务', '§1 / §5 / §6 / §7 / §8（部分）'],
        ['<span class="hl-warn">需澄清</span>', '需使用方决策、填写或提供物料', '服务商选型、权益映射规则、决策确认项、物料交付细节', '§2（部分）/ §3（部分）/ §4 / §8（部分）'],
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-warn">关键提示：</span>第四条"使用方需决策确认项"（C1～C10）为本清单中最集中的待确认事项，建议使用方优先处理，以避免阻塞后续开发排期。',
    },

    // ==================== 1. 职责边界总览 [已罗列] ====================
    {
      type: 'heading',
      level: 2,
      text: '1. 职责边界总览 <span class="hl-good">[已罗列]</span>',
    },
    {
      type: 'paragraph',
      text: '以下职责边界已在前期沟通中达成一致，双方职责清晰无歧义。',
    },
    {
      type: 'table',
      headers: ['领域', '使用方负责', '平台方负责'],
      rows: [
        ['基础设施', '服务器、域名、证书、网络策略', '部署实施、Docker 编排'],
        ['大模型', '采购账号、承担费用、提供 Key', '接入、主备路由、调优'],
        ['内容安全', '采购账号、提供 Key、敏感词规则', '对接、双向审核钩子'],
        ['用户身份', 'App 登录、签发一次性码/用户等级', '换票、Session、鉴权'],
        ['用户等级门控', '定义等级→AI 权益映射、提供判定来源', '配置化实现、拦截与引导'],
        ['额度计费', '确认套餐与限额规则', '额度扣减、拦截、明细'],
        ['知识内容', '提供语料、负责内容质量与更新', '入库流水线、检索调优'],
        ['前端集成', 'WebView 容器、JSBridge、验收题集', 'H5、运营后台、联调'],
        ['合规', '法务文案（隐私/免责/协议）', '页面挂载、审计日志'],
      ],
    },

    // ==================== 2. 使用方需提供的物料 [部分需澄清] ====================
    {
      type: 'heading',
      level: 2,
      text: '2. 使用方需提供的物料（配合项）<span class="hl-warn">[部分需澄清]</span>',
    },
    {
      type: 'paragraph',
      text: '物料清单已罗列完整，其中 <span class="hl-warn">P4～P13 需使用方确认具体厂商/格式/内容</span> 后方可推进。',
    },
    {
      type: 'table',
      headers: ['#', '物料', '用途', '交付形式', '建议节点', '状态'],
      rows: [
        ['<span class="hl-warn">P1</span>', '服务器（建议 ≥4C8G，SSD ≥80G）', '私有化部署', '访问权限/资源', '<span class="hl-accent">T0</span>', '<span class="hl-good">已罗列</span>'],
        ['<span class="hl-warn">P2</span>', '域名 + HTTPS 证书', '对外访问', '配置信息', '<span class="hl-accent">T0</span>', '<span class="hl-good">已罗列</span>'],
        ['<span class="hl-warn">P3</span>', '内网/出网网络策略', '部署与模型调用', '网络说明', '<span class="hl-accent">T0</span>', '<span class="hl-good">已罗列</span>'],
        ['<span class="hl-label">P4</span>', '大模型 API Key（Chat）', '生成', 'Key + 端点', 'T0+1', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-label">P5</span>', 'Embedding API Key', '向量化', 'Key + 端点', 'T0+1', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-info">P6</span>', '内容安全 API Key + 敏感词库', '输入输出审核', 'Key + 规则', 'T0+2', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-info">P7</span>', '首批知识语料', '入库', '文件包/对象存储', 'T0+3', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-info">P8</span>', 'App 用户字段映射', '鉴权与等级门控', '字段表', 'T0+3', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-info">P9</span>', '用户等级 → AI 权益映射规则', '门控与套餐', '规则表', 'T0+3', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-label">P10</span>', 'App 服务端对接平台方签发接口', 'App 免登', '接口/联调账号', 'T0+5', '<span class="hl-warn">需澄清</span>'],
        ['P11', '验收题集 30～50 条（含期望依据）', '召回验收', '表格', 'T0+7', '<span class="hl-warn">需澄清</span>'],
        ['P12', '可测 App WebView 包', '集成联调', '测试包', 'T0+10', '<span class="hl-warn">需澄清</span>'],
        ['P13', '法务文案（隐私/免责/用户协议）', '合规挂载', '文档', '<span class="hl-warn">上线前</span>', '<span class="hl-warn">需澄清</span>'],
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-info">汇总：</span>P1～P3 为基础设施类，需求清晰可直接准备；P4～P13 为<span class="hl-warn">待使用方确认/提供</span> 类，共 10 项需推动落实。',
    },

    // ==================== 3. 用户等级门控 [需澄清] ====================
    {
      type: 'heading',
      level: 2,
      text: '3. 用户等级门控（配合明细）<span class="hl-warn">[需澄清]</span>',
    },
    {
      type: 'paragraph',
      text: '场景：按使用方用户体系，仅<span class="hl-accent">特定等级用户</span>开启 AI 功能。本章节所有条目均需使用方确认。',
    },
    {
      type: 'heading',
      level: 3,
      text: '3.1 使用方需确认的判定来源（三选一）<span class="hl-warn">[需澄清]</span>',
    },
    {
      type: 'table',
      headers: ['方式', '使用方工作', '特点', '状态'],
      rows: [
        ['<span class="hl-good">A. 令牌内嵌等级（推荐）</span>', '在 code/JWT 中放 level/vip_level/role', '无额外接口，实时性=登录周期', '<span class="hl-warn">需澄清</span>'],
        ['B. 权益查询接口', '提供 GET 用户权益(uid)', '实时性好，需接口联调', '<span class="hl-warn">需澄清</span>'],
        ['C. 权益批量/增量同步', '推送等级数据到本系统', '本地判定快，有同步延迟', '<span class="hl-warn">需澄清</span>'],
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: '3.2 使用方需确认的映射规则（待使用方填写）<span class="hl-warn">[需澄清]</span>',
    },
    {
      type: 'paragraph',
      text: '以下为示例模板，实际值<span class="hl-warn">需使用方确认后填入</span>。',
    },
    {
      type: 'table',
      headers: ['用户等级', '是否可用 AI', '日额度', '可用能力', '状态'],
      rows: [
        ['普通用户', '<span class="hl-warn">否 / 是</span>', '—', '问答', '<span class="hl-warn">需澄清</span>'],
        ['会员', '<span class="hl-good">是</span>', '—', '问答（+商品卡 Phase 2）', '<span class="hl-warn">需澄清</span>'],
        ['高级会员', '<span class="hl-good">是</span>', '—', '问答 + 高阶（Phase 2）', '<span class="hl-warn">需澄清</span>'],
      ],
    },
    {
      type: 'heading',
      level: 3,
      text: '3.3 交互约定 <span class="hl-warn">[部分需澄清]</span>',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '<span class="hl-good">[已罗列]</span> 未达标用户：返回 <span class="hl-warn">AI_NOT_ENTITLED</span>，前端展示升级引导（文案由使用方定）',
        '<span class="hl-warn">[需澄清]</span> 等级变更后的生效时效：依所选来源（A/B/C）而定，需使用方确认可接受范围',
        '<span class="hl-good">[已罗列]</span> 越权兜底：前端隐藏入口 + <span class="hl-warn">BFF 二次校验</span>',
      ],
    },

    // ==================== 4. 使用方需决策确认项 [需澄清] ====================
    {
      type: 'heading',
      level: 2,
      text: '4. 使用方需决策确认项 <span class="hl-warn">[需澄清]</span>',
    },
    {
      type: 'paragraph',
      text: '以下 C1～C10 为本清单中<span class="hl-warn">最关键的待确认事项</span>，每一项均为推进项目所必需，建议使用方优先逐项确认。已标注默认推荐值供参考。',
    },
    {
      type: 'table',
      headers: ['#', '确认项', '可选值（默认推荐已标注）', '使用方填写', '状态'],
      rows: [
        ['<span class="hl-label">C1</span>', '浏览器访问策略', 'A 禁止 / <span class="hl-info">B 受限(默认)</span> / C 完全开放', '—', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-label">C2</span>', '终端鉴权方式', '<span class="hl-good">一次性 code(推荐)</span> / 短时 JWT / 两者', '—', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-label">C3</span>', '用户等级门控来源', '<span class="hl-good">A 令牌内嵌</span> / B 权益接口 / C 权益同步', '—', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-label">C4</span>', '等级→AI 权益映射', '见 §3.2 填写', '—', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-label">C5</span>', '模型调用是否允许出内网到云厂商', '是 / <span class="hl-warn">否（否→私有化模型另项）</span>', '—', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-info">C6</span>', '运营后台是否必须对接使用方 SSO', '<span class="hl-info">否(默认)</span> / 是(变更项)', '—', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-info">C7</span>', '内容安全厂商', '百度 / 阿里 / 腾讯 / 其他', '—', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-info">C8</span>', 'Phase 1 是否启用 RAGFlow', '<span class="hl-info">否(默认，Mastra 基础 RAG)</span> / 是', '—', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-info">C9</span>', 'Phase 1 是否包含 OCR 扫描件', '<span class="hl-info">否(默认)</span> / 是(变更项)', '—', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-info">C10</span>', '质保期', '— 个月', '—', '<span class="hl-warn">需澄清</span>'],
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-info">汇总：</span>C1～C10 共 10 项决策确认项，全部为 <span class="hl-warn">[需澄清]</span> 状态。建议使用方在 T0+3 之前完成确认，其中 C1～C5 为高优先级（影响技术方案选型），C6～C10 为中优先级（可在开发启动后确认）。',
    },

    // ==================== 5. 使用方 App 侧对接任务 [已罗列] ====================
    {
      type: 'heading',
      level: 2,
      text: '5. 使用方 App 侧对接任务 <span class="hl-good">[已罗列]</span>',
    },
    {
      type: 'paragraph',
      text: '以下对接任务已明确，使用方可直接按列表推进。Phase 2 任务预埋不阻塞一期交付。',
    },
    {
      type: 'table',
      headers: ['#', '任务', '交付物', '截止', '状态'],
      rows: [
        ['A1', 'WebView 可打开约定域名（iOS/Android）', '测试包或说明', '<span class="hl-label">联调前 5 天</span>', '<span class="hl-good">已罗列</span>'],
        ['A2', '服务端实现一次性码申请（密钥不下发前端）', '接口说明 + 联调账号', '<span class="hl-label">联调前 5 天</span>', '<span class="hl-good">已罗列</span>'],
        ['A3', '传递用户 sub 及用户等级字段', '字段表', 'T0+3', '<span class="hl-good">已罗列</span>'],
        ['A4', 'JSBridge close（Phase 1）', '方法名文档', '<span class="hl-warn">联调前 3 天</span>', '<span class="hl-good">已罗列</span>'],
        ['A5', '（Phase 2）JSBridge openGoods/share/saveImage', '方法名文档', 'Phase 2', '<span class="hl-good">已罗列</span>'],
        ['A6', 'UAT 网络与证书策略', '网络说明', '<span class="hl-warn">部署前</span>', '<span class="hl-good">已罗列</span>'],
      ],
    },

    // ==================== 6. 平台方负责范围 [已罗列] ====================
    {
      type: 'heading',
      level: 2,
      text: '6. 明确不需要使用方承担（平台方负责）<span class="hl-good">[已罗列]</span>',
    },
    {
      type: 'paragraph',
      text: '以下事项全部由平台方独立完成，使用方无需投入资源。',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '<span class="hl-good">[已罗列]</span> H5 对话应用、运营后台、Go BFF 开发',
        '<span class="hl-good">[已罗列]</span> Mastra Agent 服务、（按需）RAGFlow 部署与配置',
        '<span class="hl-good">[已罗列]</span> 一次性码换票、Session、额度扣减、审计日志',
        '<span class="hl-good">[已罗列]</span> 用户等级门控的配置化实现与拦截逻辑',
        '<span class="hl-good">[已罗列]</span> 模型主备路由与调优',
      ],
    },

    // ==================== 7. 阻塞与工期说明 [已罗列] ====================
    {
      type: 'heading',
      level: 2,
      text: '7. 阻塞与工期说明 <span class="hl-good">[已罗列]</span>',
    },
    {
      type: 'paragraph',
      text: '<span class="hl-good">[已罗列]</span> 工期自<span class="hl-warn"> P1～P10 就绪</span>起算；<span class="hl-warn">使用方物料/确认延迟不计入平台方延误</span>。',
    },

    // ==================== 8. 一期落地资源清单 & 权责边界梳理 [部分需澄清] ====================
    {
      type: 'heading',
      level: 2,
      text: '8. 一期落地资源清单 & 权责边界梳理 <span class="hl-warn">[部分需澄清]</span>',
    },
    {
      type: 'paragraph',
      text: '本章明确项目一期落地所需硬件资源、云资源、权限资源、接口资源，严格划分使用方（AgentDesk网络）、平台方供需边界。资源归属整体已明确，部分细节<span class="hl-warn">需使用方确认</span>。',
    },

    {
      type: 'heading',
      level: 3,
      text: '8.1 服务器资源（核心部署资源）<span class="hl-good">[已罗列]</span>',
    },
    {
      type: 'paragraph',
      text: '资源归属：<span class="hl-label">使用方AgentDesk网络提供</span>',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '<span class="hl-good">[已罗列]</span> <span class="hl-label">应用服务器</span>：提供可用 Linux 服务器/虚拟机，用于部署 AI 智能体后端服务、RAG 调度服务、后台管理系统，开放对应端口、外网访问权限、防火墙白名单权限。',
        '<span class="hl-good">[已罗列]</span> <span class="hl-label">算力资源</span>：使用方提供本地服务器算力，支撑向量检索、问答推理、知识库解析运行，无需平台方额外采购公有云算力，实现<span class="hl-good">数据 100% 本地化、无外发</span>。',
        '<span class="hl-good">[已罗列]</span> <span class="hl-label">运行环境</span>：使用方协助配置服务器基础环境（系统版本、运行依赖、网络策略），保障项目稳定部署运行。',
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-good">[已罗列]</span> <span class="hl-info">平台方负责</span>：项目程序部署、环境调试、服务启停配置、运行优化、故障排查、程序版本迭代更新。',
    },

    {
      type: 'heading',
      level: 3,
      text: '8.2 数据库资源（RDS / 向量库）<span class="hl-warn">[部分需澄清]</span>',
    },
    {
      type: 'paragraph',
      text: '资源归属：<span class="hl-label">分层界定</span>',
    },
    {
      type: 'table',
      headers: ['数据库类型', '归属方', '说明', '状态'],
      rows: [
        ['<span class="hl-label">业务 RDS 数据库</span>', '<span class="hl-label">使用方提供</span>', '复用AgentDesk网络现有业务数据库，用于同步用户账号、代理等级、权限信息、日志存储。使用方开放只读/指定读写权限，保障数据互通安全。', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-label">向量知识库</span>', '<span class="hl-label">平台方搭建</span>', '平台方负责部署、搭建、调试专属向量数据库，实现招商/产品/合规三库独立索引、语义检索、增量更新、溯源匹配，属于本次定制开发交付内容。', '<span class="hl-good">已罗列</span>'],
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-info">需澄清说明：</span>业务 RDS 数据库的只读权限范围、表结构、同步频率需使用方确认后对接。',
    },

    {
      type: 'heading',
      level: 3,
      text: '8.3 OSS 对象存储资源 <span class="hl-good">[已罗列]</span>',
    },
    {
      type: 'paragraph',
      text: '资源归属：<span class="hl-label">使用方提供</span>',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '<span class="hl-good">[已罗列]</span> 使用方提供自有 OSS 存储权限，用于存储：入库原始文档、知识库附件、系统静态资源、问答日志备份、调试文件等。',
        '<span class="hl-good">[已罗列]</span> <span class="hl-info">平台方负责</span>：配置存储路径、文件上传规则、资源分类管理、权限适配，实现系统文件合规存储、可追溯、可备份。',
      ],
    },

    {
      type: 'heading',
      level: 3,
      text: '8.4 CDN 加速资源 <span class="hl-good">[已罗列]</span>',
    },
    {
      type: 'paragraph',
      text: '资源归属：<span class="hl-label">使用方提供</span>',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '<span class="hl-good">[已罗列]</span> 使用方提供自有 CDN 加速能力，用于 AI 智能体页面静态资源加速、移动端访问提速、图片/静态文件快速加载，保障AgentDesk APP 内嵌页面访问流畅、无卡顿。',
        '<span class="hl-good">[已罗列]</span> <span class="hl-info">平台方负责</span>：页面资源适配 CDN 规则，优化静态资源加载逻辑。',
      ],
    },

    {
      type: 'heading',
      level: 3,
      text: '8.5 令牌 Token & 账号权限资源 <span class="hl-warn">[部分需澄清]</span>',
    },
    {
      type: 'paragraph',
      text: '资源归属：<span class="hl-label">使用方提供对接参数，平台方适配开发</span>',
    },
    {
      type: 'table',
      headers: ['Token 类型', '使用方工作', '平台方工作', '状态'],
      rows: [
        ['<span class="hl-label">登录 Token 体系对接</span>', '提供 APP 用户登录 Token 校验规则、免登接口、身份鉴权参数', '完成 Token 解析、身份识别、自动登录适配', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-label">权限 Token 分级</span>', '基于 Token 携带的用户身份、代理等级、角色权限', '实现分级内容展示、分级问答权限、数据访问权限管控', '<span class="hl-warn">需澄清</span>'],
        ['<span class="hl-info">后台管理 Token</span>', '提供运维管理员账号体系', '配置后台操作权限、操作日志关联 Token 溯源', '<span class="hl-good">已罗列</span>'],
      ],
    },
    {
      type: 'paragraph',
      text: '<span class="hl-info">需澄清说明：</span>登录 Token 校验规则和权限 Token 字段格式需使用方提供文档后方可对接开发。',
    },

    {
      type: 'heading',
      level: 3,
      text: '8.6 接口资源（核心对接边界）<span class="hl-good">[已罗列]</span>',
    },
    {
      type: 'table',
      headers: ['接口归属', '具体接口', '状态'],
      rows: [
        ['<span class="hl-label">使用方提供开放接口</span>', 'APP 用户登录鉴权接口、用户身份/代理等级信息查询接口、系统权限校验接口、基础用户数据同步接口', '<span class="hl-good">已罗列</span>'],
        ['<span class="hl-label">平台方开发输出接口</span>', 'AI 智能问答接口、知识库检索接口、合规校验接口、日志统计接口、知识库增量更新接口', '<span class="hl-good">已罗列</span>'],
        ['<span class="hl-info">预留接口（预埋不开发）</span>', '二期 AIGC 生成接口、三期 SCRM 数据同步接口', '<span class="hl-good">已罗列</span>'],
      ],
    },

    {
      type: 'heading',
      level: 3,
      text: '8.7 域名、网络、安全资源 <span class="hl-good">[已罗列]</span>',
    },
    {
      type: 'paragraph',
      text: '资源归属：<span class="hl-label">使用方提供</span>',
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '<span class="hl-good">[已罗列]</span> 提供内嵌页面访问<span class="hl-label">域名</span>、配置 <span class="hl-label">HTTPS 证书</span>、配置防火墙白名单、开放端口访问权限',
        '<span class="hl-good">[已罗列]</span> 负责企业内网、外网网络策略适配，保障内外网服务互通',
        '<span class="hl-good">[已罗列]</span> 提供企业安全合规策略，<span class="hl-info">平台方适配使用方安全规范完成开发部署</span>',
      ],
    },

    {
      type: 'heading',
      level: 3,
      text: '8.8 资源权责总结 <span class="hl-good">[已罗列]</span>',
    },
    {
      type: 'table',
      headers: ['角色', '责任范围', '状态'],
      rows: [
        ['<span class="hl-label">使用方出资源</span>', '服务器、算力、RDS 业务库、OSS、CDN、域名、HTTPS 证书、登录 Token、鉴权接口、网络安全权限', '<span class="hl-good">已罗列</span>'],
        ['<span class="hl-label">平台方出开发 & 服务</span>', '向量库搭建、RAG 核心算法、AI 问答服务、合规系统、APP 内嵌开发、权限系统、后台运维、全量调试部署、培训交付', '<span class="hl-good">已罗列</span>'],
      ],
    },
  ],
};