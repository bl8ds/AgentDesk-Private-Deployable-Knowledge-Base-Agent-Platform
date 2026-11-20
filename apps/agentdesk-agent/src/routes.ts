import { randomUUID } from "node:crypto";

import type { Mastra } from "@mastra/core";
import {
  registerApiRoute,
  type ApiRoute,
  type ContextWithMastra,
} from "@mastra/core/server";
import type { PgVector } from "@mastra/pg";

import { embedQuery, embedTexts } from "./lib/embed.js";
import {
  assertDatabaseUrlConfigured,
  DEFAULT_RESOURCE_ID,
  openaiConfig,
  resolveChatModel,
  retrievalTopK,
  snippetMax,
  VECTOR_INDEX,
} from "./lib/env.js";
import { visionExtractText } from "./lib/vision.js";
import { getComplianceSettings } from "./lib/complianceConfig.js";
import { getEnabledTools, type ToolDef } from "./lib/toolsConfig.js";
import { buildInputSchema, buildToolsets, runTool, type ToolDeps } from "./lib/toolExec.js";
import { SYSTEM_PROMPT } from "./agents/agentdesk.js";

type IngestBody = {
  document_id?: string;
  filename?: string;
  content_type?: string;
  chunks?: Array<{ index?: number; content?: string }>;
};

type ChatBody = {
  message?: string;
  thread_id?: string;
  resource_id?: string;
  /** When true, request reasoning stream if the model emits it. */
  think?: boolean;
};

type Citation = {
  document_id: string;
  chunk_id: string;
  filename?: string;
  content_type?: string;
  snippet: string;
};

function snippetOf(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  const max = snippetMax();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1) + "…";
}

type MemoryStoreLike = {
  getThreadById: (args: { threadId: string }) => Promise<{
    title?: string;
    metadata?: Record<string, unknown>;
  } | null>;
  updateThread?: (args: {
    id: string;
    title: string;
    metadata?: Record<string, unknown>;
  }) => Promise<unknown>;
};

/** Persist per-turn citations on the thread (not inside user message text). */
async function appendCitationTurn(
  memoryStore: MemoryStoreLike,
  threadId: string,
  citations: Citation[],
): Promise<void> {
  if (!memoryStore.updateThread || !citations.length) return;
  const existing = await memoryStore.getThreadById({ threadId });
  if (!existing) return;
  const meta = { ...(existing.metadata || {}) };
  const prev = Array.isArray(meta.agentdesk_citation_turns)
    ? (meta.agentdesk_citation_turns as Citation[][])
    : [];
  meta.agentdesk_citation_turns = [...prev, citations];
  await memoryStore.updateThread({
    id: threadId,
    title: String(existing.title || "新对话"),
    metadata: meta,
  });
}

