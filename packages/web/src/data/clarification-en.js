/**
 * Clarification Q&A - English
 */
export var clarificationDocEn = {
  title: 'Clarification Q&A',
  sections: [
    { type: 'heading', level: 2, text: 'I. Data & Knowledge Base', card: true },
    {
      type: 'list', ordered: false,
      items: [
        'What is the total size of Client\'s existing knowledge documents (file count and total storage size)? Is there an estimated annual growth rate?',
        'Do Client\'s knowledge documents contain non-plain-text content such as images, tables, flowcharts? If so, what are the accuracy requirements for Q&A on such content?',
        'Does Client have labeled Q&A Pair data? If so, what is the volume? Can it be used for model fine-tuning?',
        'Do knowledge documents contain sensitive business or personal information? What level of data anonymization is required?',
        'What is the update frequency of knowledge documents? Is <span class="hl-accent">real-time incremental update</span> needed, or is periodic batch update sufficient?',
      ],
    },
    { type: 'heading', level: 2, text: 'II. Technical Architecture & Deployment', card: true },
    {
      type: 'list', ordered: false,
      items: [
        'Which cloud provider does Client currently use (Alibaba Cloud, Tencent Cloud, Huawei Cloud, or other)? Is there already a <span class="hl-accent">Kubernetes cluster</span> environment?',
        'Does Client require <span class="hl-warn">private deployment</span> for model inference? If so, what is the current GPU resource situation (model, quantity, VRAM)?',
        'Do Service Provider\'s API services need to be managed through Client\'s API gateway? Do they need to comply with specific authentication standards?',
        'Does the system need to support multi-tenant or multi-workspace isolation? Is strict data isolation required between different departments or stores?',
        'Is integration with Client\'s <span class="hl-accent">SSO single sign-on</span> system (e.g., WeCom, Feishu, DingTalk) required?',
      ],
    },
    { type: 'heading', level: 2, text: 'III. Business Scenarios & Usage', card: true },
    {
      type: 'list', ordered: false,
      items: [
        'What is the expected usage frequency and concurrent user count for the intelligent Q&A system? What are the primary usage scenarios (customer service, stores, internal queries)?',
        'In customer service scenarios, is <span class="hl-accent">"human-AI collaboration"</span> mode needed — where AI generates answers and humans review before sending?',
        'Is multi-language Q&A needed (e.g., Chinese-English mixed questions)? Does the target user group include non-Chinese users?',
        'Does Client have specific script standards or brand tone requirements that AI-generated answers must follow?',
        'Is user satisfaction feedback on answers needed? How will feedback data be applied to system optimization?',
      ],
    },
    { type: 'heading', level: 2, text: 'IV. Project Execution', card: true },
    {
      type: 'list', ordered: false,
      items: [
        'What is Client\'s expected project start date? Is there a <span class="hl-warn">hard go-live deadline</span>?',
        'Have Client\'s project manager and technical contact been designated? An in-person kickoff meeting before project start is recommended.',
        'Does the project involve third-party software licenses or cloud resources that Client needs to purchase? Has the budget been approved?',
        'What are the project acceptance criteria and process? Is a third-party testing organization involved in acceptance?',
      ],
    },
  ],
};