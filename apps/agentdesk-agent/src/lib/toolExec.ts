/**
 * Dynamic tool construction for the Mastra runtime.
 * Builds per-request toolsets from admin-configured definitions and executes
 * built-in / HTTP tools with bounded timeouts and output sizes.
 */
import { createTool } from "@mastra/core/tools";
import type { PgVector } from "@mastra/pg";
import { z } from "zod";

import type { ToolDef } from "./toolsConfig";
import { embedQuery } from "./embed";
import { openaiConfig, VECTOR_INDEX } from "./env";

export type ToolDeps = {
  vector: PgVector;
};

function zodForParam(type: string | undefined): z.ZodTypeAny {
  switch (type) {
    case "number":
    case "integer":
      return z.number();
    case "boolean":
      return z.boolean();
    case "array":
      return z.array(z.union([z.string(), z.number(), z.boolean()]));
    default:
      return z.string();
  }
}

/**
 * Translate the admin JSON Schema subset into a Zod object Mastra can use.
 * Supports string / number / boolean / array and a `required` list.
 */
export function buildInputSchema(def: ToolDef): z.ZodObject<z.ZodRawShape> {
  const props = def.input_schema?.properties ?? {};
  const required = new Set(def.input_schema?.required ?? []);
  const shape: z.ZodRawShape = {};
  for (const [name, spec] of Object.entries(props)) {
    let field = zodForParam(spec?.type);
    if (spec?.enum?.length) {
      field = z.enum(spec.enum as [string, ...string[]]);
    }
    if (spec?.description) field = field.describe(spec.description);
    if (!required.has(name)) field = field.optional();
    shape[name] = field;
  }
  return z.object(shape);
}

function interpolate(template: string, input: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w]+)\s*\}\}/g, (_m, key: string) => {
    const v = input[key];
    if (v == null) return "";
    return typeof v === "object" ? JSON.stringify(v) : String(v);
  });
}

function pickPath(value: unknown, path: string): unknown {
  if (!path) return value;
  let cur: any = value;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[part];
  }
  return cur;
}

async function runBuiltin(
  def: ToolDef,
  input: Record<string, unknown>,
  deps: ToolDeps,
): Promise<unknown> {
  const builtin = String(def.config?.builtin ?? def.name);
  if (builtin === "current_time") {
    const now = new Date();
    return {
      iso: now.toISOString(),
      local: now.toLocaleString("zh-CN", { hour12: false }),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      unix_ms: now.getTime(),
    };
  }
  if (builtin === "knowledge_search") {
    const query = String(input.query ?? "").trim();
    if (!query) throw new Error("query is required");
    const { embeddingDimension } = openaiConfig();
    const topK = Math.min(10, Math.max(1, Number(input.top_k) || 3));
    const vec = await embedQuery(query);
    const hits = await deps.vector.query({
      indexName: VECTOR_INDEX,
      queryVector: vec,
      topK,
    });
    return {
      query,
      dimension: embeddingDimension,
      count: hits.length,
      results: hits.map((h) => {
        const meta = (h.metadata ?? {}) as Record<string, unknown>;
        return {
          score: (h as { score?: number }).score,
          document_id: String(meta.document_id ?? ""),
          filename: String(meta.filename ?? ""),
          snippet: String(meta.content ?? "").slice(0, 600),
        };
      }),
    };
  }
  throw new Error(`unknown builtin tool: ${builtin}`);
}

async function runHTTP(
  def: ToolDef,
  input: Record<string, unknown>,
): Promise<unknown> {
  const cfg = def.config ?? {};
  const method = String(cfg.method || "GET").toUpperCase();
  const rawURL = String(cfg.url || "");
  if (!rawURL) throw new Error("tool url is not configured");
  const finalURL = interpolate(rawURL, input);
  if (!/^https?:\/\//i.test(finalURL)) {
    throw new Error("tool url must be http/https");
  }

  const headers: Record<string, string> = {};
  const cfgHeaders = cfg.headers;
  if (cfgHeaders && typeof cfgHeaders === "object") {
    for (const [k, v] of Object.entries(cfgHeaders as Record<string, unknown>)) {
      headers[k] = interpolate(String(v ?? ""), input);
    }
  }

  const timeoutMs = Math.min(30_000, Math.max(1_000, Number(cfg.timeout_ms) || 8_000));
  const init: RequestInit = {
    method,
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  };
  if (method !== "GET" && method !== "HEAD") {
    const bodyTemplate = String(cfg.body ?? "");
    if (bodyTemplate) {
      init.body = interpolate(bodyTemplate, input);
      if (!headers["Content-Type"] && !headers["content-type"]) {
        headers["Content-Type"] = "application/json";
      }
    }
  }

  const resp = await fetch(finalURL, init);
  const text = await resp.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep raw text */
  }
  const path = String(cfg.response_path || "");
  const selected = path ? pickPath(parsed, path) : parsed;
  const maxChars = Math.min(20_000, Math.max(200, Number(cfg.max_output_chars) || 4_000));
  const serialized =
    typeof selected === "string" ? selected : JSON.stringify(selected ?? null);
  return {
    status: resp.status,
    ok: resp.ok,
    data:
      serialized && serialized.length > maxChars
        ? serialized.slice(0, maxChars) + "…（已截断）"
        : selected,
  };
}

export async function runTool(
  def: ToolDef,
  input: Record<string, unknown>,
  deps: ToolDeps,
): Promise<unknown> {
  if (def.kind === "builtin") return runBuiltin(def, input, deps);
  return runHTTP(def, input);
}

/** Build the per-request toolset passed to agent.stream({ toolsets }). */
export function buildToolsets(defs: ToolDef[], deps: ToolDeps): Record<string, any> {
  const tools: Record<string, any> = {};
  for (const def of defs) {
    if (!def.name || def.enabled === false) continue;
    // The object key becomes the toolName visible in stream events.
    tools[def.name] = createTool({
      id: def.name,
      description: def.description || def.label || def.name,
      inputSchema: buildInputSchema(def),
      execute: async (input: Record<string, unknown>) => runTool(def, input, deps),
    });
  }
  return tools;
}