function sseLine(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function ensureVectorIndex(vector: PgVector, dimension: number) {
  const indexes = await vector.listIndexes();
  if (!indexes.includes(VECTOR_INDEX)) {
    await vector.createIndex({
      indexName: VECTOR_INDEX,
      dimension,
      metric: "cosine",
      indexConfig: { type: "hnsw" },
    });
  }
}

/**
 * Custom HTTP contracts expected by agentdesk-api.
 * `/api/*` uses plain ApiRoute objects (registerApiRoute reserves `/api` by default);
 * paired with `server.apiPrefix = '/_mastra'` in index.ts.
 */
export function buildApiRoutes(getVector: () => PgVector): ApiRoute[] {
  const health = registerApiRoute("/health", {
    method: "GET",
    handler: async (c) => {
      const { apiKey, chatModel, embeddingModel } = openaiConfig();
      return c.json({
        status: "ok",
        agent: "agentdeskAgent",
        llm_configured: Boolean(apiKey),
        chat_model: chatModel || null,
        embedding_model: embeddingModel,
      });
    },
  });

  const ingest: ApiRoute = {
    path: "/api/ingest",
    method: "POST",
    handler: async (c: ContextWithMastra) => {
      try {
        assertDatabaseUrlConfigured();
        const body = (await c.req.json()) as IngestBody;
        const documentId = (body.document_id || "").trim();
        const filename = (body.filename || "").trim() || "unknown";
        const contentType = (body.content_type || "").trim();
        const chunks = Array.isArray(body.chunks) ? body.chunks : [];

        if (!documentId) {
          return c.json({ error: "document_id is required" }, 400);
        }

        const { embeddingApiKey, embeddingDimension } = openaiConfig();
        if (!embeddingApiKey) {
          return c.json(
            {
              error:
                  "模型服务尚未配置，请在管理后台「模型配置」中填写向量接口与密钥。",
            },
            503,
          );
        }

        const prepared = chunks
          .filter(
            (ch) =>
              typeof ch?.content === "string" && ch.content.trim().length > 0,
          )
          .map((ch) => ({
            index: Number(ch.index) || 0,
            content: (ch.content as string).trim(),
            chunkId: `${documentId}:${Number(ch.index) || 0}`,
          }));

        const vector = getVector();
        await ensureVectorIndex(vector, embeddingDimension);

        try {
          await vector.deleteVectors({
            indexName: VECTOR_INDEX,
            filter: { document_id: documentId },
          });
        } catch {
          // first ingest / empty index
        }

        if (prepared.length === 0) {
          return c.json({
            ok: true,
            document_id: documentId,
            chunk_count: 0,
          });
        }

        const embeddings = await embedTexts(prepared.map((p) => p.content));
        if (
          embeddings[0]?.length &&
          embeddings[0].length !== embeddingDimension
        ) {
          return c.json(
            {
              error: `embedding dimension ${embeddings[0].length} != EMBEDDING_DIMENSION ${embeddingDimension}`,
            },
            500,
          );
        }

        await vector.upsert({
          indexName: VECTOR_INDEX,
          vectors: embeddings,
          ids: prepared.map((p) => p.chunkId),
          metadata: prepared.map((p) => ({
            document_id: documentId,
            chunk_id: p.chunkId,
            filename,
            content_type: contentType || undefined,
            index: p.index,
            content: p.content,
          })),
        });

        return c.json({
          ok: true,
          document_id: documentId,
          chunk_count: prepared.length,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return c.json({ error: message }, 500);
      }
    },
  };

  const chat: ApiRoute = {
    path: "/api/chat",
    method: "POST",
    handler: async (c: ContextWithMastra) => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const write = (event: string, data: unknown) => {
            controller.enqueue(encoder.encode(sseLine(event, data)));
          };

          try {
            const body = (await c.req.json()) as ChatBody;
            const message = (body.message || "").trim();
            if (!message) {
              write("error", { message: "message is required" });
              write("done", {});
              controller.close();
              return;
            }

            const { apiKey, embeddingDimension } = openaiConfig();
            if (!apiKey) {
              write("error", {
                message:
                    "模型服务尚未配置，请在管理后台「模型配置」中填写接口与密钥。",
              });
              write("done", {});
              controller.close();
              return;
            }

            assertDatabaseUrlConfigured();

            write("phase", { phase: "retrieving" });

            const vector = getVector();
            await ensureVectorIndex(vector, embeddingDimension);

            const queryVec = await embedQuery(message);
            const hits = await vector.query({
              indexName: VECTOR_INDEX,
              queryVector: queryVec,
              topK: retrievalTopK(),
            });

            // Content compliance + enabled tools are both admin-configured and cached.
            const compliance = await getComplianceSettings();
            const toolDefs = await getEnabledTools();
            const toolDeps: ToolDeps = { vector };

            // Refusal strategy: no retrieved evidence AND no tools that could
            // supply evidence -> do not call the LLM. When tools exist we let the
            // model decide (the refusal note below still constrains it).
            if (
              compliance.refuseWithoutEvidence &&
              hits.length === 0 &&
              toolDefs.length === 0
            ) {
              write("token", { content: compliance.refusalTemplate });
              write("done", {
                thread_id: (body.thread_id || "").trim() || randomUUID(),
                resource_id:
                  (body.resource_id || "").trim() || DEFAULT_RESOURCE_ID,
                think: Boolean(body.think),
              });
              controller.close();
              return;
            }

            const citations: Citation[] = hits.map((h) => {
              const meta = (h.metadata ?? {}) as Record<string, unknown>;
              const content = String(meta.content ?? "");
              const filename =
                String(meta.filename ?? "").trim() || undefined;
              const contentType =
                String(meta.content_type ?? "").trim() || undefined;
              return {
                document_id: String(meta.document_id ?? ""),
                chunk_id: String(meta.chunk_id ?? h.id),
                filename,
                content_type: contentType,
                snippet: snippetOf(content),
              };
            });

            // Emit citations before generation so UI can resolve [#n] early.
            for (const cit of citations) {
              write("citation", cit);
            }

            const contextBlock =
              hits.length === 0
                ? "（无检索结果）"
                : hits
                    .map((h, i) => {
                      const meta = (h.metadata ?? {}) as Record<
                        string,
                        unknown
                      >;
                      // Model-facing context: only ordinal + body.
                      // Ids/filenames stay on the citation SSE side-channel.
                      const body = String(meta.content ?? "").trim();
                      return `[#${i + 1}]\n${body}`;
                    })
                    .join("\n\n");

            // Persist only the clean user utterance in Memory.
            // Inject retrieval context via per-turn instructions (not stored as user text).
            const refusalNote = compliance.refuseWithoutEvidence
              ? `\n\n若无足够依据，直接回复：${compliance.refusalTemplate}`
              : "";
            const toolNote = toolDefs.length
              ? `\n\n可用工具：${toolDefs.map((t) => `${t.name}（${t.description || t.label || t.name}）`).join("；")}。实时信息、精确计算或知识库外的查询，请调用相应工具；工具结果作为事实依据，仍需遵守引用与拒答规则。`
              : "";
            const turnInstructions = `${SYSTEM_PROMPT}${refusalNote}${toolNote}

本轮知识片段（回答时用 [#n] 引用；勿复述片段内的内部标注或元数据）：
${contextBlock}`;

            const mastra = c.get("mastra") as Mastra;
            const agent = mastra.getAgent("agentdeskAgent");
            const threadId = (body.thread_id || "").trim() || randomUUID();
            const resourceId =
              (body.resource_id || "").trim() || DEFAULT_RESOURCE_ID;
            const think = Boolean(body.think);
            const model = resolveChatModel(think);

            write("phase", { phase: think ? "reasoning" : "answering" });

            const agentStream = await agent.stream(message, {
              abortSignal: c.req.raw.signal,
              model,
              instructions: turnInstructions,
              memory: {
                thread: threadId,
                resource: resourceId,
              },
              // Per-request toolsets: admin edits take effect on the next turn
              // without restarting the agent runtime.
              ...(toolDefs.length
                ? { toolsets: buildToolsets(toolDefs, toolDeps), maxSteps: 6 }
                : {}),
            });

            // Best-effort: name blank threads from the first user message.
            void (async () => {
              try {
                const storage = mastra.getStorage();
                const memoryStore = storage
                  ? await storage.getStore("memory")
                  : null;
                if (
                  !memoryStore ||
                  typeof (memoryStore as { updateThread?: unknown })
                    .updateThread !== "function"
                ) {
                  return;
                }
                const existing = await memoryStore.getThreadById({ threadId });
                const curTitle = String(
                  (existing as { title?: string } | null)?.title || "",
                ).trim();
                // Overwrite placeholder / empty titles from the first real user turn.
                if (curTitle && curTitle !== "新对话" && curTitle !== "New Thread") {
                  return;
                }
                const nextTitle = message.trim().slice(0, 40) || "未命名对话";
                await (
                  memoryStore as {
                    updateThread: (args: {
                      id: string;
                      title: string;
                      metadata?: Record<string, unknown>;
                    }) => Promise<unknown>;
                  }
                ).updateThread({
                  id: threadId,
                  title: nextTitle,
                  metadata: (existing as { metadata?: Record<string, unknown> })
                    ?.metadata,
                });
              } catch {
                /* ignore title update failures */
              }
            })();

            // Prefer fullStream so reasoning/usage chunks are available when the model supports them.
            const full = agentStream.fullStream;
            let answeringStarted = false;
            const markAnswering = () => {
              if (answeringStarted) return;
              answeringStarted = true;
              write("phase", { phase: "answering" });
            };
            if (full) {
              for await (const chunk of full) {
                const t = (chunk as { type?: string }).type || "";
                const payload = chunk as Record<string, unknown>;
                if (
                  t === "reasoning-delta" ||
                  t === "reasoning" ||
                  t === "reasoning-start"
                ) {
                  const text =
                    String(
                      payload.text ??
                        payload.delta ??
                        (payload.payload as { text?: string } | undefined)
                          ?.text ??
                        "",
                    ) || "";
                  if (text) write("reasoning", { content: text });
                  continue;
                }
                if (t === "text-delta" || t === "text") {
                  const text =
                    String(
                      payload.text ??
                        payload.delta ??
                        (payload.payload as { text?: string } | undefined)
                          ?.text ??
                        "",
                    ) || "";
                  if (text) {
                    markAnswering();
                    write("token", { content: text });
                  }
                  continue;
                }
                // Surface tool activity to the UI without leaking secrets.
                if (t === "tool-call" || t === "tool_call") {
                  const p =
                    (payload.payload as Record<string, unknown> | undefined) ??
                    payload;
                  write("tool_call", {
                    name: String(p.toolName ?? p.tool_name ?? p.name ?? ""),
                    args: p.args ?? p.input ?? {},
                    call_id: String(p.toolCallId ?? p.tool_call_id ?? ""),
                  });
                  continue;
                }
                if (
                  t === "tool-result" ||
                  t === "tool_result" ||
                  t === "tool-error"
                ) {
                  const p =
                    (payload.payload as Record<string, unknown> | undefined) ??
                    payload;
                  const raw = p.result ?? p.output ?? p.error ?? null;
                  let result: unknown = raw;
                  if (typeof raw === "string") {
                    try {
                      result = JSON.parse(raw);
                    } catch {
                      /* keep string */
                    }
                  }
                  write(t === "tool-error" ? "tool_error" : "tool_result", {
                    name: String(p.toolName ?? p.tool_name ?? p.name ?? ""),
                    result,
                    call_id: String(p.toolCallId ?? p.tool_call_id ?? ""),
                    is_error: t === "tool-error",
                  });
                  continue;
                }
                if (t === "finish" || t === "step-finish") {
                  const usage =
                    (payload.usage as Record<string, number> | undefined) ||
                    (
                      payload.payload as
                        | { usage?: Record<string, number> }
                        | undefined
                    )?.usage;
                  if (usage) {
                    write("usage", {
                      prompt_tokens:
                        usage.inputTokens ?? usage.promptTokens ?? 0,
                      completion_tokens:
                        usage.outputTokens ?? usage.completionTokens ?? 0,
                      reasoning_tokens: usage.reasoningTokens ?? 0,
                      total_tokens:
                        usage.totalTokens ??
                        (Number(usage.inputTokens || 0) +
                          Number(usage.outputTokens || 0) +
                          Number(usage.reasoningTokens || 0)),
                      model: model.id,
                      think,
                    });
                  }
                }
              }
            } else {
              for await (const chunk of agentStream.textStream) {
                if (chunk) {
                  markAnswering();
                  write("token", { content: chunk });
                }
              }
              try {
                const usage = await agentStream.usage;
                if (usage) {
                  write("usage", {
                    prompt_tokens:
                      (usage as { inputTokens?: number }).inputTokens ?? 0,
                    completion_tokens:
                      (usage as { outputTokens?: number }).outputTokens ?? 0,
                    reasoning_tokens:
                      (usage as { reasoningTokens?: number }).reasoningTokens ??
                      0,
                    total_tokens:
                      (usage as { totalTokens?: number }).totalTokens ?? 0,
                    model: model.id,
                    think,
                  });
                }
              } catch {
                // usage unavailable
              }
            }

            try {
              const storage = mastra.getStorage();
              const memoryStore = storage
                ? await storage.getStore("memory")
                : null;
              if (memoryStore) {
                await appendCitationTurn(
                  memoryStore as MemoryStoreLike,
                  threadId,
                  citations,
                );
              }
            } catch {
              /* citation persistence is best-effort */
            }

            write("done", {
              thread_id: threadId,
              resource_id: resourceId,
              think,
            });
            controller.close();
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            try {
              controller.enqueue(
                encoder.encode(sseLine("error", { message })),
              );
              controller.enqueue(encoder.encode(sseLine("done", {})));
            } catch {
              // stream already closed
            }
            controller.close();
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    },
  };

  const listThreads: ApiRoute = {
    path: "/api/threads",
    method: "GET",
    handler: async (c: ContextWithMastra) => {
      try {
        const resourceId = (c.req.query("resourceId") || "").trim();
        if (!resourceId) {
          return c.json({ error: "resourceId query is required" }, 400);
        }
        const mastra = c.get("mastra") as Mastra;
        const storage = mastra.getStorage();
        if (!storage) {
          return c.json({ error: "storage not configured" }, 500);
        }
        const memoryStore = await storage.getStore("memory");
        if (!memoryStore) {
          return c.json({ error: "memory store unavailable" }, 500);
        }
        const threads = await memoryStore.listThreads({
          filter: { resourceId },
          page: 0,
          perPage: 100,
        });

        return c.json({ success: true, data: threads });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return c.json({ error: message }, 500);
      }
    },
  };

  const threadMessages: ApiRoute = {
    path: "/api/threads/:id/messages",
    method: "GET",
    handler: async (c: ContextWithMastra) => {
      try {
        const threadId = c.req.param("id");
        const resourceId = (c.req.query("resourceId") || "").trim();
        if (!threadId) {
          return c.json({ error: "thread id required" }, 400);
        }
        if (!resourceId) {
          return c.json({ error: "resourceId query is required" }, 400);
        }
        const mastra = c.get("mastra") as Mastra;
        const storage = mastra.getStorage();
        if (!storage) {
          return c.json({ error: "storage not configured" }, 500);
        }
        const memoryStore = await storage.getStore("memory");
        if (!memoryStore) {
          return c.json({ error: "memory store unavailable" }, 500);
        }
        const thread = await memoryStore.getThreadById({ threadId });
        if (!thread) {
          return c.json({ error: "thread not found" }, 404);
        }
        const owner = String(
          (thread as { resourceId?: string }).resourceId || "",
        );
        if (owner && owner !== resourceId) {
          return c.json({ error: "forbidden" }, 403);
        }
        const listed = await memoryStore.listMessages({
          threadId,
          page: 0,
          perPage: 200,
        });
        // Mastra returns { messages, ...pagination }, not a bare array.
        const messageList = Array.isArray(listed)
          ? listed
          : Array.isArray(
                (listed as { messages?: unknown } | null)?.messages,
              )
            ? ((listed as { messages: unknown[] }).messages)
            : [];

        const citationTurns = Array.isArray(
          (thread as { metadata?: Record<string, unknown> }).metadata
            ?.agentdesk_citation_turns,
        )
          ? ((thread as { metadata?: Record<string, unknown> }).metadata!
              .agentdesk_citation_turns as Citation[][])
          : [];

        return c.json({
          success: true,
          data: { messages: messageList, citation_turns: citationTurns },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return c.json({ error: message }, 500);
      }
    },
  };

  const updateThread: ApiRoute = {
    path: "/api/threads/:id",
    method: "PATCH",
    handler: async (c: ContextWithMastra) => {
      try {
        const threadId = c.req.param("id");
        const body = (await c.req.json()) as {
          title?: string;
          resourceId?: string;
        };
        const resourceId = String(body.resourceId || "").trim();
        const title = String(body.title || "").trim();
        if (!threadId) {
          return c.json({ error: "thread id required" }, 400);
        }
        if (!resourceId) {
          return c.json({ error: "resourceId is required" }, 400);
        }
        if (!title) {
          return c.json({ error: "title is required" }, 400);
        }
        const mastra = c.get("mastra") as Mastra;
        const storage = mastra.getStorage();
        if (!storage) {
          return c.json({ error: "storage not configured" }, 500);
        }
        const memoryStore = await storage.getStore("memory");
        if (!memoryStore) {
          return c.json({ error: "memory store unavailable" }, 500);
        }
        const existing = await memoryStore.getThreadById({ threadId });
        if (!existing) {
          return c.json({ error: "thread not found" }, 404);
        }
        const owner = String(
          (existing as { resourceId?: string }).resourceId || "",
        );
        if (owner && owner !== resourceId) {
          return c.json({ error: "forbidden" }, 403);
        }
        if (
          typeof (memoryStore as { updateThread?: unknown }).updateThread !==
          "function"
        ) {
          return c.json({ error: "updateThread unsupported" }, 501);
        }
        const updated = await (
          memoryStore as {
            updateThread: (args: {
              id: string;
              title: string;
              metadata?: Record<string, unknown>;
            }) => Promise<unknown>;
          }
        ).updateThread({
          id: threadId,
          title: title.slice(0, 80),
          metadata: (existing as { metadata?: Record<string, unknown> })
            ?.metadata,
        });
        return c.json({ success: true, data: updated ?? { id: threadId, title } });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return c.json({ error: message }, 500);
      }
    },
  };

  const visionIngest: ApiRoute = {
    path: "/api/vision-extract",
    method: "POST",
    handler: async (c: ContextWithMastra) => {
      try {
        const body = (await c.req.json()) as {
          content_base64?: string;
          content_type?: string;
        };
        const b64 = (body.content_base64 || "").trim();
        if (!b64) {
          return c.json({ error: "content_base64 is required" }, 400);
        }
        const buf = Buffer.from(b64, "base64");
        const text = await visionExtractText(
          buf,
          body.content_type || "image/jpeg",
        );
        return c.json({ success: true, data: { text } });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return c.json({ error: message }, 500);
      }
    },
  };

  const invokeTool: ApiRoute = {
    path: "/api/tools/invoke",
    method: "POST",
    handler: async (c: ContextWithMastra) => {
      try {
        const body = (await c.req.json()) as {
          tool?: ToolDef;
          input?: Record<string, unknown>;
        };
        if (!body.tool || !body.tool.name) {
          return c.json({ success: false, error: "tool definition is required" }, 400);
        }
        const tool = body.tool;
        // Normalize stringified JSON fields coming from the Go admin API.
        if (typeof tool.config === "string") {
          try {
            tool.config = JSON.parse(tool.config);
          } catch {
            tool.config = {};
          }
        }
        if (typeof tool.input_schema === "string") {
          try {
            tool.input_schema = JSON.parse(tool.input_schema);
          } catch {
            tool.input_schema = { type: "object", properties: {} };
          }
        }
        if (tool.kind === "http") {
          // Validate schema builds before executing (same path as live chat).
          buildInputSchema(tool);
        }
        const vector = getVector();
        const data = await runTool(tool, body.input ?? {}, { vector });
        return c.json({ success: true, data });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return c.json({ success: false, error: message }, 200);
      }
    },
  };

  const unindex: ApiRoute = {
    path: "/api/unindex",
    method: "POST",
    handler: async (c: ContextWithMastra) => {
      try {
        const body = (await c.req.json()) as { document_id?: string };
        const documentId = (body.document_id || "").trim();
        if (!documentId) {
          return c.json({ error: "document_id is required" }, 400);
        }
        const vector = getVector();
        const { embeddingDimension } = openaiConfig();
        await ensureVectorIndex(vector, embeddingDimension);
        try {
          await vector.deleteVectors({
            indexName: VECTOR_INDEX,
            filter: { document_id: documentId },
          });
        } catch {
          // empty index / already gone
        }
        return c.json({ success: true, data: { document_id: documentId } });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return c.json({ error: message }, 500);
      }
    },
  };

  return [
    health,
    ingest,
    chat,
    listThreads,
    threadMessages,
    updateThread,
    visionIngest,
    invokeTool,
    unindex,
  ];
}