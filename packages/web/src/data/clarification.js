/**
 * 问题澄清清单
 */
export const clarificationDoc = {
  title: '问题澄清清单',
  sections: [
    {
      type: 'heading',
      level: 2,
      text: '一、数据与知识库相关',
      card: true,
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '使用方现有知识文档的总体规模是多少（文件数量及总存储大小）？是否有预估的年度增长量？',
        '使用方知识文档中是否包含图片、表格、流程图等非纯文本内容？如有，这些内容对问答准确度的要求如何？',
        '使用方是否有已标注的问答对（Q&A Pair）数据？如有，数量级如何？是否可用于模型微调？',
        '知识文档是否涉及敏感商业信息或个人信息？需要进行何种级别的数据脱敏处理？',
        '知识文档的更新频率如何？是否需要支持<span class="hl-accent">实时增量更新</span>，还是定期批量更新即可？',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '二、技术架构与部署相关',
      card: true,
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '使用方当前使用的云服务商是哪家（阿里云、腾讯云、华为云或其他）？是否已有<span class="hl-accent">Kubernetes集群</span>环境？',
        '使用方对模型推理是否需要<span class="hl-warn">私有化部署</span>？如需要，现有的GPU资源情况如何（型号、数量、显存）？',
        '平台方方案的API服务是否需要通过使用方的API网关统一管理？是否需遵循特定的鉴权规范？',
        '是否需要与使用方的<span class="hl-accent">SSO单点登录</span>系统（如企业微信、飞书、钉钉）进行集成？',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '三、业务场景与使用相关',
      card: true,
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '智能问答系统的预期使用频次和并发用户数是多少？主要使用场景有哪些（客服、门店、内部查询）？',
        '客服场景下，是否需要支持<span class="hl-accent">"人机协同"</span>模式，即AI生成回答后由人工审核确认再发送？',
        '是否需要支持多语言问答（如中英文混合提问）？目标用户群体是否包含非中文用户？',
        '对于AI生成的回答，使用方是否有特定的话术规范或品牌语调要求需要遵循？',
        '是否需要收集用户对回答的满意度反馈？反馈数据如何应用于系统优化？',
      ],
    },
    {
      type: 'heading',
      level: 2,
      text: '四、项目执行相关',
      card: true,
    },
    {
      type: 'list',
      ordered: false,
      items: [
        '使用方期望的项目正式启动日期是什么时候？是否有<span class="hl-warn">硬性的上线时间要求</span>？',
        '使用方项目经理和技术对接人是否已指定？建议在项目启动前进行一次线下见面沟通会。',
      ],
    },
  ],
};