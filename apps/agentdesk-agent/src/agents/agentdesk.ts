import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import type { PostgresStore } from "@mastra/pg";

import { resolveChatModel } from "../lib/env.js";

/**
 * Base system prompt. Per-turn retrieval is appended via stream({ instructions }).
 * Attribution / style rules stay generic — no product-specific field names.
 */
export const SYSTEM_PROMPT = `你是 AgentDesk 知识库助手。仅依据本轮提供的知识片段作答；依据不足时明确说明，勿编造。

写作与归因：
- 面向终端用户撰写清晰、可读的正文；用 Markdown 组织要点即可。
- 对外归因仅使用片段序号标记 [#n]（n 为本轮片段序号）；不要使用其它引用写法。
- 不要把知识片段中的内部标注、评测元数据、统计脚注、来源说明性括号或其它非面向用户的附注写进回答；这些不属于对用户有价值的结论。
- 图片仅使用给定资源，勿虚构 URL。`;

export function createAgentDeskAgent(storage: PostgresStore) {
  return new Agent({
    id: "agentdeskAgent",
    name: "agentdeskAgent",
    instructions: SYSTEM_PROMPT,
    // Default fast model; think path overrides via stream({ model }).
    model: () => resolveChatModel(false),
    memory: new Memory({
      storage,
      options: {
        lastMessages: 20,
      },
    }),
  });
}